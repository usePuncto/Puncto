import { getAuth } from 'firebase-admin/auth';
import { sendEmail } from '@/lib/messaging/email';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendProfessionalPasswordResetEmail(
  email: string,
  displayName?: string
): Promise<{ resetLink: string; emailSent: boolean }> {
  const resetLink = await getAuth().generatePasswordResetLink(email);
  const name = displayName || 'Profissional';

  let emailSent = false;
  try {
    await sendEmail({
      to: email,
      subject: 'Acesso ao Puncto - Defina sua senha',
      html: `
        <p>Olá ${escapeHtml(name)},</p>
        <p>Você foi convidado para acessar a agenda do Puncto. Clique no link abaixo para definir sua senha:</p>
        <p><a href="${resetLink}" style="color:#2563eb;">Definir senha</a></p>
        <p>Ou copie e cole este link no navegador: ${resetLink}</p>
        <p>Se o link expirar, peça ao administrador para reenviar o convite ou use "Esqueci minha senha" na página de login.</p>
        <p>— Equipe Puncto</p>
      `,
    });
    emailSent = true;
  } catch (emailErr) {
    console.warn('[sendProfessionalPasswordResetEmail] Email send failed:', emailErr);
  }

  return { resetLink, emailSent };
}

export async function sendStudentAccessEmail(params: {
  email: string;
  studentName: string;
  loginUrl: string;
  temporaryPassword: string;
}): Promise<boolean> {
  const { email, studentName, loginUrl, temporaryPassword } = params;

  try {
    const result = await sendEmail({
      to: email.trim().toLowerCase(),
      toNames: studentName,
      subject: 'Acesso ao portal do aluno — Puncto',
      html: `
        <p>Olá, ${escapeHtml(studentName)}!</p>
        <p>Seu acesso ao <strong>portal do aluno</strong> está disponível.</p>
        <p><strong>Senha inicial:</strong> sua data de nascimento no formato <strong>DDMMAAAA</strong> (somente números).<br/>
        Ex.: nascimento em 15/03/2010 → senha <code>15032010</code>.</p>
        <p>Depois do primeiro acesso você pode alterar a senha nas configurações da conta, se disponível.</p>
        <p><a href="${loginUrl}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#171717;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Abrir login do aluno</a></p>
        <p style="font-size:13px;color:#555;">Ou copie o endereço: ${loginUrl}</p>
        <p>— Equipe Puncto</p>
      `,
      text: `Olá, ${studentName}. Acesso ao portal do aluno. Senha inicial: ${temporaryPassword} (DDMMAAAA). Login: ${loginUrl}`,
    });
    return Boolean(result.success);
  } catch (mailErr) {
    console.warn('[sendStudentAccessEmail] Email send failed:', mailErr);
    return false;
  }
}
