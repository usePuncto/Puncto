/**
 * REP-P health probe (shared by HTTP and independent scheduler).
 *
 * IMPORTANT: HTTP /health must NOT be the only path that emits type 6 (07/08).
 * Prefer punctoFunctions scheduled monitor. /health remains a diagnostic endpoint
 * that may optionally reconcile when called with writeTransitions=1 by the scheduler.
 */

import { db, auth } from '@/lib/firebaseAdmin';
import { getBrazilianLegalTime } from './legal-time';
import {
  recordAvailabilityTransition,
  recordExternalOutageMarker,
  reconcileOutageMarkers,
} from './arp';
import { resolveRepEstablishment, type RepEstablishment } from './establishment';
import { REP_P_COMPLIANCE_NOTES } from './compliance-notes';
import type { Business } from '@/types/business';

export type HealthComponent = {
  id: string;
  ok: boolean;
  detail: string;
};

export type HealthReport = {
  available: boolean;
  checkedAt: string;
  components: HealthComponent[];
  definition: string;
  transitionRecorded: boolean;
  internalOperationalTarget: typeof REP_P_COMPLIANCE_NOTES.internalOperationalTarget;
  /** Never claim Portaria fixes a % SLA */
  portaria671AvailabilityNote: string;
};

const DEFINITION =
  'REP-P AVAILABLE somente quando API, ARP Firestore, Firebase Auth, HLB (NTP.br ≤30s) e caminho de batida estão ok. Transições 07/08 só em mudança real de estado, preferencialmente via monitor agendado independente.';

export async function probeRepPComponents(businessId?: string): Promise<{
  available: boolean;
  components: HealthComponent[];
}> {
  const components: HealthComponent[] = [];

  components.push({
    id: 'api',
    ok: true,
    detail: 'Processo da API de ponto respondendo',
  });

  try {
    await db.collection('businesses').limit(1).get();
    if (businessId) {
      await db
        .collection('businesses')
        .doc(businessId)
        .collection('timeClockMeta')
        .limit(1)
        .get();
    }
    components.push({ id: 'arp_storage', ok: true, detail: 'Firestore ARP acessível' });
  } catch (e) {
    components.push({
      id: 'arp_storage',
      ok: false,
      detail: e instanceof Error ? e.message : 'Falha ARP',
    });
  }

  try {
    if (!auth || typeof auth.verifyIdToken !== 'function') {
      throw new Error('Firebase Auth Admin indisponível');
    }
    components.push({
      id: 'auth',
      ok: true,
      detail: 'Firebase Auth Admin disponível',
    });
  } catch (e) {
    components.push({
      id: 'auth',
      ok: false,
      detail: e instanceof Error ? e.message : 'Auth indisponível',
    });
  }

  try {
    const legal = await getBrazilianLegalTime();
    const ok = legal.source === 'ntp_br_on' && legal.within30sLimit;
    components.push({
      id: 'legal_time',
      ok,
      detail: ok
        ? `${legal.hlbTraceability}; skew=${legal.absSkewMs}ms`
        : legal.hlbTraceability,
    });
  } catch (e) {
    components.push({
      id: 'legal_time',
      ok: false,
      detail: e instanceof Error ? e.message : 'HLB indisponível',
    });
  }

  const essentialOk = components.every((c) => c.ok);
  components.push({
    id: 'punch_path',
    ok: essentialOk,
    detail: essentialOk
      ? 'Caminho completo de batida operacional'
      : 'Componentes essenciais falharam',
  });

  return { available: components.every((c) => c.ok), components };
}

/**
 * Apply availability transition for an establishment.
 * If ARP cannot be written while UNAVAILABLE, stores external outage marker for reconcile.
 */
export async function applyAvailabilityProbe(params: {
  businessId: string;
  business: Pick<Business, 'taxId' | 'legalName' | 'displayName'>;
  writeTransitions: boolean;
  createdBy?: string;
}): Promise<HealthReport> {
  const { available, components } = await probeRepPComponents(params.businessId);
  let establishment: RepEstablishment | null = null;
  try {
    establishment = resolveRepEstablishment(params.business);
  } catch {
    /* taxId missing */
  }

  let transitionRecorded = false;

  if (params.writeTransitions && establishment) {
    try {
      if (!available) {
        // Try ARP first; if ARP itself is down, external marker
        const arpOk = components.find((c) => c.id === 'arp_storage')?.ok;
        if (!arpOk) {
          await recordExternalOutageMarker(
            params.businessId,
            establishment,
            new Date(),
            components
              .filter((c) => !c.ok)
              .map((c) => `${c.id}:${c.detail}`)
              .join('; ')
          );
        } else {
          const result = await recordAvailabilityTransition(
            params.businessId,
            establishment,
            'UNAVAILABLE',
            components
              .filter((c) => !c.ok)
              .map((c) => `${c.id}:${c.detail}`)
              .join('; '),
            params.createdBy || 'system:health-monitor'
          );
          transitionRecorded = Boolean(result);
        }
      } else {
        await reconcileOutageMarkers(params.businessId, establishment);
        const result = await recordAvailabilityTransition(
          params.businessId,
          establishment,
          'AVAILABLE',
          'ok',
          params.createdBy || 'system:health-monitor'
        );
        transitionRecorded = Boolean(result);
      }
    } catch (e) {
      console.error('[rep-p health] transition failed', e);
      if (establishment && !available) {
        await recordExternalOutageMarker(
          params.businessId,
          establishment,
          new Date(),
          e instanceof Error ? e.message : 'transition_failed'
        ).catch(() => undefined);
      }
    }
  }

  return {
    available,
    checkedAt: new Date().toISOString(),
    components,
    definition: DEFINITION,
    transitionRecorded,
    internalOperationalTarget: REP_P_COMPLIANCE_NOTES.internalOperationalTarget,
    portaria671AvailabilityNote: REP_P_COMPLIANCE_NOTES.portaria671Availability,
  };
}

/** @deprecated use applyAvailabilityProbe — kept for /health without business */
export async function checkRepPHealth(businessId?: string): Promise<HealthReport> {
  if (!businessId) {
    const { available, components } = await probeRepPComponents();
    return {
      available,
      checkedAt: new Date().toISOString(),
      components,
      definition: DEFINITION,
      transitionRecorded: false,
      internalOperationalTarget: REP_P_COMPLIANCE_NOTES.internalOperationalTarget,
      portaria671AvailabilityNote: REP_P_COMPLIANCE_NOTES.portaria671Availability,
    };
  }
  // Without business document, probe only — no transitions
  const { available, components } = await probeRepPComponents(businessId);
  return {
    available,
    checkedAt: new Date().toISOString(),
    components,
    definition: DEFINITION,
    transitionRecorded: false,
    internalOperationalTarget: REP_P_COMPLIANCE_NOTES.internalOperationalTarget,
    portaria671AvailabilityNote: REP_P_COMPLIANCE_NOTES.portaria671Availability,
  };
}
