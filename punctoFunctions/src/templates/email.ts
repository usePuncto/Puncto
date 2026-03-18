/**
 * Email message templates
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Booking confirmation email
 */
export function bookingConfirmationEmail(data: {
  customerName: string;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
}): EmailTemplate {
  return {
    subject: `Agendamento confirmado - ${data.serviceName}`,
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
            .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${data.businessName}</h1>
            </div>
            <div class="content">
              <h2>Olá, ${data.customerName}!</h2>
              <p>Seu agendamento foi confirmado com sucesso!</p>
              
              <div class="booking-details">
                <h3>Detalhes do Agendamento</h3>
                <p><strong>Serviço:</strong> ${data.serviceName}</p>
                <p><strong>Profissional:</strong> ${data.professionalName}</p>
                <p><strong>Data:</strong> ${data.date}</p>
                <p><strong>Horário:</strong> ${data.time}</p>
                ${data.businessAddress ? `<p><strong>Endereço:</strong> ${data.businessAddress}</p>` : ''}
                ${data.businessPhone ? `<p><strong>Telefone:</strong> ${data.businessPhone}</p>` : ''}
              </div>
              
              <p>Nos vemos em breve!</p>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Olá, ${data.customerName}!

Seu agendamento foi confirmado:

Serviço: ${data.serviceName}
Profissional: ${data.professionalName}
Data: ${data.date}
Horário: ${data.time}
${data.businessAddress ? `Endereço: ${data.businessAddress}` : ''}
${data.businessPhone ? `Telefone: ${data.businessPhone}` : ''}

Nos vemos em breve!`,
  };
}

/**
 * Booking reminder email
 */
export function bookingReminderEmail(data: {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  hoursUntil: number;
}): EmailTemplate {
  const timeText =
    data.hoursUntil >= 48
      ? 'em 48 horas'
      : data.hoursUntil >= 24
      ? 'em 24 horas'
      : 'em 3 horas';

  return {
    subject: `Lembrete: Agendamento ${timeText}`,
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
            .reminder-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lembrete de Agendamento</h1>
            </div>
            <div class="content">
              <h2>Olá, ${data.customerName}!</h2>
              
              <div class="reminder-box">
                <p><strong>Você tem um agendamento ${timeText}:</strong></p>
                <p>📅 ${data.serviceName}</p>
                <p>🕐 ${data.date} às ${data.time}</p>
              </div>
              
              <p>Por favor, confirme sua presença ou entre em contato conosco para reagendar.</p>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Olá, ${data.customerName}!

Lembrete: Você tem um agendamento ${timeText}:

📅 ${data.serviceName}
🕐 ${data.date} às ${data.time}

Por favor, confirme sua presença ou entre em contato conosco para reagendar.`,
  };
}

/**
 * Booking created email for professionals (staff)
 */
export function bookingCreatedProfessionalEmail(data: {
  professionalName: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
}): EmailTemplate {
  return {
    subject: `Novo agendamento - ${data.serviceName}`,
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
            .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${data.businessName}</h1>
            </div>
            <div class="content">
              <h2>Olá, ${data.professionalName}!</h2>
              <p>Um novo agendamento foi criado com você.</p>

              <div class="booking-details">
                <h3>Detalhes do Agendamento</h3>
                <p><strong>Serviço:</strong> ${data.serviceName}</p>
                <p><strong>Cliente:</strong> ${data.customerName}</p>
                <p><strong>Data:</strong> ${data.date}</p>
                <p><strong>Horário:</strong> ${data.time}</p>
                ${data.businessAddress ? `<p><strong>Endereço:</strong> ${data.businessAddress}</p>` : ''}
                ${data.businessPhone ? `<p><strong>Telefone:</strong> ${data.businessPhone}</p>` : ''}
              </div>

              <p>Obrigado!</p>
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática. Por favor, não responda este e-mail.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Olá, ${data.professionalName}!

Um novo agendamento foi criado com você:

Serviço: ${data.serviceName}
Cliente: ${data.customerName}
Data: ${data.date}
Horário: ${data.time}
${data.businessAddress ? `Endereço: ${data.businessAddress}` : ''}
${data.businessPhone ? `Telefone: ${data.businessPhone}` : ''}

Obrigado!`,
  };
}
