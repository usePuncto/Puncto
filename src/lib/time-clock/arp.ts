/**
 * ARP — append-only fiscal ledger per ESTABLISHMENT (CNPJ/CPF), not per businessId.
 *
 * Immutability model (honest):
 * - Client SDK: firestore.rules deny all writes to repFiscalEvents.
 * - Application code path: only tx.create() on deterministic IDs (fails if NSR exists).
 * - Firebase Admin SDK / GCP IAM with datastore privileges CAN still update/delete
 *   outside this code path — treat as privileged break-glass, not “cryptographically impossible”.
 *
 * Counter meta docs may use merge:true (not fiscal events). Fiscal events: CREATE only.
 */

import { db } from '@/lib/firebaseAdmin';
import { getBrazilianLegalTime, retentionUntilFrom } from './legal-time';
import { formatAfdDateTime } from './fiscal-utils';
import { computeMarkHash } from './afd';
import { cpf12ForAfd } from './cpf';
import {
  availabilityDocId,
  fiscalEventDocId,
  nsrCounterDocId,
  repPConfigDocId,
  type RepEstablishment,
} from './establishment';

export type RepRecordType = '2' | '4' | '5' | '6' | '7';

export type RepSensitiveEventCode =
  | '01'
  | '02' // retorno de energia (REP-C ou REP-P) — builder ok; NÃO fabricar sem evidência observável
  | '03'
  | '04'
  | '05'
  | '06'
  | '07' // disponibilidade (REP-P)
  | '08'; // indisponibilidade (REP-P)

export type EmployerChangePayload = {
  responsibleCpf: string;
  employerIdType: '1' | '2';
  employerTaxId: string;
  cnoOrCaepf?: string;
  legalName: string;
  serviceLocation?: string;
};

export type ClockAdjustPayload = {
  beforeAt: Date;
  afterAt: Date;
  responsibleCpf: string;
};

export type EmployeeChangePayload = {
  operation: 'I' | 'A' | 'E';
  employeeCpf: string;
  employeeName: string;
  otherId?: string;
  responsibleCpf: string;
  userId?: string;
  employmentRelationshipId?: string | null;
  esocialRegistration?: string | null;
};

export type SensitivePayload = {
  eventCode: RepSensitiveEventCode;
  detail?: string;
};

export type MarkPayload = {
  userId: string;
  employeeCpf: string;
  employeeName: string;
  employmentRelationshipId?: string | null;
  esocialRegistration?: string | null;
  markAt: Date;
  markType: 'in' | 'out' | 'break_start' | 'break_end';
  collectorId: string;
  offline: boolean;
  location?: { lat: number; lng: number } | null;
  deviceId?: string | null;
  ipAddress?: string | null;
  notes?: string | null;
  clientReportedAt?: string | null;
};

type AppendBase = {
  businessId: string;
  establishment: RepEstablishment;
  createdBy: string;
};

export type AppendResult = {
  id: string;
  nsr: number;
  repEstablishmentId: string;
  recordType: RepRecordType;
  recordedAt: Date;
  afdHash?: string;
  previousHash?: string;
};

function counterRef(businessId: string, repEstablishmentId: string) {
  return db
    .collection('businesses')
    .doc(businessId)
    .collection('timeClockMeta')
    .doc(nsrCounterDocId(repEstablishmentId));
}

function eventsCol(businessId: string) {
  return db.collection('businesses').doc(businessId).collection('repFiscalEvents');
}

function availabilityRef(businessId: string, repEstablishmentId: string) {
  return db
    .collection('businesses')
    .doc(businessId)
    .collection('timeClockMeta')
    .doc(availabilityDocId(repEstablishmentId));
}

function configRef(businessId: string, repEstablishmentId: string) {
  return db
    .collection('businesses')
    .doc(businessId)
    .collection('timeClockMeta')
    .doc(repPConfigDocId(repEstablishmentId));
}

