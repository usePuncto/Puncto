import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

type Scope = 'business' | 'professional';

interface UnavailabilityItem {
  id: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  allDay?: boolean;
  reason?: string;
  createdAt: string;
}

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const scope = (searchParams.get('scope') || 'business') as Scope;
    const professionalId = searchParams.get('professionalId');
    const month = searchParams.get('month'); // yyyy-MM

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    if (scope === 'professional' && !professionalId) {
      return NextResponse.json({ error: 'professionalId is required for professional scope' }, { status: 400 });
    }

    let list: UnavailabilityItem[] = [];
    if (scope === 'business') {
      const businessSnap = await db.collection('businesses').doc(businessId).get();
      const raw = businessSnap.data()?.settings?.unavailability;
      list = Array.isArray(raw) ? raw : [];
    } else {
      const proSnap = await db
        .collection('businesses')
        .doc(businessId)
        .collection('professionals')
        .doc(professionalId as string)
        .get();
      const raw = proSnap.data()?.unavailability;
      list = Array.isArray(raw) ? raw : [];
    }

    const filtered = month
      ? list.filter((item) => typeof item.date === 'string' && item.date.startsWith(month))
      : list;

    return NextResponse.json({ items: filtered });
  } catch (error) {
    console.error('[unavailability GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load unavailability' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      scope = 'business',
      professionalId,
      date,
      startTime,
      endTime,
      allDay,
      reason,
    }: {
      businessId?: string;
      scope?: Scope;
      professionalId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      allDay?: boolean;
      reason?: string;
    } = body;

    if (!businessId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'businessId, date, startTime and endTime are required' },
        { status: 400 }
      );
    }

    if (!isValidDate(date) || !isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
    }

    if (!allDay && startTime >= endTime) {
      return NextResponse.json({ error: 'startTime must be before endTime' }, { status: 400 });
    }

    if (scope === 'professional' && !professionalId) {
      return NextResponse.json({ error: 'professionalId is required for professional scope' }, { status: 400 });
    }

    const item: UnavailabilityItem = {
      id: crypto.randomUUID(),
      date,
      startTime,
      endTime,
      allDay: !!allDay,
      createdAt: new Date().toISOString(),
    };
    const trimmedReason = reason?.trim();
    if (trimmedReason) {
      item.reason = trimmedReason;
    }

    if (scope === 'business') {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessSnap = await businessRef.get();
      const settings = businessSnap.data()?.settings || {};
      const list = Array.isArray(settings.unavailability) ? settings.unavailability : [];
      await businessRef.update({
        settings: {
          ...settings,
          unavailability: [...list, item],
        },
        updatedAt: new Date(),
      });
    } else {
      const professionalRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('professionals')
        .doc(professionalId as string);
      const proSnap = await professionalRef.get();
      if (!proSnap.exists) {
        return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
      }
      const list = Array.isArray(proSnap.data()?.unavailability) ? proSnap.data()?.unavailability : [];
      await professionalRef.update({
        unavailability: [...list, item],
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[unavailability POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save unavailability' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      scope = 'business',
      professionalId,
      itemId,
    }: {
      businessId?: string;
      scope?: Scope;
      professionalId?: string;
      itemId?: string;
    } = body;

    if (!businessId || !itemId) {
      return NextResponse.json({ error: 'businessId and itemId are required' }, { status: 400 });
    }

    if (scope === 'professional' && !professionalId) {
      return NextResponse.json({ error: 'professionalId is required for professional scope' }, { status: 400 });
    }

    if (scope === 'business') {
      const businessRef = db.collection('businesses').doc(businessId);
      const businessSnap = await businessRef.get();
      const settings = businessSnap.data()?.settings || {};
      const list = Array.isArray(settings.unavailability) ? settings.unavailability : [];
      await businessRef.update({
        settings: {
          ...settings,
          unavailability: list.filter((item: UnavailabilityItem) => item.id !== itemId),
        },
        updatedAt: new Date(),
      });
    } else {
      const professionalRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('professionals')
        .doc(professionalId as string);
      const proSnap = await professionalRef.get();
      if (!proSnap.exists) {
        return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
      }
      const list = Array.isArray(proSnap.data()?.unavailability) ? proSnap.data()?.unavailability : [];
      await professionalRef.update({
        unavailability: list.filter((item: UnavailabilityItem) => item.id !== itemId),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[unavailability DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to remove unavailability' }, { status: 500 });
  }
}
