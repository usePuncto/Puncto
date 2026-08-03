/**
 * Helpers for Portaria 671 AFD/AEJ text files (ISO-8859-1, CR+LF).
 */

export function padRight(value: string, len: number): string {
  const s = (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, len);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

export function padLeft(value: string, len: number, char = '0'): string {
  const s = (value || '').slice(-len);
  return char.repeat(Math.max(0, len - s.length)) + s;
}

export function onlyDigits(value: string | undefined | null): string {
  return (value || '').replace(/\D/g, '');
}

export const CRLF = '\r\n';

/** Trailer line for detached CAdES (.p7s) — Portaria 671 FAQ */
export const DIGITAL_SIGNATURE_TRAILER = padRight('ASSINATURA_DIGITAL_EM_ARQUIVO_P7S', 100);

/**
 * CRC-16/KERMIT (CRC-16/CCITT-TRUE) — required for AFD REP-A/REP-P (Portaria 671).
 * Reference: "123456789" → 0x2189
 */
export function crc16Kermit(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'latin1') : data;
  let crc = 0x0000;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0x8408;
      else crc >>>= 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/** @deprecated alias — use crc16Kermit */
export const crc16Ibm = crc16Kermit;

/**
 * DH field: AAAA-MM-ddThh:mm:00±zzzz in America/Sao_Paulo
 * Seconds fixed to 00 per layout.
 */
export function formatAfdDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  // Brazil standard offset -03:00 (no DST since 2019)
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00-0300`;
}

export function formatAfdDate(date: Date): string {
  return formatAfdDateTime(date).slice(0, 10);
}

export function employerIdTypeAndNumber(taxId: string): { type: '1' | '2'; number: string } {
  const digits = onlyDigits(taxId);
  if (digits.length <= 11) {
    return { type: '2', number: padLeft(digits, 14) };
  }
  return { type: '1', number: padLeft(digits, 14) };
}
