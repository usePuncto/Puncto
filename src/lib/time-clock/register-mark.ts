/**
 * Immutable punch registration (AFD source of truth via ARP repFiscalEvents).
 * - Timestamp from Hora Legal Brasileira (NTP.br / Observatório Nacional)
 * - userId always = authenticated actor (never impersonation)
 * - Never overwrite original mark fields
 * - CPF obrigatório + repPReady
 */

import { db } from '@/lib/firebaseAdmin';
import type { Business } from '@/types/business';
import type { ClockInType } from '@/types/timeClock';
import {
  buildMarkIntegrityPayload,
  assertHlbReadyForMark,
  retentionUntilFrom,
  sha256Hex,
} from './legal-time';
import { appendMarkEvent, getRepPGoLiveAt } from './arp';
import { assertRepPReady } from './rep-employee';
import { resolveRepEstablishment } from './establishment';
import { generatePunchReceipt } from './receipt';
import { calculateOvertime, calculateShiftHours } from './calculations';

export type RegisterMarkInput = {
  business: Business;
  businessId: string;
  /** MUST equal authenticated Firebase uid */
  userId: string;
  type: ClockInType;
  actorUid: string;
  location?: { lat: number; lng: number };
  locationPurpose?: string;
  deviceId?: string;
  ipAddress?: string;
  notes?: string;
  /** Optional client hint only — NEVER used as official mark time */
  clientReportedAt?: string;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function collectorFromDevice(deviceId?: string): { id: string; label: string } {
  const d = (deviceId || 'web').toLowerCase();
  if (d.includes('mobile') || d.includes('app')) {
    return { id: '01', label: 'Aplicativo mobile' };
  }
  if (d.includes('desktop')) {
    return { id: '03', label: 'Aplicativo desktop' };
  }
  return { id: '02', label: 'Navegador (browser)' };
}

async function updateShiftBestEffort(params: {
  businessId: string;
  userId: string;
  type: ClockInType;
  markAt: Date;
  clockInId: string;
}): Promise<string | null> {
  const { businessId, userId, type, markAt, clockInId } = params;
  const shiftsRef = db.collection('businesses').doc(businessId).collection('shifts');

  try {
    const activeSnap = await shiftsRef
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    type ActiveShiftDoc = {
      id: string;
      clockIns?: string[];
      breakStartedAt?: unknown;
      breakDuration?: number;
      startTime?: unknown;
    };

    const active: ActiveShiftDoc | null = activeSnap.empty
      ? null
      : ({ id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() } as ActiveShiftDoc);

    if (type === 'in') {
      if (active) {
        await shiftsRef.doc(active.id).update({
          status: 'completed',
          endTime: markAt,
          updatedAt: markAt,
          closedReason: 'new_in_without_out',
        });
      }
      const created = await shiftsRef.add({
        businessId,
        userId,
        startTime: markAt,
        status: 'active',
        clockIns: [clockInId],
        breakDuration: 0,
        breakStartedAt: null,
        createdAt: markAt,
        updatedAt: markAt,
        managedByApi: true,
      });
      return created.id;
    }

    if (!active) {
      if (type === 'out' || type === 'break_start' || type === 'break_end') {
        const created = await shiftsRef.add({
          businessId,
          userId,
          startTime: markAt,
          endTime: type === 'out' ? markAt : null,
          status: type === 'out' ? 'completed' : 'active',
          clockIns: [clockInId],
          breakDuration: 0,
          breakStartedAt: type === 'break_start' ? markAt : null,
          createdAt: markAt,
          updatedAt: markAt,
          managedByApi: true,
          anomalous: true,
        });
        return created.id;
      }
      return null;
    }

    const currentClockIns = (active.clockIns as string[]) || [];
    const updates: Record<string, unknown> = {
      clockIns: [...currentClockIns, clockInId],
      updatedAt: markAt,
      managedByApi: true,
    };

    if (type === 'break_start') updates.breakStartedAt = markAt;
    if (type === 'break_end') {
      const started = toDate(active.breakStartedAt);
      const extra = started
        ? Math.max(0, Math.round((markAt.getTime() - started.getTime()) / 60000))
        : 0;
      updates.breakDuration = (Number(active.breakDuration) || 0) + extra;
      updates.breakStartedAt = null;
    }
    if (type === 'out') {
      const startTime = toDate(active.startTime) || markAt;
      const draft = {
        id: active.id,
        businessId,
        userId,
        startTime,
        endTime: markAt,
        breakDuration: Number(active.breakDuration) || 0,
        status: 'completed' as const,
        clockIns: [...currentClockIns, clockInId],
        createdAt: startTime,
      };
      updates.endTime = markAt;
      updates.status = 'completed';
      updates.totalHours = calculateShiftHours(draft);
      updates.overtimeHours = calculateOvertime(draft);
      updates.breakStartedAt = null;
    }

    await shiftsRef.doc(active.id).update(updates);
    return active.id;
  } catch (err) {
    console.error('[time-clock] shift UX update failed (AFD mark preserved):', err);
    return null;
  }
}

export async function registerImmutableMark(input: RegisterMarkInput) {
  if (input.userId !== input.actorUid) {
    throw new Error(
      'Marcação REP-P original só pode ser feita pelo próprio trabalhador autenticado'
    );
  }

  const establishment = resolveRepEstablishment(input.business);
  const goLive = await getRepPGoLiveAt(input.businessId, establishment.repEstablishmentId);
  if (!goLive) {
    const err = new Error(
      'REP-P ainda não foi ativado para este estabelecimento (repPGoLiveAt ausente). Defina a data de início oficial antes de registrar marcações fiscais.'
    );
    (err as Error & { code: string }).code = 'REP_P_NOT_LIVE';
    throw err;
  }

  const hlb = await assertHlbReadyForMark();
  if (!hlb.ok) {
    const err = new Error(hlb.message);
    (err as Error & { code: string }).code = hlb.code;
    throw err;
  }

  // AFD tipo 4 NÃO é emitido aqui.
  // Desvio ≥30s ≠ ajuste de relógio. Tipo 4 só via applyLogicalClockAdjust (CPF explícito).
  // PUNCTO_CLOCK_ADJUST_RESPONSIBLE_CPF não é usado (ambiguidade jurídica — ver AFD_TYPE4.md).

  const employee = await assertRepPReady(input.businessId, input.userId);
  if (!employee.employmentRelationshipId) {
    const err = new Error(
      'Vínculo (employmentRelationshipId) ausente — necessário para AEJ com múltiplos contratos no mesmo CPF'
    );
    (err as Error & { code: string }).code = 'VINULO_REQUIRED';
    throw err;
  }

  const legal = hlb.legal;
  const markAt = legal.date;
  const collector = collectorFromDevice(input.deviceId);
  const retentionUntil = retentionUntilFrom(markAt);

  const fiscal = await appendMarkEvent(input.businessId, establishment, input.actorUid, {
    userId: input.userId,
    employeeCpf: employee.cpf!,
    employeeName: employee.name,
    employmentRelationshipId: employee.employmentRelationshipId,
    esocialRegistration: employee.esocialRegistration,
    markAt,
    markType: input.type,
    collectorId: collector.id,
    offline: false,
    location: input.location || null,
    deviceId: input.deviceId || 'web',
    ipAddress: input.ipAddress || null,
    notes: input.notes || null,
    clientReportedAt: input.clientReportedAt || null,
  });

  const integrityPayload = buildMarkIntegrityPayload({
    businessId: input.businessId,
    userId: input.userId,
    type: input.type,
    nsr: fiscal.nsr,
    timestampIso: markAt.toISOString(),
  });

  const clockInsRef = db.collection('businesses').doc(input.businessId).collection('clockIns');
  const docRef = clockInsRef.doc();

  const clockInData = {
    businessId: input.businessId,
    repEstablishmentId: establishment.repEstablishmentId,
    userId: input.userId,
    employmentRelationshipId: employee.employmentRelationshipId,
    type: input.type,
    timestamp: markAt,
    timestampSource: legal.source,
    ntpServer: legal.ntpServer || null,
    ntpOffsetMs: legal.offsetMs,
    hlbTraceability: legal.hlbTraceability,
    nsr: fiscal.nsr,
    fiscalEventId: fiscal.id,
    previousHash: fiscal.previousHash || null,
    afdHash: fiscal.afdHash || null,
    integrityHash: sha256Hex(integrityPayload),
    employeeCpf: employee.cpf,
    employeeName: employee.name,
    esocialRegistration: employee.esocialRegistration || null,
    collectorId: collector.id,
    offline: false,
    immutable: true,
    origin: 'rep_p_original' as const,
    retentionUntil,
    retentionYears: 5,
    location: input.location || null,
    locationPurpose: input.location
      ? input.locationPurpose ||
        'Validação de jornada no momento da marcação (dado pessoal, não sensível)'
      : null,
    deviceId: input.deviceId || 'web',
    ipAddress: input.ipAddress || null,
    clientReportedAt: input.clientReportedAt || null,
    notes: input.notes || null,
    rhReviewed: false,
    rhReviewedBy: null,
    rhReviewedAt: null,
    receiptStatus: 'pending' as const,
    receiptId: null,
    receiptAvailableUntil: null,
    createdAt: markAt,
    createdBy: input.actorUid,
  };

  await docRef.set(clockInData);

  const shiftId = await updateShiftBestEffort({
    businessId: input.businessId,
    userId: input.userId,
    type: input.type,
    markAt,
    clockInId: docRef.id,
  });

  let receiptMeta: Record<string, unknown> = { receiptStatus: 'failed' };
  try {
    const receipt = await generatePunchReceipt({
      businessId: input.businessId,
      businessLegalName: input.business.legalName || input.business.displayName,
      businessTaxId: input.business.taxId || '',
      employeeName: employee.name,
      employeeCpf: employee.cpf!,
      clockInId: docRef.id,
      nsr: fiscal.nsr,
      type: input.type,
      markAt,
      timeSource: legal.source,
      ntpServer: legal.ntpServer,
      integrityHash: fiscal.afdHash || '',
      collectorLabel: collector.label,
    });

    const receiptRef = db
      .collection('businesses')
      .doc(input.businessId)
      .collection('clockReceipts')
      .doc(docRef.id);

    await receiptRef.set({
      clockInId: docRef.id,
      businessId: input.businessId,
      userId: input.userId,
      nsr: fiscal.nsr,
      fileName: receipt.fileName,
      contentType: 'application/pdf',
      pdfBase64: receipt.pdf.toString('base64'),
      sha256: receipt.sha256,
      signatureStatus: receipt.signature.status,
      signatureStandard: receipt.signature.standard,
      signatureReason: receipt.signature.reason || null,
      signerSubject: receipt.signature.signerSubject || null,
      padesEmbedded: receipt.signature.standard === 'PAdES-embedded',
      availableUntil: receipt.availableUntil,
      retentionUntil,
      createdAt: markAt,
    });

    receiptMeta = {
      receiptStatus: 'ready',
      receiptId: receiptRef.id,
      receiptAvailableUntil: receipt.availableUntil,
      receiptSha256: receipt.sha256,
      receiptSignatureStatus: receipt.signature.status,
    };
    await docRef.update(receiptMeta);
  } catch (err) {
    console.error('[time-clock] receipt generation failed:', err);
    await docRef.update({
      receiptStatus: 'failed',
      receiptError: err instanceof Error ? err.message : 'receipt_error',
    });
  }

  return {
    id: docRef.id,
    shiftId,
    ...clockInData,
    ...receiptMeta,
    fiscalEventId: fiscal.id,
    previousHash: fiscal.previousHash,
    integrityHash: clockInData.integrityHash,
    timestamp: markAt.toISOString(),
    createdAt: markAt.toISOString(),
    retentionUntil: retentionUntil.toISOString(),
    legalTime: {
      source: legal.source,
      ntpServer: legal.ntpServer,
      syncedAt: legal.syncedAt,
    },
  };
}
