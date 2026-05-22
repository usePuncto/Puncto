/** Plain-text booking confirmation (Evolution / Baileys — no Meta templates). */
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
