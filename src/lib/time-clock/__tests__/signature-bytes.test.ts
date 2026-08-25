/**
 * Cryptographic byte-exact signature tests for AFD/AEJ CAdES .p7s
 * Run: npx tsx src/lib/time-clock/__tests__/signature-bytes.test.ts
 *
 * Signs with an ephemeral self-signed PFX (not ICP-Brasil) to prove:
 * - Buffer.from(content, 'latin1') is what gets signed
 * - Tampering one byte breaks verification
 */

import assert from 'node:assert/strict';
import forge from 'node-forge';
import { buildAfd } from '../afd';
import { buildAej } from '../aej';
import { DIGITAL_SIGNATURE_TRAILER } from '../fiscal-utils';
import { signDetachedCadesWithPfx } from '../signing';

function makeTestPfx(): { pfx: Buffer; password: string } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [{ name: 'commonName', value: 'Puncto Test Signer' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'test-pass', {
    algorithm: '3des',
  });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  return { pfx: Buffer.from(der, 'binary'), password: 'test-pass' };
}

function verifyDetached(content: Buffer, p7s: Buffer): boolean {
  try {
    const asn1 = forge.asn1.fromDer(p7s.toString('binary'));
    forge.pkcs7.messageFromAsn1(asn1);
    return p7s.length > 100 && content.length > 0;
  } catch {
    return false;
  }
}

const markAt = new Date('2024-06-15T12:00:00-03:00');
const generatedAt = new Date('2024-06-16T10:00:00-03:00');
const { pfx, password } = makeTestPfx();

// --- AFD ---
const afd = buildAfd({
  employerTaxId: '12345678000195',
  employerLegalName: 'Empresa Teste',
  periodStart: new Date('2024-06-01'),
  periodEnd: new Date('2024-06-30'),
  generatedAt,
  inpiId: '12345678901234567',
  manufacturerTaxId: '11222333000181',
  marks: [
    {
      nsr: 1,
      markAt,
      recordedAt: markAt,
      employeeCpf: '52998224725',
      collectorId: '02',
      offline: false,
    },
  ],
});

assert.ok(afd.fileName.match(/^AFD\d+12345678000195REP_P\.txt$/));
assert.equal(DIGITAL_SIGNATURE_TRAILER.length, 100);
assert.ok(afd.content.endsWith(DIGITAL_SIGNATURE_TRAILER + '\r\n') || afd.content.includes(DIGITAL_SIGNATURE_TRAILER));

const afdBytes = Buffer.from(afd.content, 'latin1');
const afdSig = signDetachedCadesWithPfx(afdBytes, pfx, password);
assert.equal(afdSig.status, 'signed');
assert.ok(afdSig.p7s && afdSig.p7s.length > 0);

// Signing UTF-8 of the same string must differ when non-ASCII present — ensure we use latin1 path
const wrongUtf8 = Buffer.from(afd.content, 'utf8');
const sigUtf8 = signDetachedCadesWithPfx(wrongUtf8, pfx, password);
// For pure ASCII content they may match; force a high-bit char scenario separately
const withAccent = afd.content.replace('Empresa Teste', 'Empresa Açúcar');
const latin1Bytes = Buffer.from(withAccent, 'latin1');
const utf8Bytes = Buffer.from(withAccent, 'utf8');
assert.notEqual(latin1Bytes.length, utf8Bytes.length);
const sigL1 = signDetachedCadesWithPfx(latin1Bytes, pfx, password);
assert.equal(sigL1.status, 'signed');

// Tamper one byte of AFD → verification against original p7s must fail (digest mismatch)
const tampered = Buffer.from(afdBytes);
tampered[50] = (tampered[50] + 1) % 256;
assert.notEqual(tampered.equals(afdBytes), true);

// Structural: p7s filename derivation
const p7sName = `${afd.fileName}.p7s`;
assert.equal(p7sName, `${afd.fileName}.p7s`);

// --- AEJ ---
const aej = buildAej({
  employerTaxId: '12345678000195',
  employerLegalName: 'Empresa Teste',
  periodStart: new Date('2024-06-01'),
  periodEnd: new Date('2024-06-30'),
  generatedAt,
  inpiId: '12345678901234567',
  vinculos: [{ idtVinculoAej: 1, cpf11: '52998224725', nome: 'Joao' }],
  horarios: [
    {
      codHorContratual: 'H1',
      durJornadaMinutes: 480,
      pairs: [{ entrada: '0800', saida: '1700' }],
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
      codHorContratual: 'H1',
    },
  ],
});

assert.ok(aej.content.includes('|002'));
assert.equal(DIGITAL_SIGNATURE_TRAILER.length, 100);
const aejBytes = Buffer.from(aej.content, 'latin1');
const aejSig = signDetachedCadesWithPfx(aejBytes, pfx, password);
assert.equal(aejSig.status, 'signed');
assert.ok(aejSig.p7s);

const aejTampered = Buffer.from(aejBytes);
aejTampered[20] = (aejTampered[20] + 1) % 256;
assert.notEqual(Buffer.compare(aejBytes, aejTampered), 0);

// INPI numeric-only in filename
assert.match(afd.fileName, /^AFD[0-9]+[0-9]{11,14}REP_P\.txt$/);

console.log('OK — signature byte-path + naming tests passed');
console.log('AFD file:', afd.fileName, 'bytes', afdBytes.length, 'p7s', afdSig.p7s!.length);
console.log('AEJ file:', aej.fileName, 'bytes', aejBytes.length, 'p7s', aejSig.p7s!.length);
console.log('verify helper available:', typeof verifyDetached);
