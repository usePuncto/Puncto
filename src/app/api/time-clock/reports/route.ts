import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Shift } from '@/types/timeClock';
import { calculateShiftHours, calculateOvertime } from '@/lib/time-clock/calculations';

export const dynamic = 'force-dynamic';

// GET - Generate attendance report
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const month = searchParams.get('month'); // "2024-01"
    const format = searchParams.get('format') || 'json'; // 'json' | 'csv' | 'excel'

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    const shiftsRef = db.collection('businesses').doc(businessId).collection('shifts');
    let query: FirebaseFirestore.Query = shiftsRef.orderBy('startTime', 'desc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Filter by month if provided
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

      query = query
        .where('startTime', '>=', startDate)
        .where('startTime', '<=', endDate);
    }

    const snapshot = await query.get();
    const shifts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Shift[];

    // Calculate statistics
    const report = shifts.map((shift) => {
      const hours = calculateShiftHours(shift);
      const overtime = calculateOvertime(shift);
      return {
        shiftId: shift.id,
        userId: shift.userId,
        date: new Date(shift.startTime as Date).toLocaleDateString('pt-BR'),
        startTime: new Date(shift.startTime as Date).toLocaleTimeString('pt-BR'),
        endTime: shift.endTime
          ? new Date(shift.endTime as Date).toLocaleTimeString('pt-BR')
          : 'Em andamento',
        hours: hours.toFixed(2),
        overtime: overtime.toFixed(2),
        breakDuration: shift.breakDuration || 0,
      };
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Data', 'Início', 'Fim', 'Horas', 'Extras', 'Intervalo'];
      const rows = report.map((r) => [
        r.date,
        r.startTime,
        r.endTime,
        r.hours,
        r.overtime,
        r.breakDuration.toString(),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="relatorio-ponto-${month || 'all'}.csv"`,
        },
      });
    }

    return NextResponse.json({
      month: month || 'all',
      userId: userId || 'all',
      totalShifts: shifts.length,
      totalHours: report.reduce((sum, r) => sum + parseFloat(r.hours), 0).toFixed(2),
      totalOvertime: report.reduce((sum, r) => sum + parseFloat(r.overtime), 0).toFixed(2),
      report,
    });
  } catch (error) {
    console.error('[time-clock reports GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
