/**
 * AFD (Arquivo Fonte de Dados) — Portaria MTP 671/2021, layout REP-P.
 * Immutable raw marks only. Signed by software vendor (ICP-Brasil) as detached CAdES (.p7s).
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

export type AfdMarkRow = {
  nsr: number;
  markAt: Date;
  recordedAt: Date;
  employeeCpf: string;
  /** 01 mobile | 02 browser | 03 desktop | 04 device | 05 other */
  collectorId: string;
  offline: boolean;
  /** SHA-256 hex of this mark (field 8); computed if omitted */
  hash?: string;
};

export type AfdBuildInput = {
  employerTaxId: string;
  employerLegalName: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  /** INPI / fabricante software id (17 chars) — configure via env */
  manufacturerId?: string;
  model?: string;
  marks: AfdMarkRow[];
  /** Previous file last mark hash to continue chain; empty for first mark of establishment */
  chainSeedHash?: string;
};

const LAYOUT_VERSION = '003';
const DEFAULT_MANUFACTURER = padRight(process.env.PUNCTO_AFD_MANUFACTURER_ID || 'PUNCTO', 17);
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
  const body =
    '000000000' +
    '1' +
    type +
    number +
    padLeft('0', 14) + // CNO/CAEPF
    padRight(input.employerLegalName, 150) +
    formatAfdDate(input.periodStart) +
    formatAfdDate(input.periodEnd) +
    formatAfdDateTime(input.generatedAt) +
    LAYOUT_VERSION +
    (input.manufacturerId ? padRight(input.manufacturerId, 17) : DEFAULT_MANUFACTURER) +
    (input.model ? padRight(input.model, 30) : DEFAULT_MODEL);
  return appendCrc(body);
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

export type AfdBuildResult = {
  content: string;
  fileName: string;
  markCount: number;
  lastHash: string;
  sha256File: string;
};

export function buildAfd(input: AfdBuildInput): AfdBuildResult {
  const lines: string[] = [buildHeader(input)];
  let previousHash = input.chainSeedHash || '';
  const sorted = [...input.marks].sort((a, b) => a.nsr - b.nsr);

  for (const mark of sorted) {
    const { line, hash } = buildType7(mark, previousHash);
    lines.push(line);
    previousHash = hash;
  }

  lines.push(DIGITAL_SIGNATURE_TRAILER);

  const content = lines.join(CRLF) + CRLF;
  const { number } = employerIdTypeAndNumber(input.employerTaxId);
  const fileName = `AFD${number}REP_P.txt`;

  return {
    content,
    fileName,
    markCount: sorted.length,
    lastHash: previousHash,
    sha256File: createHash('sha256').update(content, 'latin1').digest('hex'),
  };
}
