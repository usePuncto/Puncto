/**
 * POST /api/auth/sync-session
 * After client Firebase login: sync Auth custom claims from Firestore if needed,
 * mint shared __session cookie (Domain=.puncto.com.br), set business slug cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import {
  SESSION_COOKIE_NAME,
  BUSINESS_SLUG_COOKIE,
  authCookieBaseOptions,
} from '@/lib/auth/session-cookie';
import type { CustomClaims, UserType } from '@/types/user';

const SESSION_MAX_AGE = 60 * 60 * 24 * 5;

function looksLikeDocId(value: string): boolean {
  return /^[a-zA-Z0-9]{19,21}$/.test(value);
}

async function resolveBusinessSlug(key: string): Promise<{ id: string; slug: string } | null> {
  if (looksLikeDocId(key)) {
    const doc = await db.collection('businesses').doc(key).get();
    if (!doc.exists) return null;
    const data = doc.data() as { slug?: string };
    const slug = (typeof data.slug === 'string' && data.slug.trim()) || key;
    return { id: doc.id, slug };
  }
  const snap = await db.collection('businesses').where('slug', '==', key).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() as { slug?: string };
  const slug = (typeof data.slug === 'string' && data.slug.trim()) || key;
  return { id: doc.id, slug };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;
    const preferredBusinessKey =
      typeof body?.businessId === 'string' ? body.businessId.trim() : '';

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const userRecord = await auth.getUser(uid);
    const existingClaims = (userRecord.customClaims || {}) as Partial<CustomClaims>;

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userData = userSnap.data() as {
      type?: UserType;
      primaryBusinessId?: string;
      customClaims?: Partial<CustomClaims>;
    };

    const firestoreType = userData.type;
    let nextClaims: Partial<CustomClaims> = { ...existingClaims };

    // Sync Auth claims from Firestore when JWT is missing business/platform identity
    if (firestoreType === 'business_user') {
      const rolesFromFs = userData.customClaims?.businessRoles || existingClaims.businessRoles || {};
      const primary =
        userData.primaryBusinessId ||
        userData.customClaims?.primaryBusinessId ||
        existingClaims.primaryBusinessId ||
        Object.keys(rolesFromFs)[0];

      nextClaims = {
        ...nextClaims,
        userType: 'business_user',
        businessRoles: rolesFromFs,
        ...(primary ? { primaryBusinessId: primary } : {}),
        ...(userData.customClaims?.professionalId || existingClaims.professionalId
          ? {
              professionalId:
                userData.customClaims?.professionalId || existingClaims.professionalId,
            }
          : {}),
      };
    } else if (firestoreType === 'platform_admin') {
      nextClaims = {
        ...nextClaims,
        userType: 'platform_admin',
        platformAdmin: true,
        platformRole: userData.customClaims?.platformRole || existingClaims.platformRole || 'analyst',
      };
    } else if (firestoreType && firestoreType !== existingClaims.userType) {
      nextClaims = { ...nextClaims, userType: firestoreType };
    }

    const claimsChanged = JSON.stringify(existingClaims) !== JSON.stringify(nextClaims);
    if (claimsChanged && nextClaims.userType) {
      await auth.setCustomUserClaims(uid, nextClaims);
      await db.collection('users').doc(uid).set(
        {
          customClaims: nextClaims,
          ...(nextClaims.primaryBusinessId
            ? { primaryBusinessId: nextClaims.primaryBusinessId }
            : {}),
        },
        { merge: true }
      );
    }

    // Fresh ID token after claim update (client should also refresh; we mint session from current token
    // only if claims were already present — otherwise require client retry with force refresh).
    let sessionSourceToken = idToken;
    if (claimsChanged) {
      return NextResponse.json({
        ok: false,
        needsTokenRefresh: true,
        message: 'Claims atualizadas — obtenha um novo idToken e chame novamente',
      });
    }

    const sessionCookie = await auth.createSessionCookie(sessionSourceToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const businessKey =
      preferredBusinessKey ||
      nextClaims.primaryBusinessId ||
      (nextClaims.businessRoles ? Object.keys(nextClaims.businessRoles)[0] : '') ||
      '';

    let slug: string | null = null;
    let businessId: string | null = null;
    if (businessKey) {
      const resolved = await resolveBusinessSlug(businessKey);
      slug = resolved?.slug || null;
      businessId = resolved?.id || null;
    }

    const host = request.headers.get('host');
    const response = NextResponse.json({
      ok: true,
      userType: nextClaims.userType || firestoreType || null,
      businessId,
      slug,
      gestaoPath: '/tenant/admin/dashboard',
      gestaoHost: slug ? `${slug}.gestao.puncto.com.br` : null,
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie,
      authCookieBaseOptions(SESSION_MAX_AGE, host)
    );

    if (slug) {
      response.cookies.set(
        BUSINESS_SLUG_COOKIE,
        slug,
        authCookieBaseOptions(60 * 60, host)
      );
    }

    return response;
  } catch (error: unknown) {
    console.error('[Auth sync-session]', error);
    return NextResponse.json({ error: 'Session sync failed' }, { status: 401 });
  }
}
