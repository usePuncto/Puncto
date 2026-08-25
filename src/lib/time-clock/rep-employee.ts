/**
 * REP-P employee eligibility: CPF valid + vínculo completo → repPReady.
 */

import { db } from '@/lib/firebaseAdmin';
import { isUsableRepPCpf, normalizeCpf11 } from './cpf';
import { appendEmployeeChange } from './arp';
import { resolveRepEstablishment } from './establishment';
import type { Business } from '@/types/business';

export type RepPBlocker =
  | 'cpf_ausente'
  | 'cpf_invalido'
  | 'vinculo_incompleto'
  | 'rep_p_desabilitado'
  | 'vinculo_ambiguo';

export type RepPEmployeeStatus = {
  userId: string;
  name: string;
  cpf: string | null;
  /** Internal vínculo id — required when same CPF has multiple contracts */
  employmentRelationshipId: string | null;
  esocialRegistration: string | null;
  repPEnabled: boolean;
  repPReady: boolean;
  blockers: RepPBlocker[];
  staffPath: 'staff' | 'professional' | null;
};

function computeBlockers(data: {
  cpfRaw: string | null;
  name: string | null;
  userId: string;
  repPEnabled: boolean;
}): RepPBlocker[] {
  const blockers: RepPBlocker[] = [];
  const cpf = data.cpfRaw || '';
  if (!cpf.trim()) blockers.push('cpf_ausente');
  else if (!isUsableRepPCpf(cpf)) blockers.push('cpf_invalido');
  if (!data.name?.trim() || !data.userId) blockers.push('vinculo_incompleto');
  if (!data.repPEnabled) blockers.push('rep_p_desabilitado');
  return blockers;
}

export async function resolveRepPEmployee(
  businessId: string,
  userId: string
): Promise<RepPEmployeeStatus> {
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

  const staffData = staff.exists ? staff.data() : null;
  const proData = pros.empty ? null : pros.docs[0].data();

  const name =
    (proData?.name as string) ||
    (staffData?.name as string) ||
    (staffData?.displayName as string) ||
    null;

  const cpfRaw =
    (staffData?.cpf as string) ||
    (proData?.cpf as string) ||
    (staffData?.document as string) ||
    null;

  const esocialRegistration =
    (staffData?.esocialRegistration as string) ||
    (proData?.esocialRegistration as string) ||
    null;

  const employmentRelationshipId =
    (staffData?.employmentRelationshipId as string) ||
    (proData?.employmentRelationshipId as string) ||
    // Default: one vínculo per userId within the business until multi-contract is configured
    (staff.exists || proData ? `rel_${userId}` : null);

  const repPEnabled =
    staffData?.repPEnabled === true ||
    proData?.repPEnabled === true ||
    false;

  const blockers = computeBlockers({
    cpfRaw,
    name,
    userId,
    repPEnabled,
  });

  const readyBlockers = blockers.filter((b) => b !== 'rep_p_desabilitado');
  const repPReady = repPEnabled && readyBlockers.length === 0;

  return {
    userId,
    name: name || userId.slice(0, 8),
    cpf: normalizeCpf11(cpfRaw),
    employmentRelationshipId,
    esocialRegistration,
    repPEnabled,
    repPReady: repPReady && Boolean(normalizeCpf11(cpfRaw)),
    blockers: repPEnabled
      ? readyBlockers
      : blockers.includes('rep_p_desabilitado')
        ? blockers
        : [...blockers, 'rep_p_desabilitado'],
    staffPath: staff.exists ? 'staff' : proData ? 'professional' : null,
  };
}

export async function assertRepPReady(businessId: string, userId: string) {
  const status = await resolveRepPEmployee(businessId, userId);
  if (!status.repPReady || !status.cpf) {
    const reason =
      status.blockers.length > 0
        ? status.blockers.join(', ')
        : 'colaborador não habilitado no REP-P';
    const err = new Error(
      `Colaborador não está apto ao REP-P (${reason}). Cadastre CPF válido e habilite no admin.`
    );
    (err as Error & { code: string; status: RepPEmployeeStatus }).code = 'REP_P_NOT_READY';
    (err as Error & { code: string; status: RepPEmployeeStatus }).status = status;
    throw err;
  }
  return status;
}

/**
 * Enable/update employee for REP-P and emit type-5 ARP event when CPF/name change.
 */
export async function upsertRepPEmployee(params: {
  businessId: string;
  business: Pick<Business, 'taxId' | 'legalName' | 'displayName'>;
  userId: string;
  actorUid: string;
  actorCpf?: string;
  cpf?: string;
  name?: string;
  esocialRegistration?: string | null;
  employmentRelationshipId?: string | null;
  repPEnabled?: boolean;
  operation?: 'I' | 'A' | 'E';
}) {
  const staffRef = db
    .collection('businesses')
    .doc(params.businessId)
    .collection('staff')
    .doc(params.userId);

  const existing = await staffRef.get();
  const prev = existing.data() || {};

  const nextCpf = params.cpf !== undefined ? normalizeCpf11(params.cpf) : normalizeCpf11(prev.cpf);
  const nextName =
    params.name !== undefined
      ? params.name
      : (prev.name as string) || (prev.displayName as string) || '';
  const nextEnabled =
    params.repPEnabled !== undefined ? params.repPEnabled : Boolean(prev.repPEnabled);
  const nextEsocial =
    params.esocialRegistration !== undefined
      ? params.esocialRegistration
      : (prev.esocialRegistration as string) || null;
  const nextRelId =
    params.employmentRelationshipId !== undefined
      ? params.employmentRelationshipId
      : (prev.employmentRelationshipId as string) || `rel_${params.userId}`;

  if (nextEnabled && !nextCpf) {
    throw new Error('Não é possível habilitar REP-P sem CPF válido');
  }

  const blockers = computeBlockers({
    cpfRaw: nextCpf,
    name: nextName,
    userId: params.userId,
    repPEnabled: nextEnabled,
  });
  const repPReady =
    nextEnabled && blockers.filter((b) => b !== 'rep_p_desabilitado').length === 0;

  const patch: Record<string, unknown> = {
    cpf: nextCpf,
    esocialRegistration: nextEsocial,
    employmentRelationshipId: nextRelId,
    repPEnabled: nextEnabled,
    repPReady,
    repPBlockers: blockers.filter((b) => b !== 'rep_p_desabilitado' || !nextEnabled),
    updatedAt: new Date(),
  };
  if (params.name !== undefined) {
    patch.name = params.name;
    patch.displayName = params.name;
  }

  if (existing.exists) {
    await staffRef.set(patch, { merge: true });
  } else {
    await staffRef.set(
      {
        businessId: params.businessId,
        userId: params.userId,
        role: 'professional',
        active: true,
        createdAt: new Date(),
        ...patch,
      },
      { merge: true }
    );
  }

  const op =
    params.operation ||
    (params.repPEnabled === false ? 'E' : existing.exists && prev.cpf ? 'A' : 'I');

  if (nextCpf && nextName) {
    const establishment = resolveRepEstablishment(params.business);
    await appendEmployeeChange(params.businessId, establishment, params.actorUid, {
      operation: op,
      employeeCpf: nextCpf,
      employeeName: nextName,
      responsibleCpf: params.actorCpf || nextCpf,
      userId: params.userId,
      employmentRelationshipId: nextRelId,
      esocialRegistration: nextEsocial,
    });
  }

  return resolveRepPEmployee(params.businessId, params.userId);
}
