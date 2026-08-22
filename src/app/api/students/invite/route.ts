import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { createUser } from '@/lib/auth/create-user';
import { sendStudentPasswordResetEmail } from '@/lib/auth/send-access-email';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

function randomPassword(): string {
  return randomBytes(32).toString('base64url');
}

function isCompatibleStudent(
  claims: Record<string, unknown> | undefined,
  businessId: string,
  customerId: string
): boolean {
  if (!claims) return false;
  if (claims.userType !== 'student') return false;
  if (claims.studentBusinessId !== businessId) return false;
  const existingCustomerId = claims.studentCustomerId;
  if (existingCustomerId && existingCustomerId !== customerId) return false;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      businessId?: string;
      customerId?: string;
      email?: string;
      displayName?: string;
    };
    const { businessId, customerId, email, displayName } = body;
    if (!businessId || !customerId || !email) {
      return NextResponse.json(
        { error: 'businessId, customerId e email sao obrigatorios' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
      anyPermission: ['manageBookings'],
    });
    if (authError(authResult)) return authResult.error;

    const industry = (authResult.business as { industry?: string }).industry;
    if (industry !== 'education') {
      return NextResponse.json(
        { error: 'Portal do aluno disponivel apenas para education' },
        { status: 400 }
      );
    }

    const customerRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('customers')
      .doc(customerId);
    const customerSnap = await customerRef.get();
    if (!customerSnap.exists) {
      return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 });
    }

    const customerData = customerSnap.data() as
      | { firstName?: string; studentUserId?: string }
      | undefined;
    const normalizedEmail = email.trim().toLowerCase();
    const tempPassword = randomPassword();
    const studentName =
      displayName || `${customerData?.firstName || ''}`.trim() || 'Aluno';

    let userId: string;
    let isResend = false;

    const existingCustomerUserId = customerData?.studentUserId;

    if (existingCustomerUserId) {
      const existingRecord = await auth.getUser(existingCustomerUserId);
      const claims = (existingRecord.customClaims || {}) as Record<string, unknown>;
      if (!isCompatibleStudent(claims, businessId, customerId)) {
        return NextResponse.json(
          {
            error:
              'Este aluno esta vinculado a uma conta incompativel. Remova o vinculo antes de reenviar.',
          },
          { status: 409 }
        );
      }
      userId = existingCustomerUserId;
      isResend = true;
      await auth.updateUser(userId, { password: tempPassword });
      await auth.setCustomUserClaims(userId, {
        userType: 'student',
        studentBusinessId: businessId,
        studentCustomerId: customerId,
      });
    } else {
      let existingByEmail: Awaited<ReturnType<typeof auth.getUserByEmail>> | null = null;
      try {
        existingByEmail = await auth.getUserByEmail(normalizedEmail);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'auth/user-not-found') throw err;
      }

      if (existingByEmail) {
        const claims = (existingByEmail.customClaims || {}) as Record<string, unknown>;
        if (!isCompatibleStudent(claims, businessId, customerId)) {
          return NextResponse.json(
            {
              error:
                'Este email ja possui uma conta (staff, cliente ou outro perfil). Use outro email para o portal do aluno.',
            },
            { status: 409 }
          );
        }
        userId = existingByEmail.uid;
        isResend = true;
        await auth.updateUser(userId, {
          password: tempPassword,
          displayName: studentName,
        });
        await auth.setCustomUserClaims(userId, {
          userType: 'student',
          studentBusinessId: businessId,
          studentCustomerId: customerId,
        });
      } else {
        const created = await createUser({
          email: normalizedEmail,
          password: tempPassword,
          displayName: studentName,
          userType: 'student',
          customClaims: {
            studentBusinessId: businessId,
            studentCustomerId: customerId,
          },
          additionalData: {
            studentBusinessId: businessId,
            studentCustomerId: customerId,
          },
        });
        userId = created.userId;
      }
    }

    await customerRef.set(
      {
        studentUserId: userId,
        studentAccessEnabled: true,
        userId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
      /\/$/,
      ''
    );
    const loginUrl = `${baseUrl}/auth/student/login?subdomain=${encodeURIComponent(businessId)}`;

    const { resetLink, emailSent } = await sendStudentPasswordResetEmail({
      email: normalizedEmail,
      studentName,
      loginUrl,
    });

    return NextResponse.json({
      success: true,
      studentUserId: userId,
      emailSent,
      loginUrl,
      /** Only returned when email failed so admin can share the link manually */
      resetLink: emailSent ? undefined : resetLink,
      resent: isResend,
    });
  } catch (error: unknown) {
    console.error('[students/invite] Error:', error);
    const message = error instanceof Error ? error.message : 'Falha ao criar acesso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
