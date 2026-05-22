import { db } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/messaging/email';
import { bookingConfirmationEmail } from '@/lib/email/bookingConfirmation';
import { sendWhatsApp } from '@/lib/messaging/whatsapp';
import type { ConfirmationChannel } from '@/types/business';

export type SendBookingConfirmationResult = {
  whatsapp?: { success: boolean; messageId?: string; error?: string; skipped?: string };
  email?: { success: boolean; error?: string; skipped?: string };
};

function scheduledDateFromBooking(booking: Record<string, unknown>): Date {
  const raw = booking.scheduledDateTime;
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate();
  }
  if (raw instanceof Date) return raw;
  return new Date(raw as string | number);
}

export async function sendBookingConfirmation(
  businessId: string,
  bookingId: string
): Promise<SendBookingConfirmationResult> {
  const bookingRef = db.collection('businesses').doc(businessId).collection('bookings').doc(bookingId);
  const [bookingSnap, businessSnap] = await Promise.all([
    bookingRef.get(),
    db.collection('businesses').doc(businessId).get(),
  ]);

  if (!bookingSnap.exists) {
    throw new Error('Booking not found');
  }
  if (!businessSnap.exists) {
    throw new Error('Business not found');
  }

  const booking = bookingSnap.data()!;
  const business = businessSnap.data()!;
  const channels: ConfirmationChannel[] = business.settings?.confirmationChannels ?? ['email'];

  const customerName =
    `${booking.customerData?.firstName || ''} ${booking.customerData?.lastName || ''}`.trim() || 'Cliente';
  const scheduledDate = scheduledDateFromBooking(booking);

  const confirmationData = {
    customerName,
    serviceName: booking.serviceName || 'Serviço',
    professionalName: booking.professionalName || '-',
    date: scheduledDate.toLocaleDateString('pt-BR'),
    time: scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    businessName: business.displayName || 'Estabelecimento',
    businessPhone: business.phone || '',
    businessAddress: business.address
      ? `${business.address.street}, ${business.address.number} - ${business.address.city}`
      : '',
  };

  const result: SendBookingConfirmationResult = {};

  if (channels.includes('whatsapp') && booking.customerData?.phone) {
    const wResult = await sendWhatsApp({
      businessId,
      to: booking.customerData.phone,
      template: 'booking_confirmation',
      templateParams: [
        customerName,
        confirmationData.serviceName,
        confirmationData.professionalName,
        confirmationData.date,
        confirmationData.time,
        confirmationData.businessName,
      ],
    });
    result.whatsapp = wResult.success
      ? { success: true, messageId: wResult.messageId }
      : { success: false, error: wResult.error };
  } else {
    result.whatsapp = {
      success: false,
      skipped: !channels.includes('whatsapp')
        ? 'whatsapp channel disabled'
        : 'customer has no phone',
    };
  }

  if (channels.includes('email') && booking.customerData?.email) {
    const template = bookingConfirmationEmail(confirmationData);
    const emailResult = await sendEmail({
      to: booking.customerData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    result.email = emailResult.success
      ? { success: true }
      : { success: false, error: emailResult.error };
  } else {
    result.email = {
      success: false,
      skipped: !channels.includes('email') ? 'email channel disabled' : 'customer has no email',
    };
  }

  return result;
}
