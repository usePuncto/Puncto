export interface BookingConfirmationEmailData {
  customerName: string;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
}

export function bookingConfirmationEmail(data: BookingConfirmationEmailData) {
  return {
    subject: `Agendamento confirmado - ${data.serviceName}`,
    html: `
      <p>Olá, ${data.customerName}!</p>
      <p>Seu agendamento foi confirmado:</p>
      <ul>
        <li><strong>Serviço:</strong> ${data.serviceName}</li>
        <li><strong>Profissional:</strong> ${data.professionalName}</li>
        <li><strong>Data:</strong> ${data.date}</li>
        <li><strong>Horário:</strong> ${data.time}</li>
        ${data.businessAddress ? `<li><strong>Endereço:</strong> ${data.businessAddress}</li>` : ''}
        ${data.businessPhone ? `<li><strong>Telefone:</strong> ${data.businessPhone}</li>` : ''}
      </ul>
      <p>${data.businessName}</p>
    `,
    text: `Olá, ${data.customerName}!

Seu agendamento foi confirmado:

Serviço: ${data.serviceName}
Profissional: ${data.professionalName}
Data: ${data.date}
Horário: ${data.time}
${data.businessAddress ? `Endereço: ${data.businessAddress}\n` : ''}${data.businessPhone ? `Telefone: ${data.businessPhone}\n` : ''}
${data.businessName}`,
  };
}
