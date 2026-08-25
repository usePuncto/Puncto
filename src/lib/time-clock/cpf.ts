/**
 * CPF validation for REP-P employee eligibility (Portaria 671 — CPF replaces PIS).
 */

import { onlyDigits } from './fiscal-utils';

export function isValidCpf(raw: string | null | undefined): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // all same digit

  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Reject empty, null, "0", all-zeros, or invalid check digits */
export function isUsableRepPCpf(raw: string | null | undefined): boolean {
  const cpf = onlyDigits(raw);
  if (!cpf || /^0+$/.test(cpf)) return false;
  return isValidCpf(cpf);
}

export function normalizeCpf11(raw: string | null | undefined): string | null {
  if (!isUsableRepPCpf(raw)) return null;
  return onlyDigits(raw);
}

export function cpf12ForAfd(raw: string): string {
  const cpf = normalizeCpf11(raw);
  if (!cpf) {
    throw new Error('CPF inválido para registro REP-P');
  }
  return cpf.padStart(12, '0');
}
