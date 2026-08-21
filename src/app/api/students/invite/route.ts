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
      return NextResponse.json({ error: 'businessId, customerId e email sao obrigatorios' }, { status: 400 });
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
      anyPermission: ['manageBookings'],
    });
    if (authError(authResult)) return authResult.error;

    const industry = (authResult.business as { industry?: string }).industry;
    if (industry !== 'education') {
      return NextResponse.json({ error: 'Portal do aluno disponivel apenas para education' }, { status: 400 });
    }

    const customerRef = db.collection('businesses').doc(businessId).collection('customers').doc(customerId);
    const customerSnap = await customerRef.get();
    if (!customerSnap.exists) {
      return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 });
    }

    const customerData = customerSnap.data() as { firstName?: string } | undefined;
    const normalizedEmail = email.trim().toLowerCase();
    const tempPassword = randomPassword();
    const studentName = displayName || `${customerData?.firstName || ''}`.trim() || 'Aluno';

    let userId: string;
    let isResend = false;

    const existingCustomerUserId = (customerSnap.data() as { studentUserId?: string } | undefined)?.studentUserId;
    if (existingCustomerUserId) {
      userId = existingCustomerUserId;
      isResend = true;
      await auth.updateUser(userId, { password: tempPassword });
    } else {
      try {
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
      } catch (createErr: unknown) {
        const code = (createErr as { message?: string })?.message || '';
        if (!code.includes('email-already-exists') && !code.includes('already in use')) {
          throw createErr;
        }
        const existingUser = await auth.getUserByEmail(normalizedEmail);
        userId = existingUser.uid;
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

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
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
  } catch (error: any) {
    console.error('[students/invite] Error:', error);
    return NextResponse.json({ error: error?.message || 'Falha ao criar acesso' }, { status: 500 });
  }
}
