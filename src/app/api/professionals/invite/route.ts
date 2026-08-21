import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { createUser } from '@/lib/auth/create-user';
import { sendProfessionalPasswordResetEmail } from '@/lib/auth/send-access-email';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';
import { resolveProfessionalEmailAdmin } from '@/lib/professionals/contact';

/**
 * POST - Invite a professional to get login access
 * Creates Firebase user (or links existing), sets professional claims, sends password reset
 * Requires: businessId, professionalId (from body)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, professionalId } = body;

    if (!businessId || !professionalId) {
      return NextResponse.json(
        { error: 'businessId and professionalId are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;

    const professionalRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('professionals')
      .doc(professionalId);

    const professionalSnap = await professionalRef.get();
    if (!professionalSnap.exists) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
    }

    const professional = professionalSnap.data();
    const email = await resolveProfessionalEmailAdmin(
      db,
      businessId,
      professionalId,
      professional?.email
    );
    const accessRole = professional?.accessRole === 'manager' ? 'manager' : 'professional';
    const fullDashboardPermissions = {
      manageServices: true,
      manageProfessionals: true,
      manageBookings: true,
      viewReports: true,
      manageSettings: true,
      manageLocations: true,
      exportData: true,
    };
    const professionalPermissions = {
      manageServices: false,
      manageProfessionals: false,
      manageBookings: false,
      viewReports: false,
      manageSettings: false,
      manageLocations: false,
      exportData: false,
    };
    const permissions = accessRole === 'manager' ? fullDashboardPermissions : professionalPermissions;
    if (!email) {
      return NextResponse.json(
        { error: 'Professional has no email. Add an email before inviting.' },
        { status: 400 }
      );
    }

    let userId: string;

    try {
      const existingUser = await auth.getUserByEmail(email);
      userId = existingUser.uid;

      // Update existing user's custom claims to add professional role
      const existingClaims = (existingUser.customClaims || {}) as Record<string, unknown>;
      const businessRoles = { ...(existingClaims.businessRoles as Record<string, string> || {}) };
      businessRoles[businessId] = accessRole;

      await auth.setCustomUserClaims(userId, {
        ...existingClaims,
        userType: 'business_user',
        businessRoles,
        primaryBusinessId: businessId,
        professionalId,
      });

      // Update Firestore user document
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        type: 'business_user',
        'customClaims.businessRoles': businessRoles,
        'customClaims.primaryBusinessId': businessId,
        'customClaims.professionalId': professionalId,
        role: accessRole,
        updatedAt: new Date(),
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/user-not-found') throw err;

      // Create new Firebase user
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'; // Must meet Firebase rules
      await createUser({
        email,
        password: tempPassword,
        displayName: professional?.name || email.split('@')[0],
        userType: 'business_user',
        customClaims: {
          businessRoles: { [businessId]: accessRole },
          primaryBusinessId: businessId,
          professionalId,
        },
        additionalData: { role: accessRole },
      });

      const newUser = await auth.getUserByEmail(email);
      userId = newUser.uid;
    }

    // Update Professional document with userId
    await professionalRef.update({
      userId,
      updatedAt: new Date(),
    });

    // Keep staff access in sync with the selected professional role
    await db.collection('businesses').doc(businessId).collection('staff').doc(userId).set(
      {
        businessId,
        userId,
        professionalId,
        role: accessRole,
        permissions,
        active: true,
        invitedAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Send password reset email (lets them set their own password)
    const { resetLink, emailSent } = await sendProfessionalPasswordResetEmail(
      email,
      professional?.name
    );

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Convite enviado. O profissional receberá um e-mail para definir a senha.'
        : 'Conta criada, mas o e-mail não foi enviado. Use "Reenviar convite" ou repasse o link manualmente.',
      emailSent,
      ...(process.env.NODE_ENV === 'development' && { resetLink }),
    });
  } catch (error) {
    console.error('[professionals/invite] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar convite' },
      { status: 500 }
    );
  }
}
