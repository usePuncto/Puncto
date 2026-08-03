import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Shift } from '@/types/timeClock';
import { calculateShiftHours, calculateOvertime } from '@/lib/time-clock/calculations';
import {
  canManageTimeClock,
  requireTimeClockAuth,
  resolveStaffNames,
  serializeTimestamp,
} from '@/lib/time-clock/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/reports
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const month = searchParams.get('month'); // "2024-01"
    const format = searchParams.get('format') || 'json';

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const { actor } = authResult;
    if (!canManageTimeClock(actor) && userId && userId !== actor.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filterUserId = !canManageTimeClock(actor) ? actor.uid : userId || undefined;

    const shiftsRef = db.collection('businesses').doc(businessId).collection('shifts');
    let shifts: Shift[] = [];

    try {
      let query: FirebaseFirestore.Query = shiftsRef.orderBy('startTime', 'desc');
      if (filterUserId) query = query.where('userId', '==', filterUserId);

      if (month) {
        const [year, monthNum] = month.split('-');
        const startDate = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
        const endDate = new Date(parseInt(year, 10), parseInt(monthNum, 10), 0, 23, 59, 59);
        query = query.where('startTime', '>=', startDate).where('startTime', '<=', endDate);
      }

      const snapshot = await query.get();
      shifts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Shift[];
    } catch {
      const all = await shiftsRef.orderBy('startTime', 'desc').limit(500).get();
      shifts = all.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Shift)
        .filter((shift) => {
          if (filterUserId && shift.userId !== filterUserId) return false;
          if (!month) return true;
          const start = new Date(shift.startTime as Date);
          const [year, monthNum] = month.split('-');
          return (
            start.getFullYear() === parseInt(year, 10) &&
            start.getMonth() + 1 === parseInt(monthNum, 10)
          );
        });
    }

    const names = await resolveStaffNames(
      businessId,
      shifts.map((s) => s.userId)
    );

    const report = shifts.map((shift) => {
      const hours = calculateShiftHours(shift);
      const overtime = calculateOvertime(shift);
      const start = serializeTimestamp(shift.startTime);
      const end = serializeTimestamp(shift.endTime);
      return {
        shiftId: shift.id,
        userId: shift.userId,
        userName: names[shift.userId]?.name || shift.userId,
        date: start ? new Date(start).toLocaleDateString('pt-BR') : '—',
        startTime: start ? new Date(start).toLocaleTimeString('pt-BR') : '—',
        endTime: end ? new Date(end).toLocaleTimeString('pt-BR') : 'Em andamento',
        hours: hours.toFixed(2),
        overtime: overtime.toFixed(2),
        breakDuration: shift.breakDuration || 0,
        status: shift.status,
      };
    });

    if (format === 'csv') {
      const headers = ['Funcionário', 'Data', 'Início', 'Fim', 'Horas', 'Extras', 'Intervalo (min)', 'Status'];
      const rows = report.map((r) => [
        `"${r.userName.replace(/"/g, '""')}"`,
        r.date,
        r.startTime,
        r.endTime,
        r.hours,
        r.overtime,
        r.breakDuration.toString(),
        r.status,
      ]);
      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="relatorio-ponto-${month || 'all'}.csv"`,
        },
      });
    }

    return NextResponse.json({
      month: month || 'all',
      userId: filterUserId || 'all',
      totalShifts: shifts.length,
      totalHours: report.reduce((sum, r) => sum + parseFloat(r.hours), 0).toFixed(2),
      totalOvertime: report.reduce((sum, r) => sum + parseFloat(r.overtime), 0).toFixed(2),
      report,
    });
  } catch (error) {
    console.error('[time-clock reports GET] Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
