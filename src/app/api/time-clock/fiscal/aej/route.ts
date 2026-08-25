import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import {
  canManageTimeClock,
  requireTimeClockAuth,
} from '@/lib/time-clock/auth';
import {
  buildAej,
  AEJ_LAYOUT_VERSION,
  clockTypeToAejMark,
  type AejAusencia,
  type AejHorarioContratual,
  type AejMarcacao,
  type AejVinculo,
} from '@/lib/time-clock/aej';
import { getBrazilianLegalTime, retentionUntilFrom } from '@/lib/time-clock/legal-time';
import { signAejCades } from '@/lib/time-clock/signing';
import { onlyDigits } from '@/lib/time-clock/fiscal-utils';

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

/**
 * GET /api/time-clock/fiscal/aej?businessId=&from=&to=
 * AEJ 002 consolidates ARP originals + PTRP treatment.
 * Signed by Puncto (PTRP developer) ICP-Brasil — not employer certificate.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const businessId = sp.get('businessId');
    const from = sp.get('from');
    const to = sp.get('to');

    if (!businessId || !from || !to) {
      return NextResponse.json(
        { error: 'businessId, from and to (YYYY-MM-DD) are required' },
        { status: 400 }
      );
    }

    const authResult = await requireTimeClockAuth(request, businessId);
    if ('error' in authResult) return authResult.error;
    if (!canManageTimeClock(authResult.actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { business } = authResult;
    const periodStart = new Date(`${from}T00:00:00-03:00`);
    const periodEnd = new Date(`${to}T23:59:59-03:00`);
    const legal = await getBrazilianLegalTime();

    const [marksSnap, adjSnap, schedulesSnap, staffSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('clockIns').get(),
      db
        .collection('businesses')
        .doc(businessId)
        .collection('timeClockAdjustments')
        .get(),
      db
        .collection('businesses')
        .doc(businessId)
        .collection('contractualSchedules')
        .get()
        .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] })),
      db.collection('businesses').doc(businessId).collection('staff').get(),
    ]);

    const vinculoByRel = new Map<string, AejVinculo>();
    let nextId = 1;

    const ensureVinculo = (
      relationshipId: string,
      cpf: string,
      nome: string,
      esocial?: string | null
    ) => {
      if (vinculoByRel.has(relationshipId)) return vinculoByRel.get(relationshipId)!;
      const v: AejVinculo = {
        idtVinculoAej: nextId++,
        cpf11: onlyDigits(cpf).slice(-11),
        nome,
        esocialRegistration: esocial || null,
      };
      vinculoByRel.set(relationshipId, v);
      return v;
    };

    for (const doc of staffSnap.docs) {
      const data = doc.data();
      const cpf = onlyDigits(data.cpf || '');
      if (cpf.length === 11) {
        const relId = String(data.employmentRelationshipId || `rel_${doc.id}`);
        ensureVinculo(
          relId,
          cpf,
          data.name || data.displayName || doc.id,
          data.esocialRegistration
        );
      }
    }

    const marcacoes: AejMarcacao[] = [];
    const seqByRelDay = new Map<string, number>();

    for (const doc of marksSnap.docs) {
      const data = doc.data();
      const markAt = toDate(data.timestamp);
      if (!markAt || markAt < periodStart || markAt > periodEnd) continue;
      const cpf = onlyDigits(String(data.employeeCpf || ''));
      if (cpf.length !== 11) continue;
      const userId = String(data.userId);
      const relId = String(
        data.employmentRelationshipId || `rel_${userId}`
      );
      const v = ensureVinculo(
        relId,
        cpf,
        String(data.employeeName || userId),
        data.esocialRegistration
      );
      const day = markAt.toISOString().slice(0, 10);
      const key = `${relId}:${day}`;
      const tp = clockTypeToAejMark(String(data.type));
      let seq = seqByRelDay.get(key) || 0;
      if (tp === 'E' && String(data.type) === 'in') seq += 1;
      if (!seq) seq = 1;
      seqByRelDay.set(key, seq);

      const scheduleCode =
        Array.from(schedulesSnap.docs)
          .map((d) => d.data())
          .find((s) => s.active !== false && (!s.userId || s.userId === userId))?.code ||
        '';

      marcacoes.push({
        idtVinculoAej: v.idtVinculoAej,
        dataHoraMarc: markAt,
        idRepAej: 1,
        tpMarc: tp,
        seqEntSaida: seq,
        fonteMarc: 'O',
        codHorContratual:
          tp === 'E' && String(data.type) === 'in' && seq === 1 ? scheduleCode : undefined,
      });
    }

    // Manual inserts / disregards from PTRP
    for (const doc of adjSnap.docs) {
      const data = doc.data();
      const date = toDate(data.markAt) || toDate(data.date) || toDate(data.createdAt);
      if (!date || date < periodStart || date > periodEnd) continue;
      const userId = String(data.userId);
      const relId = String(data.employmentRelationshipId || `rel_${userId}`);
      const cpf = onlyDigits(String(data.employeeCpf || ''));
      if (!cpf) continue;
      const v = ensureVinculo(relId, cpf, String(data.employeeName || userId));

      if (data.kind === 'manual_insert' && data.markAt) {
        const mt = String(data.markType || 'E');
        const tpMarc: 'E' | 'S' = mt === 'S' || mt === 'out' ? 'S' : 'E';
        marcacoes.push({
          idtVinculoAej: v.idtVinculoAej,
          dataHoraMarc: date,
          idRepAej: 1,
          tpMarc,
          seqEntSaida: 1,
          fonteMarc: 'I',
          motivo: String(data.reason || data.notes || 'Inclusão manual PTRP'),
        });
      } else if (data.kind === 'disregard' || data.tpMarc === 'D') {
        marcacoes.push({
          idtVinculoAej: v.idtVinculoAej,
          dataHoraMarc: date,
          idRepAej: 1,
          tpMarc: 'D',
          seqEntSaida: 1,
          fonteMarc: 'O',
          motivo: String(data.reason || data.notes || 'Desconsideração'),
        });
      }
    }

    const horarios: AejHorarioContratual[] = [];
    const seenCodes = new Set<string>();
    for (const doc of schedulesSnap.docs) {
      const s = doc.data();
      if (s.active === false) continue;
      const code = String(s.code || doc.id);
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);
      const pairs = (s.pairs as Array<{ entrada: string; saida: string }>) || [];
      if (!pairs.length && s.startTime && s.endTime) {
        pairs.push({ entrada: String(s.startTime), saida: String(s.endTime) });
      }
      if (!pairs.length) continue;
      horarios.push({
        codHorContratual: code,
        durJornadaMinutes: Number(s.durJornadaMinutes || 480),
        pairs,
      });
    }

    // Fallback from legacy shiftSchedules if no contractualSchedules
    if (horarios.length === 0) {
      const legacy = await db
        .collection('businesses')
        .doc(businessId)
        .collection('shiftSchedules')
        .where('active', '==', true)
        .get()
        .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] }));
      for (const doc of legacy.docs) {
        const s = doc.data();
        const code = `LEGACY-${doc.id}`.slice(0, 30);
        if (seenCodes.has(code)) continue;
        seenCodes.add(code);
        horarios.push({
          codHorContratual: code,
          durJornadaMinutes: Math.max(
            1,
            Number(s.breakDuration) >= 0
              ? 480 - Number(s.breakDuration || 0)
              : 480
          ),
          pairs: [
            {
              entrada: String(s.startTime || '08:00'),
              saida: String(s.endTime || '12:00'),
            },
            ...(s.breakDuration
              ? [
                  {
                    entrada: String(s.breakEnd || '13:00'),
                    saida: String(s.endTime || '17:00'),
                  },
                ]
              : []),
          ],
        });
      }
    }

    const ausencias: AejAusencia[] = [];
    for (const doc of adjSnap.docs) {
      const data = doc.data();
      const date = toDate(data.date);
      if (!date || date < periodStart || date > periodEnd) continue;
      const userId = String(data.userId);
      const relId = String(data.employmentRelationshipId || `rel_${userId}`);
      const v = vinculoByRel.get(relId);
      if (!v) continue;
      if (data.kind === 'time_bank') {
        const mins = Number(data.minutes || 0);
        ausencias.push({
          idtVinculoAej: v.idtVinculoAej,
          tipoAusenOuComp: '3',
          data: date,
          qtMinutos: Math.abs(mins),
          tipoMovBH: mins >= 0 ? '1' : '2',
        });
      } else if (data.kind === 'absence') {
        ausencias.push({
          idtVinculoAej: v.idtVinculoAej,
          tipoAusenOuComp: '2',
          data: date,
        });
      } else if (data.kind === 'dsr') {
        ausencias.push({
          idtVinculoAej: v.idtVinculoAej,
          tipoAusenOuComp: '1',
          data: date,
        });
      } else if (data.kind === 'holiday_comp') {
        ausencias.push({
          idtVinculoAej: v.idtVinculoAej,
          tipoAusenOuComp: '4',
          data: date,
        });
      }
    }

    const aej = buildAej({
      employerTaxId: business.taxId || '',
      employerLegalName: business.legalName || business.displayName,
      periodStart,
      periodEnd,
      generatedAt: legal.date,
      vinculos: Array.from(vinculoByRel.values()),
      horarios,
      marcacoes,
      ausencias,
    });

    const signature = signAejCades(aej.content, businessId);
    const retentionUntil = retentionUntilFrom(legal.date);

    const exportRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('fiscalExports')
      .add({
        type: 'AEJ',
        layoutVersion: AEJ_LAYOUT_VERSION,
        fileName: aej.fileName,
        periodStart: from,
        periodEnd: to,
        counts: aej.counts,
        sha256File: aej.sha256File,
        signatureStatus: signature.status,
        signatureStandard: signature.standard,
        signatureReason: signature.reason || null,
        signerSubject: signature.signerSubject || null,
        contentLatin1Base64: Buffer.from(aej.content, 'latin1').toString('base64'),
        p7sBase64: signature.p7s ? signature.p7s.toString('base64') : null,
        retentionUntil,
        retentionYears: 5,
        generatedAt: legal.date,
        generatedBy: authResult.actor.uid,
        signedByRole: 'puncto_ptrp_developer',
      });

    const format = sp.get('format') || 'json';
    if (format === 'txt') {
      return new NextResponse(aej.content, {
        headers: {
          'Content-Type': 'text/plain; charset=ISO-8859-1',
          'Content-Disposition': `attachment; filename="${aej.fileName}"`,
          'X-AEJ-SHA256': aej.sha256File,
          'X-AEJ-Layout': AEJ_LAYOUT_VERSION,
          'X-Signature-Status': signature.status,
          'X-Export-Id': exportRef.id,
        },
      });
    }

    if (format === 'p7s') {
      if (!signature.p7s) {
        return NextResponse.json(
          { error: signature.reason || 'Assinatura ICP-Brasil Puncto não disponível' },
          { status: 422 }
        );
      }
      return new NextResponse(new Uint8Array(signature.p7s), {
        headers: {
          'Content-Type': 'application/pkcs7-signature',
          'Content-Disposition': `attachment; filename="${aej.fileName}.p7s"`,
          'X-Export-Id': exportRef.id,
        },
      });
    }

    return NextResponse.json({
      exportId: exportRef.id,
      fileName: aej.fileName,
      layoutVersion: AEJ_LAYOUT_VERSION,
      counts: aej.counts,
      sha256File: aej.sha256File,
      signature: {
        status: signature.status,
        standard: signature.standard,
        reason: signature.reason,
        signerSubject: signature.signerSubject,
        signedBy: 'puncto_ptrp_developer',
      },
      retentionUntil: retentionUntil.toISOString(),
      downloadTxt: `/api/time-clock/fiscal/aej?businessId=${businessId}&from=${from}&to=${to}&format=txt`,
      downloadP7s: `/api/time-clock/fiscal/aej?businessId=${businessId}&from=${from}&to=${to}&format=p7s`,
      contentBase64: Buffer.from(aej.content, 'latin1').toString('base64'),
    });
  } catch (error) {
    console.error('[time-clock AEJ] Error:', error);
    return NextResponse.json({ error: 'Failed to export AEJ' }, { status: 500 });
  }
}
