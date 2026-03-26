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
    let businessHours = business?.settings?.workingHours || {};
    businessHours = Object.keys(businessHours).length === 0 ? defaultWorkingHours : normalizeWorkingHours(businessHours);

    let workingHours = businessHours;

    // Use professional's working hours when professionalId provided and they have custom hours
    // Professional hours are constrained by business: if business is closed on a day, no slots
    if (professionalId) {
      const proDoc = await db
        .collection('businesses')
        .doc(businessId)
        .collection('professionals')
        .doc(professionalId)
        .get();
      const proData = proDoc.data();
      if (proData?.workingHours && Object.keys(proData.workingHours).length > 0) {
        const proHours = normalizeWorkingHours(proData.workingHours);
        // Intersect: business closed => closed; both open => use pro hours but clip to business window
        const merged: Record<string, { open: string; close: string; closed: boolean }> = {};
        for (const day of Object.keys(defaultWorkingHours)) {
          const b = businessHours[day];
          const p = proHours[day];
          if (b?.closed) {
            merged[day] = { open: b.open, close: b.close, closed: true };
          } else if (p?.closed) {
            merged[day] = { open: b?.open ?? '09:00', close: b?.close ?? '18:00', closed: true };
          } else {
            const toMins = (h: string) => {
              const [hh, mm] = h.split(':').map(Number);
              return (hh || 0) * 60 + (mm || 0);
            };
            const bOpenMins = toMins(b?.open ?? '09:00');
            const bCloseMins = toMins(b?.close ?? '18:00');
            const pOpenMins = toMins(p?.open ?? '09:00');
            const pCloseMins = toMins(p?.close ?? '18:00');
            const effectiveOpen = Math.max(bOpenMins, pOpenMins);
            const effectiveClose = Math.min(bCloseMins, pCloseMins);
            if (effectiveOpen >= effectiveClose) {
              merged[day] = { open: b?.open ?? '09:00', close: b?.close ?? '18:00', closed: true };
            } else {
              merged[day] = {
                open: `${String(Math.floor(effectiveOpen / 60)).padStart(2, '0')}:${String(effectiveOpen % 60).padStart(2, '0')}`,
                close: `${String(Math.floor(effectiveClose / 60)).padStart(2, '0')}:${String(effectiveClose % 60).padStart(2, '0')}`,
                closed: false,
              };
            }
          }
        }
        workingHours = merged;
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

    // Fetch manual unavailability blocks (business + professional)
    type UnavailabilityItem = { date?: string; startTime?: string; endTime?: string; allDay?: boolean };
    const buildBlockDates = (list: UnavailabilityItem[]) =>
      list
        .filter((item) => item.date === date && item.startTime && item.endTime)
        .map((item) => ({
          start: fromZonedTime(
            new Date(
              year,
              month - 1,
              day,
              item.allDay ? 0 : Number((item.startTime as string).split(':')[0]),
              item.allDay ? 0 : Number((item.startTime as string).split(':')[1]),
              0
            ),
            timeZone
          ),
          end: fromZonedTime(
            new Date(
              year,
              month - 1,
              day,
              item.allDay ? 23 : Number((item.endTime as string).split(':')[0]),
              item.allDay ? 59 : Number((item.endTime as string).split(':')[1]),
              0
            ),
            timeZone
          ),
        }));

    const businessUnavailabilityRaw = business?.settings?.unavailability;
    const businessBlocks = Array.isArray(businessUnavailabilityRaw)
      ? buildBlockDates(businessUnavailabilityRaw as UnavailabilityItem[])
      : [];

    let professionalBlocks: Array<{ start: Date; end: Date }> = [];
    if (professionalId) {
      const proDocForBlocks = await db
        .collection('businesses')
        .doc(businessId)
        .collection('professionals')
        .doc(professionalId)
        .get();
      const proUnavailabilityRaw = proDocForBlocks.data()?.unavailability;
      professionalBlocks = Array.isArray(proUnavailabilityRaw)
        ? buildBlockDates(proUnavailabilityRaw as UnavailabilityItem[])
        : [];
    }

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
        blocks: [...businessBlocks, ...professionalBlocks],
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
