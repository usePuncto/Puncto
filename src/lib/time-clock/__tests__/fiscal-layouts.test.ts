/**
 * Automated layout tests for AFD 004 and AEJ 002 (Portaria 671).
 * Run: npx tsx src/lib/time-clock/__tests__/fiscal-layouts.test.ts
 */

import assert from 'node:assert/strict';
import {
  AFD_LAYOUT_VERSION,
  buildAfd,
  computeMarkHash,
  sliceAfdField,
} from '../afd';
import { AEJ_LAYOUT_VERSION, buildAej } from '../aej';
import { crc16Kermit, DIGITAL_SIGNATURE_TRAILER, formatAfdDateTime } from '../fiscal-utils';
import { isUsableRepPCpf, isValidCpf } from '../cpf';

function linesOf(content: string): string[] {
  return content.replace(/\r\n$/g, '').split('\r\n').filter((l) => l.length > 0);
}

// --- CPF ---
assert.equal(isValidCpf('529.982.247-25'), true);
assert.equal(isValidCpf('111.111.111-11'), false);
assert.equal(isUsableRepPCpf('0'), false);
assert.equal(isUsableRepPCpf('00000000000'), false);
assert.equal(isUsableRepPCpf(null), false);
assert.equal(isUsableRepPCpf('52998224725'), true);

// --- CRC reference from Portaria ---
assert.equal(crc16Kermit('123456789').toLowerCase(), '2189');

// --- AFD 004 ---
const markAt = new Date('2024-06-15T12:00:00-03:00');
const generatedAt = new Date('2024-06-16T10:00:00-03:00');
const cpf12 = '052998224725';
const markDh = formatAfdDateTime(markAt);
const hash = computeMarkHash({
  nsr: 1,
  markDh,
  cpf12,
  recordedDh: markDh,
  collectorId: '02',
  offlineFlag: '0',
  previousHash: '',
});

const afd = buildAfd({
  employerTaxId: '12.345.678/0001-95',
  employerLegalName: 'Empresa Teste LTDA',
  periodStart: new Date('2024-06-01T00:00:00-03:00'),
  periodEnd: new Date('2024-06-30T23:59:59-03:00'),
  generatedAt,
  inpiId: '12345678901234567',
  manufacturerTaxId: '11222333000181',
  employerChanges: [
    {
      nsr: 2,
      recordedAt: markAt,
      responsibleCpf: '52998224725',
      employerTaxId: '12345678000195',
      legalName: 'Empresa Teste LTDA',
      serviceLocation: 'Matriz',
    },
  ],
  employeeChanges: [
    {
      nsr: 3,
      recordedAt: markAt,
      operation: 'I',
      employeeCpf: '52998224725',
      employeeName: 'Joao da Silva',
      responsibleCpf: '52998224725',
    },
  ],
  sensitiveEvents: [
    {
      nsr: 4,
      recordedAt: markAt,
      eventCode: '07',
    },
    {
      nsr: 6,
      recordedAt: markAt,
      eventCode: '02', // retorno de energia — builder only; sem emissão automática
    },
  ],
  marks: [
    {
      nsr: 1,
      markAt,
      recordedAt: markAt,
      employeeCpf: '52998224725',
      collectorId: '02',
      offline: false,
      hash,
    },
  ],
});

assert.equal(afd.layoutVersion, '004');
assert.equal(AFD_LAYOUT_VERSION, '004');

const afdLines = linesOf(afd.content);
const header = afdLines[0];
assert.equal(header.length, 302, `header len ${header.length}`);
assert.equal(sliceAfdField(header, 1, 9), '000000000');
assert.equal(sliceAfdField(header, 10, 10), '1');
assert.equal(sliceAfdField(header, 251, 253), '004');
assert.equal(sliceAfdField(header, 254, 254), '1'); // manufacturer CNPJ type
assert.match(header.slice(-4), /^[0-9A-F]{4}$/i);

// Records ordered by NSR in file body (after header): nsr 1,2,3,4
const body = afdLines.slice(1, -2);
assert.ok(body.some((l) => l[9] === '7'));
assert.ok(body.some((l) => l[9] === '2'));
assert.ok(body.some((l) => l[9] === '5'));
assert.ok(body.some((l) => l[9] === '6'));

const type7 = body.find((l) => l[9] === '7')!;
assert.equal(type7.length, 137);
assert.equal(sliceAfdField(type7, 1, 9), '000000001');
assert.equal(sliceAfdField(type7, 10, 10), '7');
assert.equal(sliceAfdField(type7, 35, 46), cpf12);
assert.equal(sliceAfdField(type7, 71, 72), '02');
assert.equal(sliceAfdField(type7, 73, 73), '0');
assert.equal(sliceAfdField(type7, 74, 137), hash.padEnd(64).slice(0, 64));

