/**
 * Immutable punch registration (AFD source of truth).
 * - Timestamp from Hora Legal Brasileira (NTP.br / Observatório Nacional)
 * - Never reject by time-of-day or require manager unlock for overtime
 * - Never overwrite original mark fields
 */

import { db } from '@/lib/firebaseAdmin';
import type { Business } from '@/types/business';
import type { ClockInType } from '@/types/timeClock';
import {
  buildMarkIntegrityPayload,
  getBrazilianLegalTime,
  retentionUntilFrom,
  sha256Hex,
} from './legal-time';
import { computeMarkHash } from './afd';
import { formatAfdDateTime, onlyDigits, padLeft } from './fiscal-utils';
import { generatePunchReceipt } from './receipt';
import { calculateOvertime, calculateShiftHours } from './calculations';

export type RegisterMarkInput = {
  business: Business;
  businessId: string;
  userId: string;
  type: ClockInType;
  actorUid: string;
  location?: { lat: number; lng: number };
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

async function resolveEmployeeIdentity(
  businessId: string,
  userId: string
): Promise<{ name: string; cpf: string }> {
  const [staff, pros] = await Promise.all([
    db.collection('businesses').doc(businessId).collection('staff').doc(userId).get(),
    db
      .collection('businesses')
      .doc(businessId)
      .collection('professionals')
      .where('userId', '==', userId)
      .limit(1)
      .get(),
  ]);

  const staffData = staff.data();
  const proData = pros.empty ? null : pros.docs[0].data();

  return {
    name:
      (proData?.name as string) ||
      (staffData?.name as string) ||
      (staffData?.displayName as string) ||
      userId.slice(0, 8),
    cpf: onlyDigits(
      (staffData?.cpf as string) ||
        (proData?.cpf as string) ||
        (staffData?.document as string) ||
        ''
    ),
  };
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

/**
 * Best-effort shift UX update — failures never block the immutable AFD mark.
 */
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
  const legal = await getBrazilianLegalTime();
  const markAt = legal.date;
  const identity = await resolveEmployeeIdentity(input.businessId, input.userId);
  const collector = collectorFromDevice(input.deviceId);
  const retentionUntil = retentionUntilFrom(markAt);

  const counterRef = db
    .collection('businesses')
    .doc(input.businessId)
    .collection('timeClockMeta')
    .doc('nsr');
  const clockInsRef = db.collection('businesses').doc(input.businessId).collection('clockIns');
  const docRef = clockInsRef.doc();

  const { nsr, afdHash, previousHash, integrityHash, clockInData } = await db.runTransaction(
    async (tx) => {
      const snap = await tx.get(counterRef);
      const lastNsr = snap.exists ? Number(snap.data()?.lastNsr || 0) : 0;
      const prevHash = snap.exists ? String(snap.data()?.lastMarkHash || '') : '';
      const nextNsr = lastNsr + 1;

      const markDh = formatAfdDateTime(markAt);
      const cpf12 = padLeft(identity.cpf || '0', 12);
      const hash = computeMarkHash({
        nsr: nextNsr,
        markDh,
        cpf12,
        recordedDh: markDh,
        collectorId: collector.id,
        offlineFlag: '0',
        previousHash: prevHash,
      });

      const integrityPayload = buildMarkIntegrityPayload({
        businessId: input.businessId,
        userId: input.userId,
        type: input.type,
        nsr: nextNsr,
        timestampIso: markAt.toISOString(),
      });

      const data = {
        businessId: input.businessId,
        userId: input.userId,
        type: input.type,
        timestamp: markAt,
        timestampSource: legal.source,
        ntpServer: legal.ntpServer || null,
        ntpOffsetMs: legal.offsetMs,
        nsr: nextNsr,
        previousHash: prevHash || null,
        afdHash: hash,
        integrityHash: sha256Hex(integrityPayload),
        employeeCpf: identity.cpf || null,
        employeeName: identity.name,
        collectorId: collector.id,
        offline: false,
        immutable: true,
        retentionUntil,
        retentionYears: 5,
        location: input.location || null,
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

      tx.set(docRef, data);
      tx.set(
        counterRef,
        {
          lastNsr: nextNsr,
          lastMarkHash: hash,
          updatedAt: markAt,
        },
        { merge: true }
      );

      return {
        nsr: nextNsr,
        afdHash: hash,
        previousHash: prevHash,
        integrityHash: data.integrityHash,
        clockInData: data,
      };
    }
  );

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
      employeeName: identity.name,
      employeeCpf: identity.cpf || 'Não informado',
      clockInId: docRef.id,
      nsr,
      type: input.type,
      markAt,
      timeSource: legal.source,
      ntpServer: legal.ntpServer,
      integrityHash: afdHash,
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
      nsr,
      fileName: receipt.fileName,
      contentType: 'application/pdf',
      pdfBase64: receipt.pdf.toString('base64'),
      sha256: receipt.sha256,
      signatureStatus: receipt.signature.status,
      signatureStandard: receipt.signature.standard,
      signatureReason: receipt.signature.reason || null,
      signerSubject: receipt.signature.signerSubject || null,
      /** PAdES is embedded in the PDF — no separate .p7s */
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
    previousHash,
    integrityHash,
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
