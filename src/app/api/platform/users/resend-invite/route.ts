import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { verifyPlatformAdmin } from '@/lib/auth/verifyPlatformAdmin';
import { getAccountAccessStatus } from '@/lib/auth/user-access';
import { sendProfessionalPasswordResetEmail, sendStudentAccessEmail } from '@/lib/auth/send-access-email';
import { checkIpRateLimit, clientIpFromRequest } from '@/lib/api/ipRateLimit';

function passwordFromBirthDate(birthDate?: string): string | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [yyyy, mm, dd] = birthDate.split('-');
  if (!yyyy || !mm || !dd) return null;
  return `${dd}${mm}${yyyy}`;
}

/**
 * POST /api/platform/users/resend-invite
 * Regenerate and resend access email for professionals or students who never logged in.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = clientIpFromRequest(request);
  const limit = await checkIpRateLimit(`platform-resend-invite:${admin.uid}:${ip}`, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json();
    const userId = body?.userId as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const userRecord = await auth.getUser(userId);
    const claims = userRecord.customClaims || {};
    const userType = claims.userType as string | undefined;
    const accountStatus = getAccountAccessStatus(userRecord);

    if (accountStatus === 'active') {
      return NextResponse.json(
        { error: 'Este usuário já realizou o primeiro acesso. Use "Esqueci minha senha" se precisar redefinir a senha.' },
        { status: 400 }
      );
    }

    if (userType === 'business_user') {
      const { resetLink, emailSent } = await sendProfessionalPasswordResetEmail(
        userRecord.email!,
        userRecord.displayName
      );
      return NextResponse.json({
        success: true,
        message: emailSent
          ? 'Novo link de acesso enviado por e-mail.'
          : 'Link gerado, mas o e-mail não foi enviado. Verifique a configuração do provedor de e-mail.',
        emailSent,
        ...(process.env.NODE_ENV === 'development' && { resetLink }),
      });
    }

    if (userType === 'student') {
      const businessId = claims.studentBusinessId as string | undefined;
      const customerId = claims.studentCustomerId as string | undefined;
      if (!businessId || !customerId) {
        return NextResponse.json({ error: 'Dados do aluno incompletos nos claims do usuário.' }, { status: 400 });
      }

      const customerSnap = await db
        .collection('businesses')
        .doc(businessId)
        .collection('customers')
        .doc(customerId)
        .get();
      if (!customerSnap.exists) {
        return NextResponse.json({ error: 'Cadastro do aluno não encontrado.' }, { status: 404 });
      }

      const customerData = customerSnap.data() as { firstName?: string; birthDate?: string } | undefined;
      const tempPassword = passwordFromBirthDate(customerData?.birthDate);
      if (!tempPassword) {
        return NextResponse.json(
          { error: 'Aluno sem data de nascimento válida para gerar a senha.' },
          { status: 400 }
        );
      }

      await auth.updateUser(userId, { password: tempPassword });

      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      const loginUrl = `${baseUrl}/auth/student/login?subdomain=${encodeURIComponent(businessId)}`;
      const studentName = userRecord.displayName || customerData?.firstName || 'Aluno';

      const emailSent = await sendStudentAccessEmail({
        email: userRecord.email!,
        studentName,
        loginUrl,
        temporaryPassword: tempPassword,
      });

      return NextResponse.json({
        success: true,
        message: emailSent
          ? 'Instruções de acesso reenviadas por e-mail.'
          : 'Senha redefinida, mas o e-mail não foi enviado. Verifique a configuração do provedor de e-mail.',
        emailSent,
        loginUrl,
        temporaryPassword: tempPassword,
      });
    }

    return NextResponse.json(
      { error: 'Reenvio de convite disponível apenas para profissionais e alunos.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[Platform API] Error resending invite:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend invite';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