const type6Rows = body.filter((l) => l[9] === '6');
assert.equal(type6Rows.length, 2);
const type6Avail = type6Rows.find((l) => sliceAfdField(l, 35, 36) === '07')!;
const type6Power = type6Rows.find((l) => sliceAfdField(l, 35, 36) === '02')!;
assert.equal(type6Avail.length, 36);
assert.equal(type6Power.length, 36);
assert.equal(sliceAfdField(type6Avail, 35, 36), '07');
assert.equal(sliceAfdField(type6Power, 35, 36), '02');

const type2 = body.find((l) => l[9] === '2')!;
assert.equal(type2.length, 331);

const type5 = body.find((l) => l[9] === '5')!;
assert.equal(type5.length, 118);

const trailer = afdLines[afdLines.length - 2];
assert.equal(trailer.length, 64);
assert.equal(sliceAfdField(trailer, 1, 9), '999999999');
assert.equal(sliceAfdField(trailer, 64, 64), '9');

const sig = afdLines[afdLines.length - 1];
assert.equal(sig, DIGITAL_SIGNATURE_TRAILER);
assert.ok(afd.content.includes('\r\n'));
assert.ok(afd.fileName.startsWith('AFD') && afd.fileName.endsWith('REP_P.txt'));

// --- AEJ 002 ---
const aej = buildAej({
  employerTaxId: '12345678000195',
  employerLegalName: 'Empresa Teste LTDA',
  periodStart: new Date('2024-06-01T00:00:00-03:00'),
  periodEnd: new Date('2024-06-30T23:59:59-03:00'),
  generatedAt,
  inpiId: '12345678901234567',
  vinculos: [
    {
      idtVinculoAej: 1,
      cpf11: '52998224725',
      nome: 'Joao da Silva',
      esocialRegistration: 'MAT-001',
    },
  ],
  horarios: [
    {
      codHorContratual: 'COMERCIAL',
      durJornadaMinutes: 480,
      pairs: [
        { entrada: '0800', saida: '1200' },
        { entrada: '1300', saida: '1700' },
      ],
    },
  ],
  marcacoes: [
    {
      idtVinculoAej: 1,
      dataHoraMarc: markAt,
      idRepAej: 1,
      tpMarc: 'E',
      seqEntSaida: 1,
      fonteMarc: 'O',
      codHorContratual: 'COMERCIAL',
    },
    {
      idtVinculoAej: 1,
      dataHoraMarc: new Date('2024-06-15T17:00:00-03:00'),
      idRepAej: 1,
      tpMarc: 'S',
      seqEntSaida: 1,
      fonteMarc: 'I',
      motivo: 'Esquecimento de batida',
    },
  ],
  ausencias: [
    {
      idtVinculoAej: 1,
      tipoAusenOuComp: '3',
      data: new Date('2024-06-20T00:00:00-03:00'),
      qtMinutos: 60,
      tipoMovBH: '1',
    },
  ],
  ptrp: {
    nomeProg: 'Puncto PTRP',
    versaoProg: '1.0.0',
    developerTaxId: '11222333000181',
    developerName: 'Puncto Servicos de Tecnologia Ltda.',
    developerEmail: 'contato@puncto.com.br',
  },
});

assert.equal(aej.layoutVersion, '002');
assert.equal(AEJ_LAYOUT_VERSION, '002');

const aejLines = linesOf(aej.content);
const h = aejLines[0].split('|');
assert.equal(h[0], '01');
assert.equal(h[9], '002');
assert.ok(!aejLines[0].includes('CRC'));

assert.ok(aejLines.some((l) => l.startsWith('02|')));
assert.ok(aejLines.some((l) => l.startsWith('03|')));
const tipo04 = aejLines.find((l) => l.startsWith('04|'))!;
const f04 = tipo04.split('|');
assert.equal(f04[1], 'COMERCIAL');
assert.equal(f04[2], '480');
assert.equal(f04[3], '0800');
assert.equal(f04[4], '1200');
assert.equal(f04[5], '1300');
assert.equal(f04[6], '1700');

const tipo05O = aejLines.find((l) => l.includes('|O|'))!;
assert.ok(tipo05O.startsWith('05|'));
const tipo05I = aejLines.find((l) => l.includes('|I|'))!;
assert.ok(tipo05I.includes('Esquecimento'));

assert.ok(aejLines.some((l) => l.startsWith('06|') && l.includes('MAT-001')));
assert.ok(aejLines.some((l) => l.startsWith('07|')));
assert.ok(aejLines.some((l) => l.startsWith('08|')));
const t99 = aejLines.find((l) => l.startsWith('99|'))!;
assert.ok(t99.split('|').length >= 9);
assert.equal(aejLines[aejLines.length - 1], DIGITAL_SIGNATURE_TRAILER);

console.log('OK — AFD 004 + AEJ 002 layout tests passed');
console.log('--- AFD sample (first 2 lines) ---');
console.log(afdLines.slice(0, 2).join('\n'));
console.log('--- AEJ sample (first 4 lines) ---');
console.log(aejLines.slice(0, 4).join('\n'));
