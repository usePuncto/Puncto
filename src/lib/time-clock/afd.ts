/**
 * AFD (Arquivo Fonte de Dados) — Portaria MTP 671/2021, leiaute versão 004 (REP-P).
 * Positional fixed-width, ISO-8859-1, CRLF. Types 1–5 include CRC-16/KERMIT.
 * Type 7 uses SHA-256 chain. Type 9 trailer. Signature line → detached CAdES .p7s.
 */

import { createHash } from 'crypto';
import {
  CRLF,
  DIGITAL_SIGNATURE_TRAILER,
  crc16Kermit,
  employerIdTypeAndNumber,
  formatAfdDate,
  formatAfdDateTime,
  onlyDigits,
  padLeft,
  padRight,
} from './fiscal-utils';

export const AFD_LAYOUT_VERSION = '004';

export type AfdMarkRow = {
  nsr: number;
  markAt: Date;
  recordedAt: Date;
  employeeCpf: string;
  /** 01 mobile | 02 browser | 03 desktop | 04 device | 05 other */
  collectorId: string;
  offline: boolean;
  hash?: string;
};

export type AfdEmployerChangeRow = {
  nsr: number;
  recordedAt: Date;
  responsibleCpf: string;
  employerTaxId: string;
  cnoOrCaepf?: string;
  legalName: string;
  serviceLocation?: string;
};

export type AfdClockAdjustRow = {
  nsr: number;
  beforeAt: Date;
  afterAt: Date;
  responsibleCpf: string;
};

export type AfdEmployeeChangeRow = {
  nsr: number;
  recordedAt: Date;
  operation: 'I' | 'A' | 'E';
  employeeCpf: string;
  employeeName: string;
  otherId?: string;
  responsibleCpf: string;
};

export type AfdSensitiveRow = {
  nsr: number;
  recordedAt: Date;
  /**
   * AFD tipo 6 — códigos oficiais:
   * 02 retorno de energia (REP-C/REP-P) — suportado no builder; só gravar com evidência.
   * 07 disponibilidade / 08 indisponibilidade (REP-P).
   * Em cloud/serverless NÃO fabricamos 02 automaticamente (sem sensor de energia).
   */
  eventCode: string;
};

export type AfdBuildInput = {
  employerTaxId: string;
  employerLegalName: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  /** INPI registration of REP-P software — 17 numeric */
  inpiId?: string;
  /** Developer CNPJ/CPF */
  manufacturerTaxId?: string;
  model?: string;
  cnoOrCaepf?: string;
  employerChanges?: AfdEmployerChangeRow[];
  clockAdjusts?: AfdClockAdjustRow[];
  employeeChanges?: AfdEmployeeChangeRow[];
  sensitiveEvents?: AfdSensitiveRow[];
  marks: AfdMarkRow[];
  chainSeedHash?: string;
};

const DEFAULT_INPI = padLeft(
  onlyDigits(process.env.PUNCTO_AFD_INPI_ID || process.env.PUNCTO_INPI_ID || '0'),
  17
);
const DEFAULT_MANUFACTURER_TAX = onlyDigits(
  process.env.PUNCTO_VENDOR_CNPJ || process.env.PUNCTO_MANUFACTURER_CNPJ || ''
);
const DEFAULT_MODEL = padRight(process.env.PUNCTO_AFD_MODEL || 'Puncto REP-P', 30);

function appendCrc(lineWithoutCrc: string): string {
  return lineWithoutCrc + crc16Kermit(lineWithoutCrc);
}

/**
 * Hash of type-7 mark per Portaria 671:
 * concat(NSR, tipo, DH marcação, CPF, DH gravação, coletor, online/offline, hash anterior)
 */
