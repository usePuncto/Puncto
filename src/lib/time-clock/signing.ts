/**
 * Cryptographic signing for REP-P (Portaria 671):
 * - Vendor (Puncto): AFD CAdES .p7s + PDF PAdES via env PFX
 * - Employer (client): AEJ CAdES .p7s via uploaded PFX in Firestore
 */

import { createHash, X509Certificate } from 'crypto';
import fs from 'fs';
import path from 'path';
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
import {
  loadEmployerPfxCredentials,
  type EmployerCertPublicMeta,
} from './employer-cert';

export type SignatureResult = {
  status: 'signed' | 'pending_icp_cert' | 'failed';
  standard: 'CAdES-detached' | 'PAdES-embedded' | 'none';
  p7s?: Buffer;
  /** For PAdES: the fully signed PDF bytes */
  signedPdf?: Buffer;
  reason?: string;
  signerSubject?: string;
};

function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

/** Puncto developer PFX from environment */
export function loadVendorPfx():
  | { pfx: Buffer; password: string }
  | { error: string }
  | null {
  const pfxPath =
    process.env.PUNCTO_VENDOR_ICP_PFX_PATH || process.env.PUNCTO_ICP_PFX_PATH;
  const password =
    process.env.PUNCTO_VENDOR_ICP_PFX_PASSWORD || process.env.PUNCTO_ICP_PFX_PASSWORD;
  if (!pfxPath || !password) return null;
  const abs = resolvePath(pfxPath);
  if (!fs.existsSync(abs)) {
    return { error: `PFX da desenvolvedora não encontrado: ${abs}` };
  }
  return { pfx: fs.readFileSync(abs), password };
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

function subjectFromCertPem(certPem: string, fallback?: string): string | undefined {
  try {
    return new X509Certificate(certPem).subject;
  } catch {
    return fallback;
  }
}

/**
 * CAdES detached (.p7s) from an arbitrary PFX buffer + password.
 */
export function signDetachedCadesWithPfx(
  content: Buffer | string,
  pfxBuffer: Buffer,
  password: string
): SignatureResult {
  try {
    const material = extractPemFromPfx(pfxBuffer, password);
    const data = typeof content === 'string' ? Buffer.from(content, 'latin1') : content;
    const p7s = signPkcs7Detached(data, material.privateKey, material.certificate);
    return {
      status: 'signed',
      standard: 'CAdES-detached',
      p7s,
      signerSubject: subjectFromCertPem(material.certPem, material.subjectCN),
    };
  } catch (err) {
    return {
      status: 'failed',
      standard: 'none',
      reason: err instanceof Error ? err.message : 'Falha ao assinar CAdES',
    };
  }
}

/** AFD — always Puncto (vendor) certificate from env */
export function signAfdCades(content: Buffer | string): SignatureResult {
  const vendor = loadVendorPfx();
  if (!vendor) {
    return {
      status: 'pending_icp_cert',
      standard: 'none',
      reason:
        'Configure PUNCTO_VENDOR_ICP_PFX_PATH + PUNCTO_VENDOR_ICP_PFX_PASSWORD para assinar o AFD.',
    };
  }
  if ('error' in vendor) {
    return { status: 'failed', standard: 'none', reason: vendor.error };
  }
  return signDetachedCadesWithPfx(content, vendor.pfx, vendor.password);
}

/**
 * AEJ — employer certificate from Firestore (uploaded by client admin).
 * Never uses Puncto vendor cert.
 */
export async function signAejCades(
  businessId: string,
  content: Buffer | string
): Promise<SignatureResult & { employerMeta?: EmployerCertPublicMeta }> {
  const creds = await loadEmployerPfxCredentials(businessId);
  if (!creds) {
    return {
      status: 'pending_icp_cert',
      standard: 'none',
      reason:
        'Empregador ainda não enviou o certificado e-CNPJ A1. Faça upload em Configurações de ponto / Certificado digital.',
    };
  }
  if ('error' in creds) {
    return { status: 'failed', standard: 'none', reason: creds.error };
  }

  const result = signDetachedCadesWithPfx(content, creds.pfx, creds.password);
  return { ...result, employerMeta: creds.meta };
}

/**
 * PAdES-BES (ETSI.CAdES.detached) embedded in PDF using pdf-lib ByteRange placeholder + @signpdf.
 * Signed with Puncto vendor PFX.
 */
export async function signPdfPadesEmbedded(
  unsignedPdf: Buffer,
  options?: {
    reason?: string;
    contactInfo?: string;
    name?: string;
    location?: string;
    signingTime?: Date;
  }
): Promise<SignatureResult> {
  const vendor = loadVendorPfx();
  if (!vendor) {
    return {
      status: 'pending_icp_cert',
      standard: 'none',
      reason:
        'Configure PUNCTO_VENDOR_ICP_PFX_PATH + PASSWORD para assinar o comprovante em PAdES.',
    };
  }
  if ('error' in vendor) {
    return { status: 'failed', standard: 'none', reason: vendor.error };
  }

  try {
    const pdfDoc = await PDFDocument.load(unsignedPdf);
    let signerName = options?.name || 'Puncto Serviços de Tecnologia Ltda';
    try {
      const material = extractPemFromPfx(vendor.pfx, vendor.password);
      signerName = material.subjectCN || signerName;
    } catch {
      /* keep default name */
    }

    pdflibAddPlaceholder({
      pdfDoc,
      reason:
        options?.reason ||
        'Comprovante de Registro de Ponto do Trabalhador — REP-P / Portaria MTP 671/2021',
      contactInfo: options?.contactInfo || 'contato@puncto.com.br',
      name: signerName,
      location: options?.location || 'Brasil',
      signingTime: options?.signingTime || new Date(),
      // ICP-Brasil A1 + attributes need generous placeholder
      signatureLength: 16384,
      byteRangePlaceholder: DEFAULT_BYTE_RANGE_PLACEHOLDER,
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
      appName: 'Puncto REP-P',
    });

    const pdfWithPlaceholder = Buffer.from(
      await pdfDoc.save({ useObjectStreams: false })
    );

    const signer = new P12Signer(vendor.pfx, { passphrase: vendor.password });
    const signedPdf = Buffer.from(await signpdf.sign(pdfWithPlaceholder, signer));

    return {
      status: 'signed',
      standard: 'PAdES-embedded',
      signedPdf,
      signerSubject: signerName,
    };
  } catch (err) {
    return {
      status: 'failed',
      standard: 'none',
      reason: err instanceof Error ? err.message : 'Falha ao assinar PDF (PAdES)',
    };
  }
}

/** @deprecated use signAfdCades */
export function signDetachedCades(
  content: Buffer | string,
  role: 'VENDOR' | 'EMPLOYER' = 'VENDOR'
): SignatureResult {
  if (role === 'EMPLOYER') {
    return {
      status: 'pending_icp_cert',
      standard: 'none',
      reason: 'Use signAejCades(businessId, content) para assinar AEJ com o certificado do cliente.',
    };
  }
  return signAfdCades(content);
}

export function sha256File(content: Buffer | string): string {
  const buf = typeof content === 'string' ? Buffer.from(content, 'latin1') : content;
  return createHash('sha256').update(buf).digest('hex');
}
