/**
 * Fiscal establishment identity for REP-P NSR sequences.
 * Portaria 671: one independent NSR sequence per establishment
 * (CNPJ 14 digits or CPF 11 digits) — NOT per Puncto businessId.
 */

import { onlyDigits, padLeft } from './fiscal-utils';
import type { Business } from '@/types/business';

export type RepEstablishment = {
  /** Explicit fiscal key: CNPJ(14) or CPF(11) digits only */
  repEstablishmentId: string;
  taxId: string;
  idType: '1' | '2';
  legalName: string;
};

/**
 * Resolve the fiscal establishment for REP-P operations.
 * Today a Puncto Business maps 1:1 to its taxId as the establishment.
 * If `repEstablishmentId` is passed (future multi-CNPJ), it must match a registered establishment.
 */
export function resolveRepEstablishment(
  business: Pick<Business, 'taxId' | 'legalName' | 'displayName'>,
  explicitEstablishmentId?: string | null
): RepEstablishment {
  const digits = onlyDigits(explicitEstablishmentId || business.taxId || '');
  if (digits.length === 11) {
    return {
      repEstablishmentId: digits,
      taxId: digits,
      idType: '2',
      legalName: business.legalName || business.displayName || '',
    };
  }
  if (digits.length >= 14) {
    const cnpj = padLeft(digits, 14).slice(-14);
    return {
      repEstablishmentId: cnpj,
      taxId: cnpj,
      idType: '1',
      legalName: business.legalName || business.displayName || '',
    };
  }
  throw new Error(
    'Estabelecimento fiscal inválido: informe CNPJ (14) ou CPF (11) do estabelecimento para o REP-P'
  );
}

export function nsrCounterDocId(repEstablishmentId: string): string {
  return `nsr_${repEstablishmentId}`;
}

export function availabilityDocId(repEstablishmentId: string): string {
  return `availability_${repEstablishmentId}`;
}

export function repPConfigDocId(repEstablishmentId: string): string {
  return `repPConfig_${repEstablishmentId}`;
}

/** Deterministic ARP document id — CREATE-only; collision = duplicate NSR */
export function fiscalEventDocId(repEstablishmentId: string, nsr: number): string {
  return `${repEstablishmentId}_${padLeft(String(nsr), 9)}`;
}
