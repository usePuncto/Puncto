import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { calculateAvailableSlots } from '@/lib/utils/slots';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability
 * Get available time slots for a given date/service/professional
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const date = searchParams.get('date');
    const professionalId = searchParams.get('professionalId');
    const serviceId = searchParams.get('serviceId');

    if (!businessId || !date) {
      return NextResponse.json(
        { error: 'businessId and date are required' },
        { status: 400 }
      );
    }

    // Fetch business
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const business = businessDoc.data();
    const workingHours = business?.settings?.workingHours || {};
    const targetDate = new Date(date);

    // Fetch service to get duration
    let durationMinutes = 60; // Default
    if (serviceId) {
      const serviceDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('services')
        .doc(serviceId)
        .get();
      if (serviceDoc.exists) {
        durationMinutes = serviceDoc.data()?.durationMinutes || 60;
      }
    }

    // Fetch existing bookings for the date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingsQuery = db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .where('scheduledDateTime', '>=', Timestamp.fromDate(startOfDay))
      .where('scheduledDateTime', '<=', Timestamp.fromDate(endOfDay))
      .where('status', 'in', ['pending', 'confirmed']);

    if (professionalId) {
      bookingsQuery.where('professionalId', '==', professionalId);
    }

    const bookingsSnap = await bookingsQuery.get();

    const existingBookings = bookingsSnap.docs.map((doc) => {
      const data = doc.data();
      const start = data.scheduledDateTime.toDate();
      const end = new Date(start.getTime() + (data.durationMinutes || 60) * 60000);
      return { start, end };
    });

    // Fetch blocks/holidays (if stored in database)
    // For now, we'll just use bookings as blocks

    // Calculate available slots
    const slots = calculateAvailableSlots(
      targetDate,
      workingHours,
      durationMinutes,
      0, // buffer minutes
      {
        professionalId: professionalId ?? undefined,
        serviceId: serviceId ?? undefined,
        existingBookings,
      }
    );

    return NextResponse.json({
      date,
      slots: slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        available: slot.available,
      })),
    });
  } catch (error: any) {
    console.error('[Availability API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate availability', message: error.message },
      { status: 500 }
    );
  }
}
