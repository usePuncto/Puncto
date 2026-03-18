import { NextRequest, NextResponse } from 'next/server';
import { fromZonedTime } from 'date-fns-tz/fromZonedTime';
import { formatInTimeZone } from 'date-fns-tz/formatInTimeZone';
import { enUS } from 'date-fns/locale';
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
    const timeZone = business?.settings?.timezone || 'America/Sao_Paulo';
    const defaultWorkingHours: Record<string, { open: string; close: string; closed: boolean }> = {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '09:00', close: '14:00', closed: true },
    };
    const PT_TO_EN: Record<string, string> = {
      segunda: 'monday',
      terca: 'tuesday',
      quarta: 'wednesday',
      quinta: 'thursday',
      sexta: 'friday',
      sabado: 'saturday',
      domingo: 'sunday',
    };
    const normalizeWorkingHours = (wh: Record<string, { open?: string; close?: string; closed?: boolean }>) => {
      const out = { ...defaultWorkingHours };
      for (const [k, v] of Object.entries(wh)) {
        const key = (PT_TO_EN[k.toLowerCase()] || k.toLowerCase()) as keyof typeof defaultWorkingHours;
        if (defaultWorkingHours[key] && v && typeof v === 'object') {
          out[key] = { open: v.open ?? '09:00', close: v.close ?? '18:00', closed: !!v.closed };
        }
      }
      return out;
    };
    let workingHours = business?.settings?.workingHours || {};
    workingHours = Object.keys(workingHours).length === 0 ? defaultWorkingHours : normalizeWorkingHours(workingHours);

    // Use professional's working hours when professionalId provided and they have custom hours
    if (professionalId) {
      const proDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('professionals')
        .doc(professionalId)
        .get();
      const proData = proDoc.data();
      if (proData?.workingHours && Object.keys(proData.workingHours).length > 0) {
        workingHours = normalizeWorkingHours(proData.workingHours);
      }
    }

    // Parse date in business timezone so "2025-03-10" means March 10 in São Paulo, not UTC
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = fromZonedTime(new Date(year, month - 1, day, 12, 0, 0), timeZone);

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

    // Fetch existing bookings for the date (full calendar day in business timezone)
    const startOfDay = fromZonedTime(new Date(year, month - 1, day, 0, 0, 0), timeZone);
    const endOfDay = fromZonedTime(new Date(year, month - 1, day, 23, 59, 59), timeZone);

    // Query by date range only (avoids composite index); filter status/professionalId in memory
    const bookingsSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('bookings')
      .where('scheduledDateTime', '>=', Timestamp.fromDate(startOfDay))
      .where('scheduledDateTime', '<=', Timestamp.fromDate(endOfDay))
      .get();

    const existingBookings = bookingsSnap.docs
      .filter((doc) => {
        const d = doc.data();
        if (!['pending', 'confirmed'].includes(d.status)) return false;
        if (professionalId && d.professionalId !== professionalId) return false;
        return true;
      })
      .map((doc) => {
      const data = doc.data();
      const start = data.scheduledDateTime.toDate();
      const end = new Date(start.getTime() + (data.durationMinutes || 60) * 60000);
      return { start, end };
    });

    // Fetch blocks/holidays (if stored in database)
    // For now, we'll just use bookings as blocks

    // Calculate available slots (use business timezone so 09:00-18:00 means 9am-6pm local)
    const slots = calculateAvailableSlots(
      targetDate,
      workingHours,
      durationMinutes,
      0, // buffer minutes
      {
        professionalId: professionalId ?? undefined,
        serviceId: serviceId ?? undefined,
        existingBookings,
        timeZone,
      }
    );

    // Debug: log to server console when slots are empty (remove after fixing)
    const availableCount = slots.filter((s) => s.available).length;
    if (slots.length === 0 || availableCount === 0) {
      const dayKey = formatInTimeZone(targetDate, timeZone, 'EEEE', { locale: enUS }).toLowerCase();
      const daySchedule = workingHours[dayKey as keyof typeof workingHours];
      console.log('[Availability] No slots:', {
        businessId,
        date,
        timeZone,
        dayKey,
        daySchedule: daySchedule ? { open: daySchedule.open, close: daySchedule.close, closed: daySchedule.closed } : 'MISSING',
        workingHoursKeys: Object.keys(workingHours),
        slotsTotal: slots.length,
        availableCount,
      });
    }

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
