export function buildBookingConfirmationText(params: {
  customerName: string;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  businessName: string;
}): string {
  const { customerName, serviceName, professionalName, date, time, businessName } = params;
  return `Olá, ${customerName}!

Seu agendamento está confirmado:

📋 ${serviceName}
👤 ${professionalName}
📅 ${date}
🕐 ${time}

${businessName}`;
}

export function buildBookingReminderText(params: {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  hoursUntil: number;
}): string {
  const { customerName, serviceName, date, time, hoursUntil } = params;
  const timeText =
    hoursUntil >= 48 ? 'em 48 horas' : hoursUntil >= 24 ? 'em 24 horas' : 'em 3 horas';

  return `Olá, ${customerName}!

Lembrete: Você tem um agendamento de ${serviceName} ${timeText}.

📅 Data: ${date}
🕐 Horário: ${time}

Por favor, confirme sua presença ou entre em contato conosco para reagendar.

Até breve!`;
}

export function buildBirthdayMessage(params: {
  customerName: string;
  businessName: string;
}): string {
  const { customerName, businessName } = params;
  return `🎉 Feliz Aniversário, ${customerName}!

A ${businessName} deseja um dia especial para você!

Aproveite nosso desconto especial de aniversário!`;
}

export function templateParamsToText(
  template: string,
  templateParams?: string[]
): string | undefined {
  if (template === 'booking_confirmation' && templateParams && templateParams.length >= 6) {
    return buildBookingConfirmationText({
      customerName: templateParams[0],
      serviceName: templateParams[1],
      professionalName: templateParams[2],
      date: templateParams[3],
      time: templateParams[4],
      businessName: templateParams[5],
    });
  }
  return undefined;
}
