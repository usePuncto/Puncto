import { createHash } from 'crypto';
import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import {
  DEFAULT_BYTE_RANGE_PLACEHOLDER,
  SUBFILTER_ETSI_CADES_DETACHED,
} from '@signpdf/utils';
import { extractPemFromPfx } from './pfx';
import { loadVendorPfxInternal } from './vendorPfx';
import { validateDocumentForOperation, type SignOperation } from './documentGate';
import { logSigningAudit, newCorrelationId } from './audit';

export function sha256Hex(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function signPkcs7Detached(
  content: Buffer,
  privateKey: forge.pki.PrivateKey,
  certificate: forge.pki.Certificate
): Buffer {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(content.toString('binary'));
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function isValidCnpj14(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += Number(base[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(digits, w1);
  const d2 = calc(digits.slice(0, 13) + d1, w2);
  return digits.endsWith(`${d1}${d2}`);
}

function looksLikeIcpBrasil(material: ReturnType<typeof extractPemFromPfx>): boolean {
  const blob = `${material.issuerCN} ${material.subjectRaw}`.toUpperCase();
  return blob.includes('ICP') || blob.includes('AC ') || blob.includes('CERTISIGN') ||
    blob.includes('SERASA') || blob.includes('VALID') || blob.includes('SOLUTI');
}

export type ValidateCertResult = {
  ok: boolean;
  blockers: string[];
  certVersion: string | null;
  certMeta?: {
    subjectCN: string;
    taxIdFromCert: string | null;
    validFrom: string;
    validTo: string;
    issuerCN: string;
  };
};

export async function validateVendorCertificateInternal(): Promise<ValidateCertResult> {
  const blockers: string[] = [];
  const expectedCnpj = onlyDigits(process.env.PUNCTO_VENDOR_CNPJ || '');

  let material: ReturnType<typeof extractPemFromPfx>;
  try {
    const { pfx, password } = await loadVendorPfxInternal();
    material = extractPemFromPfx(pfx, password);
  } catch (e) {
    return {
      ok: false,
      blockers: [e instanceof Error ? e.message : 'Falha ao carregar PFX'],
      certVersion: null,
    };
  }

  const now = new Date();
  if (now < material.validFrom) blockers.push('Certificado notBefore futuro');
  if (now > material.validTo) blockers.push('Certificado expirado');
  if (!material.privateKey) blockers.push('Chave privada ausente');
  if (!looksLikeIcpBrasil(material)) {
    blockers.push('Cadeia/emissor ICP-Brasil não identificável no certificado');
  }
  if (expectedCnpj.length === 14) {
    if (!isValidCnpj14(expectedCnpj)) {
      blockers.push('PUNCTO_VENDOR_CNPJ inválido no ambiente do signer');
    } else if (material.taxIdFromCert && onlyDigits(material.taxIdFromCert) !== expectedCnpj) {
      blockers.push('CNPJ do certificado ≠ PUNCTO_VENDOR_CNPJ');
    } else if (!material.taxIdFromCert) {
      blockers.push('CNPJ do titular não identificável no certificado');
    }
  }

  try {
    const probe = Buffer.from('REP-P-SIGN-PROBE', 'latin1');
    signPkcs7Detached(probe, material.privateKey, material.certificate);
  } catch {
    blockers.push('Chave privada não consegue produzir assinatura PKCS#7');
  }

  return {
    ok: blockers.length === 0,
    blockers,
    certVersion: material.serialNumber,
    certMeta: {
      subjectCN: material.subjectCN,
      taxIdFromCert: material.taxIdFromCert,
      validFrom: material.validFrom.toISOString(),
      validTo: material.validTo.toISOString(),
      issuerCN: material.issuerCN,
    },
  };
}

export type SignResponse = {
  status: 'signed' | 'failed';
  standard: 'CAdES-detached' | 'PAdES-embedded' | 'none';
  p7sBase64?: string;
  signedPdfBase64?: string;
  signerSubject?: string;
  correlationId: string;
  contentSha256: string;
  certVersion: string | null;
  reason?: string;
};

export async function executeSignOperation(input: {
  operation: SignOperation;
  content: Buffer;
  establishmentId: string | null;
  correlationId?: string;
  callerEnv?: string;
  padesOptions?: {
    reason?: string;
    contactInfo?: string;
    name?: string;
    location?: string;
  };
}): Promise<SignResponse> {
  const correlationId = input.correlationId || newCorrelationId();
  const contentSha256 = sha256Hex(input.content);
  let certVersion: string | null = null;

  const gate = validateDocumentForOperation(input.operation, input.content);
  if (!gate.ok) {
    logSigningAudit({
      correlationId,
      operation: input.operation,
      establishmentId: input.establishmentId,
      contentSha256,
      certVersion: null,
      result: 'rejected',
      reason: gate.reason,
      timestamp: new Date().toISOString(),
      callerEnv: input.callerEnv,
    });
    return {
      status: 'failed',
      standard: 'none',
      correlationId,
      contentSha256,
      certVersion: null,
      reason: gate.reason,
    };
  }

  try {
    const { pfx, password } = await loadVendorPfxInternal();
    const material = extractPemFromPfx(pfx, password);
    certVersion = material.serialNumber;

    if (input.operation === 'signAfd' || input.operation === 'signAej') {
      const p7s = signPkcs7Detached(input.content, material.privateKey, material.certificate);
      logSigningAudit({
        correlationId,
        operation: input.operation,
        establishmentId: input.establishmentId,
        contentSha256,
        certVersion,
        result: 'signed',
        timestamp: new Date().toISOString(),
        callerEnv: input.callerEnv,
      });
      return {
        status: 'signed',
        standard: 'CAdES-detached',
        p7sBase64: p7s.toString('base64'),
        signerSubject: material.subjectCN,
        correlationId,
        contentSha256,
        certVersion,
      };
    }

    const pdfDoc = await PDFDocument.load(input.content);
    const signerName = input.padesOptions?.name || material.subjectCN || 'Puncto';
    pdflibAddPlaceholder({
      pdfDoc,
      reason:
        input.padesOptions?.reason ||
        'Comprovante REP-P / Portaria MTP 671/2021',
      contactInfo: input.padesOptions?.contactInfo || 'contato@puncto.com.br',
      name: signerName,
      location: input.padesOptions?.location || 'Brasil',
      signingTime: new Date(),
      signatureLength: 16384,
      byteRangePlaceholder: DEFAULT_BYTE_RANGE_PLACEHOLDER,
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
      appName: 'Puncto REP-P',
    });
    const pdfWithPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    const signer = new P12Signer(pfx, { passphrase: password });
    const signedPdf = Buffer.from(await signpdf.sign(pdfWithPlaceholder, signer));

    logSigningAudit({
      correlationId,
      operation: 'signRepPReceipt',
      establishmentId: input.establishmentId,
      contentSha256,
      certVersion,
      result: 'signed',
      timestamp: new Date().toISOString(),
      callerEnv: input.callerEnv,
    });

    return {
      status: 'signed',
      standard: 'PAdES-embedded',
      signedPdfBase64: signedPdf.toString('base64'),
      signerSubject: signerName,
      correlationId,
      contentSha256,
      certVersion,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Falha na assinatura';
    logSigningAudit({
      correlationId,
      operation: input.operation,
      establishmentId: input.establishmentId,
      contentSha256,
      certVersion,
      result: 'failed',
      reason,
      timestamp: new Date().toISOString(),
      callerEnv: input.callerEnv,
    });
    return {
      status: 'failed',
      standard: 'none',
      correlationId,
      contentSha256,
      certVersion,
      reason,
    };
  }
}