export async function getRepPGoLiveAt(
  businessId: string,
  repEstablishmentId: string
): Promise<Date | null> {
  const snap = await configRef(businessId, repEstablishmentId).get();
  if (!snap.exists) return null;
  const v = snap.data()?.repPGoLiveAt;
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function setRepPGoLiveAt(
  businessId: string,
  establishment: RepEstablishment,
  goLiveAt: Date,
  actorUid: string
): Promise<void> {
  await configRef(businessId, establishment.repEstablishmentId).set(
    {
      repEstablishmentId: establishment.repEstablishmentId,
      taxId: establishment.taxId,
      idType: establishment.idType,
      repPGoLiveAt: goLiveAt,
      updatedAt: new Date(),
      updatedBy: actorUid,
    },
    { merge: true }
  );
}

/**
 * CREATE-only fiscal event. Document id is deterministic per establishment+NSR.
 * Uses Firestore transaction.create — fails if that NSR already exists (no UPSERT).
 */
async function appendEvent<T extends Record<string, unknown>>(
  params: AppendBase & {
    recordType: RepRecordType;
    eventKind: string;
    payload: T;
    markHashFields?: {
      markAt: Date;
      employeeCpf: string;
      collectorId: string;
      offline: boolean;
    };
  }
): Promise<AppendResult & { payload: T }> {
  const legal = await getBrazilianLegalTime();
  const recordedAt = legal.date;
  const retentionUntil = retentionUntilFrom(recordedAt);
  const estId = params.establishment.repEstablishmentId;
  const cRef = counterRef(params.businessId, estId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(cRef);
    const lastNsr = snap.exists ? Number(snap.data()?.lastNsr || 0) : 0;
    const prevHash = snap.exists ? String(snap.data()?.lastMarkHash || '') : '';
    const nextNsr = lastNsr + 1;

    const docId = fiscalEventDocId(estId, nextNsr);
    const docRef = eventsCol(params.businessId).doc(docId);

    // Defense: refuse if document already exists (should not happen with sequential NSR)
    const existing = await tx.get(docRef);
    if (existing.exists) {
      throw new Error(
        `ARP CREATE rejeitado: evento fiscal ${docId} já existe (NSR ${nextNsr}). UPSERT proibido.`
      );
    }

    let afdHash: string | undefined;
    let previousHash: string | undefined;

    if (params.recordType === '7' && params.markHashFields) {
      const markDh = formatAfdDateTime(params.markHashFields.markAt);
      const recordedDh = formatAfdDateTime(recordedAt);
      const cpf12 = cpf12ForAfd(params.markHashFields.employeeCpf);
      previousHash = prevHash || '';
      afdHash = computeMarkHash({
        nsr: nextNsr,
        markDh,
        cpf12,
        recordedDh,
        collectorId: params.markHashFields.collectorId,
        offlineFlag: params.markHashFields.offline ? '1' : '0',
        previousHash,
      });
    }

    const data = {
      businessId: params.businessId,
      repEstablishmentId: estId,
      establishmentTaxId: params.establishment.taxId,
      nsr: nextNsr,
      recordType: params.recordType,
      eventKind: params.eventKind,
      recordedAt,
      timestampSource: legal.source,
      ntpServer: legal.ntpServer || null,
      ntpOffsetMs: legal.offsetMs,
      payload: { ...params.payload },
      afdHash: afdHash || null,
      previousHash: previousHash ?? null,
      immutable: true as const,
      appendOnly: true as const,
      createOnly: true as const,
      retentionUntil,
      retentionYears: 5,
      createdAt: recordedAt,
      createdBy: params.createdBy,
    };

    // Firestore Admin: create() fails if doc exists — never set/merge on fiscal events
    tx.create(docRef, data);
    // Meta counter is not a fiscal event — merge allowed
    tx.set(
      cRef,
      {
        repEstablishmentId: estId,
        lastNsr: nextNsr,
        ...(afdHash ? { lastMarkHash: afdHash } : {}),
        updatedAt: recordedAt,
      },
      { merge: true }
    );

    return {
      id: docId,
      nsr: nextNsr,
      repEstablishmentId: estId,
      recordType: params.recordType,
      recordedAt,
      afdHash,
      previousHash,
      payload: params.payload,
    };
  });

  return result;
}

export async function appendEmployerChange(
  businessId: string,
  establishment: RepEstablishment,
  createdBy: string,
  payload: EmployerChangePayload
) {
  return appendEvent({
    businessId,
    establishment,
    createdBy,
    recordType: '2',
    eventKind: 'employer_change',
    payload: {
      ...payload,
      cnoOrCaepf: payload.cnoOrCaepf || '',
      serviceLocation: payload.serviceLocation || '',
    },
  });
}

