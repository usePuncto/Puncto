import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { generateICS, CalendarEventData } from '@/lib/calendar/ics';
import { Booking } from '@/types/booking';
import { Business } from '@/types/business';
import { verifyCalendarAccess } from '@/lib/calendar/signedAccess';
import { authError, requireBusinessAuth } from '@/lib/auth/requireBusinessAuth';

/**
 * GET /api/bookings/[bookingId]/calendar
 * Download .ics file for a booking.
 * Requires staff Bearer auth OR a signed `sig` query param.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const sig = searchParams.get('sig');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const hasSig = verifyCalendarAccess(businessId, bookingId, sig);
    if (!hasSig) {
      const authResult = await requireBusinessAuth(request, businessId);
      if (authError(authResult)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Fetch booking
    const bookingDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .doc(bookingId)
      .get();

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

    // Fetch business
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const business = { id: businessDoc.id, ...businessDoc.data() } as Business;

    // Prepare event data
    const startDate = booking.scheduledDateTime instanceof Date
      ? booking.scheduledDateTime
      : (booking.scheduledDateTime as any).toDate
      ? (booking.scheduledDateTime as any).toDate()
      : new Date(booking.scheduledDateTime as any);

    const endDate = new Date(startDate.getTime() + booking.durationMinutes * 60 * 1000);

    const eventData: CalendarEventData = {
      title: `${booking.serviceName} - ${business.displayName}`,
      description: `Agendamento com ${booking.professionalName}\n\n${booking.notes || ''}`,
      location: business.address
        ? `${business.address.street}, ${business.address.number} - ${business.address.city}`
        : undefined,
      start: startDate,
      end: endDate,
      organizer: {
        name: business.displayName,
        email: business.email,
      },
      attendees: booking.customerData?.email
        ? [
            {
              name: `${booking.customerData.firstName} ${booking.customerData.lastName}`,
              email: booking.customerData.email,
              rsvp: false,
            },
          ]
        : undefined,
    };

    const icsContent = generateICS(eventData);

    // Return .ics file
    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar;charset=utf-8',
        'Content-Disposition': `attachment; filename="agendamento-${bookingId}.ics"`,
      },
    });
  } catch (error: any) {
    console.error('[Calendar API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file', message: error.message },
      { status: 500 }
    );
  }
}