export function computeMarkHash(input: {
  nsr: number;
  markDh: string;
  cpf12: string;
  recordedDh: string;
  collectorId: string;
  offlineFlag: '0' | '1';
  previousHash: string;
}): string {
  const payload =
    padLeft(String(input.nsr), 9) +
    '7' +
    input.markDh +
    padLeft(onlyDigits(input.cpf12), 12) +
    input.recordedDh +
    padLeft(input.collectorId, 2) +
    input.offlineFlag +
    (input.previousHash || '');
  return createHash('sha256').update(payload, 'latin1').digest('hex');
}

function buildHeader(input: AfdBuildInput): string {
  const { type, number } = employerIdTypeAndNumber(input.employerTaxId);
  const manufDigits = onlyDigits(input.manufacturerTaxId || DEFAULT_MANUFACTURER_TAX);
  const manufType: '1' | '2' = manufDigits.length <= 11 && manufDigits.length > 0 ? '2' : '1';
  const inpi = padLeft(onlyDigits(input.inpiId || DEFAULT_INPI), 17);

  const body =
    '000000000' +
    '1' +
    type +
    number +
    padLeft(onlyDigits(input.cnoOrCaepf || '0'), 14) +
    padRight(input.employerLegalName, 150) +
    inpi +
    formatAfdDate(input.periodStart) +
    formatAfdDate(input.periodEnd) +
    formatAfdDateTime(input.generatedAt) +
    AFD_LAYOUT_VERSION +
    manufType +
    padLeft(manufDigits || '0', 14) +
    (input.model ? padRight(input.model, 30) : DEFAULT_MODEL);

  if (body.length !== 298) {
    // Defensive: header body must be positions 1–298 before CRC (299–302)
    throw new Error(`AFD header length ${body.length} !== 298`);
  }
  return appendCrc(body);
}

function buildType2(row: AfdEmployerChangeRow): string {
  const { type, number } = employerIdTypeAndNumber(row.employerTaxId);
  const body =
    padLeft(String(row.nsr), 9) +
    '2' +
    formatAfdDateTime(row.recordedAt) +
    padLeft(onlyDigits(row.responsibleCpf), 14) +
    type +
    number +
    padLeft(onlyDigits(row.cnoOrCaepf || '0'), 14) +
    padRight(row.legalName, 150) +
    padRight(row.serviceLocation || '', 100);
  return appendCrc(body);
}

function buildType4(row: AfdClockAdjustRow): string {
  const body =
    padLeft(String(row.nsr), 9) +
    '4' +
    formatAfdDateTime(row.beforeAt) +
    formatAfdDateTime(row.afterAt) +
    padLeft(onlyDigits(row.responsibleCpf), 11);
  return appendCrc(body);
}

function buildType5(row: AfdEmployeeChangeRow): string {
  const body =
    padLeft(String(row.nsr), 9) +
    '5' +
    formatAfdDateTime(row.recordedAt) +
    row.operation +
    padLeft(onlyDigits(row.employeeCpf), 12) +
    padRight(row.employeeName, 52) +
    padRight(row.otherId || '', 4) +
    padLeft(onlyDigits(row.responsibleCpf), 11);
  return appendCrc(body);
}

/** Type 6 — no CRC in official layout */
function buildType6(row: AfdSensitiveRow): string {
  return (
    padLeft(String(row.nsr), 9) +
    '6' +
    formatAfdDateTime(row.recordedAt) +
    padLeft(onlyDigits(row.eventCode), 2)
  );
}

function buildType7(
  mark: AfdMarkRow,
  previousHash: string
): { line: string; hash: string } {
  const markDh = formatAfdDateTime(mark.markAt);
  const recordedDh = formatAfdDateTime(mark.recordedAt);
  const cpf12 = padLeft(onlyDigits(mark.employeeCpf), 12);
  const collectorId = padLeft(mark.collectorId || '02', 2);
  const offlineFlag: '0' | '1' = mark.offline ? '1' : '0';

  const hash =
    mark.hash ||
    computeMarkHash({
      nsr: mark.nsr,
      markDh,
      cpf12,
      recordedDh,
      collectorId,
      offlineFlag,
      previousHash,
    });

  const line =
    padLeft(String(mark.nsr), 9) +
    '7' +
    markDh +
    cpf12 +
    recordedDh +
    collectorId +
    offlineFlag +
    padRight(hash, 64);

  return { line, hash };
}