export async function appendClockAdjust(
  businessId: string,
  establishment: RepEstablishment,
  createdBy: string,
  payload: ClockAdjustPayload
) {
  return appendEvent({
    businessId,
    establishment,
    createdBy,
    recordType: '4',
    eventKind: 'clock_adjust',
    payload,
  });
}

/**
 * Ajuste efetivo do relógio lógico do REP-P → AFD tipo 4.
 * Exige CPF do responsável informado na operação (não lê env automático).
 * Sync NTP periódico NÃO deve chamar isto sem validação jurídica.
 */
export async function applyLogicalClockAdjust(params: {
  businessId: string;
  establishment: RepEstablishment;
  createdBy: string;
  beforeAt: Date;
  afterAt: Date;
  /** CPF de quem responde pela operação — obrigatório e explícito */
  responsibleCpf: string;
}): Promise<AppendResult> {
  const cpf = params.responsibleCpf.replace(/\D/g, '');
  if (cpf.length !== 11) {
    throw new Error('responsibleCpf obrigatório (11 dígitos) para AFD tipo 4');
  }
  // Recusar atribuição silenciosa via env — tipo 4 exige responsável da operação
  if (!params.responsibleCpf.trim()) {
    throw new Error('responsibleCpf não pode ser vazio');
  }
  return appendClockAdjust(params.businessId, params.establishment, params.createdBy, {
    beforeAt: params.beforeAt,
    afterAt: params.afterAt,
    responsibleCpf: cpf,
  });
}

export async function appendEmployeeChange(
  businessId: string,
  establishment: RepEstablishment,
  createdBy: string,
  payload: EmployeeChangePayload
) {
  return appendEvent({
    businessId,
    establishment,
    createdBy,
    recordType: '5',
    eventKind: 'employee_change',
    payload: {
      ...payload,
      otherId: payload.otherId || '',
      employmentRelationshipId: payload.employmentRelationshipId || null,
      esocialRegistration: payload.esocialRegistration || null,
    },
  });
}

export async function appendSensitiveEvent(
  businessId: string,
  establishment: RepEstablishment,
  createdBy: string,
  payload: SensitivePayload
) {
  return appendEvent({
    businessId,
    establishment,
    createdBy,
    recordType: '6',
    eventKind: 'sensitive',
    payload,
  });
}

export async function appendMarkEvent(
  businessId: string,
  establishment: RepEstablishment,
  createdBy: string,
  payload: MarkPayload
) {
  return appendEvent({
    businessId,
    establishment,
    createdBy,
    recordType: '7',
    eventKind: 'mark',
    payload,
    markHashFields: {
      markAt: payload.markAt,
      employeeCpf: payload.employeeCpf,
      collectorId: payload.collectorId,
      offline: payload.offline,
    },
  });
}

/**
 * Record availability transition only on real state change.
 * Prefer calling from independent scheduler (not only HTTP /health).
 */
export async function recordAvailabilityTransition(
  businessId: string,
  establishment: RepEstablishment,
  next: 'AVAILABLE' | 'UNAVAILABLE',
  detail: string,
  createdBy = 'system:health-monitor'
): Promise<AppendResult | null> {
  const aRef = availabilityRef(businessId, establishment.repEstablishmentId);
  const legal = await getBrazilianLegalTime();

  const shouldWrite = await db.runTransaction(async (tx) => {
    const snap = await tx.get(aRef);
    const current = snap.exists ? String(snap.data()?.state || 'UNKNOWN') : 'UNKNOWN';
    if (current === next) return false;
    tx.set(
      aRef,
      {
        repEstablishmentId: establishment.repEstablishmentId,
        state: next,
        detail,
        updatedAt: legal.date,
        previousState: current,
      },
      { merge: true }
    );
    return true;
  });

  if (!shouldWrite) return null;

  return appendSensitiveEvent(businessId, establishment, createdBy, {
    eventCode: next === 'AVAILABLE' ? '07' : '08',
    detail,
  });
}

/**
 * When the monitor detects outage while ARP itself is unreachable, persist an
 * outage marker outside the ARP so that on recovery we can emit type-6 08→07.
 */
