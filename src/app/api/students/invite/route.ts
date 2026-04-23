import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { createUser } from '@/lib/auth/create-user';
import { sendEmail } from '@/lib/messaging/email';

async function canManageStudents(uid: string, businessId: string) {
  const user = await auth.getUser(uid);
  const claims = user.customClaims as { businessRoles?: Record<string, string>; userType?: string; platformAdmin?: boolean } | undefined;
  if (claims?.userType === 'platform_admin' && claims.platformAdmin === true) return true;
  const role = claims?.businessRoles?.[businessId];
  if (role === 'owner' || role === 'manager') return true;
  const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').doc(uid).get();
  return Boolean((staffSnap.data()?.permissions as Record<string, boolean> | undefined)?.manageBookings);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    const tempPassword = passwordFromBirthDate(customerData?.birthDate);
    if (!tempPassword) {
      return NextResponse.json(
        { error: 'Aluno sem data de nascimento valida. Use formato yyyy-MM-dd.' },
        { status: 400 }
      );
    }
    const created = await createUser({
      email: email.trim().toLowerCase(),
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

    await customerRef.set(
      {
        studentUserId: created.userId,
        studentAccessEnabled: true,
        userId: created.userId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const loginUrl = `${baseUrl}/auth/student/login?subdomain=${encodeURIComponent(businessId)}`;
    const studentName = displayName || `${customerData?.firstName || ''}`.trim() || 'Aluno';

    let emailSent = false;
    try {
      const result = await sendEmail({
        to: email.trim().toLowerCase(),
        toNames: studentName,
        subject: 'Acesso ao portal do aluno — Puncto',
        html: `
          <p>Olá, ${escapeHtml(studentName)}!</p>
          <p>Foi criado o seu acesso ao <strong>portal do aluno</strong> da instituição.</p>
          <p><strong>Senha inicial:</strong> sua data de nascimento no formato <strong>DDMMAAAA</strong> (somente números).<br/>
          Ex.: nascimento em 15/03/2010 → senha <code>15032010</code>.</p>
          <p>Depois do primeiro acesso você pode alterar a senha nas configurações da conta, se disponível.</p>
          <p><a href="${loginUrl}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#171717;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Abrir login do aluno</a></p>
          <p style="font-size:13px;color:#555;">Ou copie o endereço: ${loginUrl}</p>
          <p>— Equipe Puncto</p>
        `,
        text: `Olá, ${studentName}. Acesso ao portal do aluno criado. Senha inicial: data de nascimento em DDMMAAAA (ex.: 15032010). Login: ${loginUrl}`,
      });
      emailSent = Boolean(result.success);
      if (!result.success && result.error) {
        console.warn('[students/invite] Email:', result.error);
      }
    } catch (mailErr) {
      console.warn('[students/invite] Falha ao enviar e-mail:', mailErr);
    }

    return NextResponse.json({
      success: true,
      studentUserId: created.userId,
      temporaryPassword: tempPassword,
      emailSent,
      loginUrl,
    });
  } catch (error: any) {
    console.error('[students/invite] Error:', error);
    return NextResponse.json({ error: error?.message || 'Falha ao criar acesso' }, { status: 500 });
  }
}
