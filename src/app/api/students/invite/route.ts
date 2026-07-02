import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser } from '@/lib/auth/create-user';
import { sendStudentAccessEmail } from '@/lib/auth/send-access-email';

async function canManageStudents(uid: string, businessId: string) {
  const user = await auth.getUser(uid);
  const claims = user.customClaims as { businessRoles?: Record<string, string>; userType?: string; platformAdmin?: boolean } | undefined;
  if (claims?.userType === 'platform_admin' && claims.platformAdmin === true) return true;
  const role = claims?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') return true;
  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  return Boolean((staffSnap.data()?.permissions as Record<string, boolean> | undefined)?.manageBookings);
}

function passwordFromBirthDate(birthDate?: string): string | null {
  // Expected source format: yyyy-MM-dd
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [yyyy, mm, dd] = birthDate.split('-');
  if (!yyyy || !mm || !dd) return null;
  return `${dd}${mm}${yyyy}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

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

    const allowed = await canManageStudents(uid, businessId);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    const industry = (businessSnap.data() as { industry?: string } | undefined)?.industry;
    if (industry !== 'education') {
      return NextResponse.json({ error: 'Portal do aluno disponivel apenas para education' }, { status: 400 });
    }

    const customerRef = db.collection('businesses').doc(businessId).collection('customers').doc(customerId);
    const customerSnap = await customerRef.get();
    if (!customerSnap.exists) {
      return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 });
    }

    const customerData = customerSnap.data() as { firstName?: string; birthDate?: string } | undefined;
    const normalizedEmail = email.trim().toLowerCase();
    const tempPassword = passwordFromBirthDate(customerData?.birthDate);
    if (!tempPassword) {
      return NextResponse.json(
        { error: 'Aluno sem data de nascimento valida. Use formato yyyy-MM-dd.' },
        { status: 400 }
      );
    }

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
          displayName: displayName || customerData?.firstName || 'Aluno',
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
          displayName: displayName || customerData?.firstName || 'Aluno',
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
    const studentName = displayName || `${customerData?.firstName || ''}`.trim() || 'Aluno';

    const emailSent = await sendStudentAccessEmail({
      email: normalizedEmail,
      studentName,
      loginUrl,
      temporaryPassword: tempPassword,
    });

    return NextResponse.json({
      success: true,
      studentUserId: userId,
      temporaryPassword: tempPassword,
      emailSent,
      loginUrl,
      resent: isResend,
    });
  } catch (error: any) {
    console.error('[students/invite] Error:', error);
    return NextResponse.json({ error: error?.message || 'Falha ao criar acesso' }, { status: 500 });
  }
}
