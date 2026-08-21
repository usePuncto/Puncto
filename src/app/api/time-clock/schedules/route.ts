import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { ShiftSchedule } from '@/types/timeClock';
import {
  authError,
  MANAGER_ROLES,
  requireBusinessAuth,
} from '@/lib/auth/requireBusinessAuth';

// GET - List shift schedules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const schedulesRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('shiftSchedules');
    let query: FirebaseFirestore.Query = schedulesRef.where('active', '==', true).orderBy('startTime', 'asc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();
    const schedules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('[time-clock schedules GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST - Create shift schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, schedule } = body;

    if (!businessId || !schedule) {
      return NextResponse.json(
        { error: 'businessId and schedule are required' },
        { status: 400 }
      );
    }

    const authResult = await requireBusinessAuth(request, businessId, {
      minRoles: MANAGER_ROLES,
    });
    if (authError(authResult)) return authResult.error;


    const schedulesRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('shiftSchedules');

    const scheduleData: Omit<ShiftSchedule, 'id'> = {
      businessId,
      userId: schedule.userId,
      startDate: new Date(schedule.startDate),
      endDate: schedule.endDate ? new Date(schedule.endDate) : undefined,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakDuration: schedule.breakDuration || 0,
      locationId: schedule.locationId,
      active: schedule.active !== undefined ? schedule.active : true,
      createdAt: new Date(),
    };

    const docRef = await schedulesRef.add(scheduleData);

    return NextResponse.json({
      id: docRef.id,
      ...scheduleData,
    });
  } catch (error) {
    console.error('[time-clock schedule POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