function buildTrailer(counts: {
  type2: number;
  type3: number;
  type4: number;
  type5: number;
  type6: number;
  type7: number;
}): string {
  return (
    '999999999' +
    padLeft(String(counts.type2), 9) +
    padLeft(String(counts.type3), 9) +
    padLeft(String(counts.type4), 9) +
    padLeft(String(counts.type5), 9) +
    padLeft(String(counts.type6), 9) +
    padLeft(String(counts.type7), 9) +
    '9'
  );
}

export type AfdBuildResult = {
  content: string;
  fileName: string;
  markCount: number;
  lastHash: string;
  sha256File: string;
  layoutVersion: typeof AFD_LAYOUT_VERSION;
  counts: {
    type2: number;
    type3: number;
    type4: number;
    type5: number;
    type6: number;
    type7: number;
  };
};

type OrderedRow =
  | { kind: '2'; nsr: number; row: AfdEmployerChangeRow }
  | { kind: '4'; nsr: number; row: AfdClockAdjustRow }
  | { kind: '5'; nsr: number; row: AfdEmployeeChangeRow }
  | { kind: '6'; nsr: number; row: AfdSensitiveRow }
  | { kind: '7'; nsr: number; row: AfdMarkRow };

export function buildAfd(input: AfdBuildInput): AfdBuildResult {
  const lines: string[] = [buildHeader(input)];
  let previousHash = input.chainSeedHash || '';

  const ordered: OrderedRow[] = [
    ...(input.employerChanges || []).map((row) => ({
      kind: '2' as const,
      nsr: row.nsr,
      row,
    })),
    ...(input.clockAdjusts || []).map((row) => ({
      kind: '4' as const,
      nsr: row.nsr,
      row,
    })),
    ...(input.employeeChanges || []).map((row) => ({
      kind: '5' as const,
      nsr: row.nsr,
      row,
    })),
    ...(input.sensitiveEvents || []).map((row) => ({
      kind: '6' as const,
      nsr: row.nsr,
      row,
    })),
    ...input.marks.map((row) => ({ kind: '7' as const, nsr: row.nsr, row })),
  ].sort((a, b) => a.nsr - b.nsr);

  const counts = {
    type2: 0,
    type3: 0,
    type4: 0,
    type5: 0,
    type6: 0,
    type7: 0,
  };

  for (const item of ordered) {
    if (item.kind === '2') {
      lines.push(buildType2(item.row));
      counts.type2++;
    } else if (item.kind === '4') {
      lines.push(buildType4(item.row));
      counts.type4++;
    } else if (item.kind === '5') {
      lines.push(buildType5(item.row));
      counts.type5++;
    } else if (item.kind === '6') {
      lines.push(buildType6(item.row));
      counts.type6++;
    } else {
      const { line, hash } = buildType7(item.row, previousHash);
      lines.push(line);
      previousHash = hash;
      counts.type7++;
    }
  }

  lines.push(buildTrailer(counts));
  lines.push(DIGITAL_SIGNATURE_TRAILER);

  const content = lines.join(CRLF) + CRLF;
  const { number } = employerIdTypeAndNumber(input.employerTaxId);
  const inpi = padLeft(onlyDigits(input.inpiId || DEFAULT_INPI), 17);
  const fileName = `AFD${inpi}${number}REP_P.txt`;

  return {
    content,
    fileName,
    markCount: counts.type7,
    lastHash: previousHash,
    sha256File: createHash('sha256').update(content, 'latin1').digest('hex'),
    layoutVersion: AFD_LAYOUT_VERSION,
    counts,
  };
}

/** Field slice helper for tests */
export function sliceAfdField(line: string, start1: number, end1: number): string {
  return line.slice(start1 - 1, end1);
}