export async function recordExternalOutageMarker(
  businessId: string,
  establishment: RepEstablishment,
  detectedAt: Date,
  detail: string
): Promise<void> {
  await db
    .collection('businesses')
    .doc(businessId)
    .collection('repPOutageMarkers')
    .add({
      repEstablishmentId: establishment.repEstablishmentId,
      detectedAt,
      detail,
      reconciled: false,
      createdAt: new Date(),
    });
}

/**
 * Reconcile outage markers after ARP is reachable again.
 *
 * Semântica AFD:
 * - recordedAt / dataHoraGravacao = momento em que o evento É PERSISTIDO na ARP (agora).
 * - NÃO retroagir timestamps para fingir gravação durante a indisponibilidade.
 * - detectedAt do monitor fica só em auditoria operacional (payload.monitorDetectedAt / markers).
 */
export async function reconcileOutageMarkers(
  businessId: string,
  establishment: RepEstablishment
): Promise<number> {
  const snap = await db
    .collection('businesses')
    .doc(businessId)
    .collection('repPOutageMarkers')
    .where('repEstablishmentId', '==', establishment.repEstablishmentId)
    .where('reconciled', '==', false)
    .limit(50)
    .get()
    .catch(() => ({ docs: [] as FirebaseFirestore.QueryDocumentSnapshot[], empty: true }));

  if (snap.empty || !snap.docs.length) return 0;

  const detectedAts = snap.docs
    .map((d) => {
      const v = d.data().detectedAt;
      if (v?.toDate) return v.toDate().toISOString();
      if (v instanceof Date) return v.toISOString();
      return String(v || '');
    })
    .filter(Boolean);

  // Persist 08 then 07 with recordedAt = now (via appendSensitiveEvent → getBrazilianLegalTime)
  await recordAvailabilityTransition(
    businessId,
    establishment,
    'UNAVAILABLE',
    `Indisponibilidade registrada na recuperação da ARP. Detecção operacional (não é dataHoraGravacao AFD): ${detectedAts.join(',')}`,
    'system:outage-reconcile'
  );
  await recordAvailabilityTransition(
    businessId,
    establishment,
    'AVAILABLE',
    'Disponibilidade registrada na recuperação da ARP (dataHoraGravacao = momento da persistência)',
    'system:outage-reconcile'
  );

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      reconciled: true,
      reconciledAt: new Date(),
      afdRecordedWithoutRetroactiveTimestamp: true,
      note: 'AFD tipo 6 usa dataHoraGravacao do momento da persistência, não detectedAt',
    });
  }
  await batch.commit();
  return snap.docs.length;
}

export async function listFiscalEventsInPeriod(
  businessId: string,
  repEstablishmentId: string,
  from: Date,
  to: Date
): Promise<
  Array<{
    id: string;
    nsr: number;
    recordType: RepRecordType;
    recordedAt: Date;
    payload: Record<string, unknown>;
    afdHash?: string | null;
    previousHash?: string | null;
  }>
> {
  const snap = await eventsCol(businessId)
    .where('repEstablishmentId', '==', repEstablishmentId)
    .orderBy('nsr', 'asc')
    .get()
    .catch(async () => {
      // Index may be missing — filter in memory
      const all = await eventsCol(businessId).orderBy('nsr', 'asc').get();
      return {
        docs: all.docs.filter((d) => d.data().repEstablishmentId === repEstablishmentId),
      };
    });

  const out: Array<{
    id: string;
    nsr: number;
    recordType: RepRecordType;
    recordedAt: Date;
    payload: Record<string, unknown>;
    afdHash?: string | null;
    previousHash?: string | null;
  }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const recordedAt =
      data.recordedAt?.toDate?.() ||
      (data.recordedAt instanceof Date ? data.recordedAt : null);
    if (!recordedAt) continue;
    const markAtRaw = (data.payload as { markAt?: { toDate?: () => Date } })?.markAt;
    const markAt = markAtRaw?.toDate?.() || (markAtRaw instanceof Date ? markAtRaw : null);
    const effective = markAt || recordedAt;
    if (effective < from || effective > to) continue;
    out.push({
      id: doc.id,
      nsr: Number(data.nsr),
      recordType: data.recordType as RepRecordType,
      recordedAt,
      payload: (data.payload || {}) as Record<string, unknown>,
      afdHash: data.afdHash,
      previousHash: data.previousHash,
    });
  }
  return out;
}
