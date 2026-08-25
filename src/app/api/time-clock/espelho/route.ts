import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
  resolveStaffNames,
  serializeTimestamp,
} from '@/lib/time-clock/auth';
import { buildEspelhoText, type EspelhoDay, type EspelhoReport } from '@/lib/time-clock/espelho';
import { getBrazilianLegalTime } from '@/lib/time-clock/legal-time';

export const dynamic = 'force-dynamic';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function typeLabel(type: string): string {
  if (type === 'in') return 'Entrada';
  if (type === 'out') return 'Saída';
  if (type === 'break_start') return 'Início intervalo';
  if (type === 'break_end') return 'Fim intervalo';
  return type;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || fwd;
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * GET /api/time-clock/espelho?businessId=&month=YYYY-MM&userId=
 * POST — assinatura eletrônica simples "Li e Aceito" (sem certificado ICP)
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const businessId = sp.get('businessId');
    const month = sp.get('month');
    let userId = sp.get('userId');

    if (!businessId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'businessId and month (YYYY-MM) are required' },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    if (!canManageTimeClock(authResult.actor)) {
      userId = authResult.actor.uid;
    } else if (!userId) {
      return NextResponse.json({ error: 'userId is required for managers' }, { status: 400 });
    }

    const [y, m] = month.split('-').map(Number);
    const periodStart = new Date(Date.UTC(y, m - 1, 1, 3, 0, 0));
    const periodEnd = new Date(Date.UTC(y, m, 0, 26, 59, 59));

    const [marksSnap, adjSnap, signSnap, names] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('clockIns').where('userId', '==', userId).get(),
      db
        .collection('businesses')
        .doc(businessId)
        .collection('timeClockAdjustments')
        .where('userId', '==', userId)
        .get()
        .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] })),
      db
        .collection('businesses')
        .doc(businessId)
        .collection('espelhoSignatures')
        .doc(`${userId}_${month}`)
        .get(),
      resolveStaffNames(businessId, [userId!]),
    ]);

    const dayMap = new Map<string, EspelhoDay>();

    const ensureDay = (isoDate: string): EspelhoDay => {
      if (!dayMap.has(isoDate)) {
        dayMap.set(isoDate, {
          date: isoDate,
          marks: [],
          adjustments: [],
          workedMinutes: 0,
          overtimeMinutes: 0,
        });
      }
      return dayMap.get(isoDate)!;
    };

    for (const doc of marksSnap.docs) {
      const data = doc.data();
      const t = toDate(data.timestamp);
      if (!t || t < periodStart || t > periodEnd) continue;
      const dateKey = t.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const day = ensureDay(dateKey);
      day.marks.push({
        type: typeLabel(String(data.type)),
        time: t.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        nsr: data.nsr != null ? Number(data.nsr) : undefined,
      });
    }

    for (const doc of adjSnap.docs) {
      const data = doc.data();
      const t = toDate(data.date) || toDate(data.createdAt);
      if (!t || t < periodStart || t > periodEnd) continue;
      const dateKey = t.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const day = ensureDay(dateKey);
      day.adjustments.push({
        kind: String(data.kind),
        notes: data.notes as string | undefined,
      });
    }

    for (const day of dayMap.values()) {
      const ins = day.marks.filter((x) => x.type === 'Entrada').map((x) => x.time);
      const outs = day.marks.filter((x) => x.type === 'Saída').map((x) => x.time);
      if (ins.length && outs.length) {
        const parse = (tm: string) => {
          const [h, mi, s] = tm.split(':').map(Number);
          return h * 60 + mi + Math.floor((s || 0) / 60);
        };
        day.workedMinutes = Math.max(0, parse(outs[outs.length - 1]) - parse(ins[0]));
        day.overtimeMinutes = Math.max(0, day.workedMinutes - 8 * 60);
      }
    }

    const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const worked = days.reduce((s, d) => s + d.workedMinutes, 0);
    const overtime = days.reduce((s, d) => s + d.overtimeMinutes, 0);

    const firstMark = marksSnap.docs[0]?.data();
    const sig = signSnap.exists ? signSnap.data() : null;

    const report: EspelhoReport = {
      businessId,
      businessName: authResult.business.legalName || authResult.business.displayName,
      businessTaxId: authResult.business.taxId || '',
      userId: userId!,
      employeeName: names[userId!]?.name || firstMark?.employeeName || userId!,
      employeeCpf: String(firstMark?.employeeCpf || ''),
      month,
      days,
      totals: {
        workedHours: (worked / 60).toFixed(2),
        overtimeHours: (overtime / 60).toFixed(2),
        daysWorked: days.filter((d) => d.marks.length > 0).length,
      },
      retentionYears: 5,
      employeeSignedAt: sig
        ? serializeTimestamp(sig.acknowledgedAt || sig.signedAt)
        : null,
      employeeSignatureMethod: sig?.method || null,
    };

    const format = sp.get('format') || 'json';
    if (format === 'txt') {
      return new NextResponse(buildEspelhoText(report), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="espelho-${month}-${userId}.txt"`,
        },
      });
    }

    const contests = await db
      .collection('businesses')
      .doc(businessId)
      .collection('espelhoContestacoes')
      .where('userId', '==', userId)
      .where('month', '==', month)
      .get()
      .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));

    return NextResponse.json({
      ...report,
      acknowledgedAt: sig
        ? serializeTimestamp(sig.acknowledgedAt || sig.signedAt)
        : null,
      acknowledgementDoesNotConditionValidity: true,
      acknowledgement: sig
        ? {
            userId: sig.userId,
            acknowledgedAt: serializeTimestamp(sig.acknowledgedAt || sig.signedAt),
            ipAddress: sig.ipAddress || null,
            userAgent: sig.userAgent || null,
            acceptedText: sig.acceptedText || null,
            method: sig.method || null,
            doesNotConditionValidity: true,
          }
        : null,
      /** @deprecated use acknowledgement */
      signatureAudit: sig
        ? {
            userId: sig.userId,
            signedAt: serializeTimestamp(sig.acknowledgedAt || sig.signedAt),
            ipAddress: sig.ipAddress || null,
            userAgent: sig.userAgent || null,
            acceptedText: sig.acceptedText || null,
            method: sig.method || null,
          }
        : null,
      contestacoes: contests.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: serializeTimestamp(d.data().createdAt),
      })),
    });
  } catch (error) {
    console.error('[time-clock espelho GET]', error);
    return NextResponse.json({ error: 'Failed to build espelho' }, { status: 500 });
  }
}

/**
 * POST /api/time-clock/espelho
 * Body: { businessId, month, accepted: true }
 * OR contest: { businessId, month, action: 'contest', message }
 *
 * "Li e Aceito" → acknowledgedAt (audit only — does NOT condition ponto validity / payroll close).
 * Contestação → PTRP queue; never alters ARP originals.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, month, accepted, action, message } = body as {
      businessId?: string;
      month?: string;
      accepted?: boolean;
      action?: 'acknowledge' | 'contest';
      message?: string;
    };

    if (!businessId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'businessId and month (YYYY-MM) are required' },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;

    const legal = await getBrazilianLegalTime();
    const userId = authResult.actor.uid;
    const ipAddress = clientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'contest') {
      const msg = (message || '').trim();
      if (msg.length < 5) {
        return NextResponse.json(
          { error: 'Informe o motivo da contestação (mín. 5 caracteres)' },
          { status: 400 }
        );
      }
      const ref = await db
        .collection('businesses')
        .doc(businessId)
        .collection('espelhoContestacoes')
        .add({
          businessId,
          userId,
          month,
          message: msg,
          status: 'open',
          createdAt: legal.date,
          createdBy: userId,
          doesNotAlterArp: true,
          routedTo: 'ptrp_treatment',
          ipAddress,
          userAgent,
        });

      await db
        .collection('businesses')
        .doc(businessId)
        .collection('timeClockAuditLog')
        .add({
          type: 'espelho_contest',
          contestId: ref.id,
          userId,
          month,
          message: msg,
          actorUid: userId,
          createdAt: legal.date,
        });

      return NextResponse.json({
        ok: true,
        contestId: ref.id,
        message:
          'Contestação registrada para tratamento/RH. Os registros originais da ARP não foram alterados.',
      });
    }

    if (accepted !== true && action !== 'acknowledge') {
      return NextResponse.json(
        { error: 'É necessário confirmar accepted: true (Li e Aceito) ou action: contest' },
        { status: 400 }
      );
    }

    const acceptedText = 'Li e Aceito';

    const ref = db
      .collection('businesses')
      .doc(businessId)
      .collection('espelhoSignatures')
      .doc(`${userId}_${month}`);

    const existing = await ref.get();
    if (existing.exists && (existing.data()?.acknowledgedAt || existing.data()?.signedAt)) {
      return NextResponse.json({
        ok: true,
        alreadyAcknowledged: true,
        acknowledgedAt: serializeTimestamp(
          existing.data()?.acknowledgedAt || existing.data()?.signedAt
        ),
        message: 'Espelho já havia registrado ciência anteriormente.',
        note: 'A ciência não condiciona a validade do ponto nem o fechamento da folha.',
        audit: {
          userId: existing.data()?.userId,
          ipAddress: existing.data()?.ipAddress,
          userAgent: existing.data()?.userAgent,
        },
      });
    }

    await ref.set({
      businessId,
      userId,
      month,
      acknowledgedAt: legal.date,
      /** @deprecated alias — prefer acknowledgedAt */
      signedAt: legal.date,
      signedAtSource: legal.source,
      ntpServer: legal.ntpServer || null,
      method: 'li_e_aceito',
      acceptedText,
      accepted: true,
      ipAddress,
      userAgent,
      retentionYears: 5,
      certificateUsed: false,
      doesNotConditionValidity: true,
      doesNotConditionPayrollClose: true,
    });

    return NextResponse.json({
      ok: true,
      alreadyAcknowledged: false,
      acknowledgedAt: legal.date.toISOString(),
      message: 'Ciência do espelho registrada com "Li e Aceito".',
      note: 'A ciência é auditoria adicional e não condiciona a validade do ponto nem o fechamento da folha.',
      audit: {
        userId,
        acknowledgedAt: legal.date.toISOString(),
        ipAddress,
        userAgent,
        acceptedText,
      },
    });
  } catch (error) {
    console.error('[time-clock espelho POST]', error);
    return NextResponse.json({ error: 'Failed to process espelho action' }, { status: 500 });
  }
}
