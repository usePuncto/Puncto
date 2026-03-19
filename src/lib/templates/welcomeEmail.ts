/**
 * Welcome email template for new users after successful subscription payment
 */

export interface WelcomeEmailData {
  recipientName: string;
  businessName?: string;
}

export function getWelcomeEmailContent(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = data.recipientName || 'Bem-vindo(a)';
  const businessContext = data.businessName
    ? ` Sua conta <strong>${data.businessName}</strong> está ativa.`
    : '';

  return {
    subject: 'Bem-vindo ao Puncto!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .cta { display: inline-block; background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Puncto</h1>
            </div>
            <div class="content">
              <h2>Olá, ${greeting}!</h2>
              <p>Obrigado por se juntar ao Puncto. Seu pagamento foi processado com sucesso.${businessContext}</p>
              
              <p>Agora você pode:</p>
              <ul>
                <li>Configurar seus serviços e profissionais</li>
                <li>Receber agendamentos online</li>
                <li>Gerenciar sua agenda em um só lugar</li>
              </ul>
              
              <p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.puncto.app'}/tenant/admin/dashboard" class="cta">Acessar meu painel</a>
              </p>
              
              <p>Se tiver alguma dúvida, estamos à disposição.</p>
              <p>Equipe Puncto</p>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Olá, ${greeting}!

Obrigado por se juntar ao Puncto. Seu pagamento foi processado com sucesso.${data.businessName ? ` Sua conta ${data.businessName} está ativa.` : ''}

Agora você pode:
- Configurar seus serviços e profissionais
- Receber agendamentos online
- Gerenciar sua agenda em um só lugar

Acesse seu painel: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.puncto.app'}/tenant/admin/dashboard

Se tiver alguma dúvida, estamos à disposição.

Equipe Puncto`,
  };
}
