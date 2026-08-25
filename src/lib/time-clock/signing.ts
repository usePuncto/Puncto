/**
 * Cryptographic signing for REP-P / PTRP (Portaria 671).
 *
 * Production: Vercel → IAM + secret → Puncto Signing Service (privado) → GSM → assina
 * Dev/Preview: PFX local de teste ou pending_icp_cert — NUNCA certificado real
 */

import { createHash, X509Certificate } from 'crypto';
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
import { loadVendorPfxAsync } from './vendor-cert';
import {
  isProductionSigningEnabled,
  remoteSignAfd,
  remoteSignAej,
  remoteSignRepPReceipt,
} from './signing-client';

import type { SignatureResult } from './signing-result';
export type { SignatureResult } from './signing-result';

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

/** Unit tests / dev local PFX only */
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

async function loadDevVendorForSigning(): Promise<
  { pfx: Buffer; password: string } | SignatureResult
> {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return {
      status: 'pending_icp_cert',
      standard: 'none',
      reason: 'Production exige Puncto Signing Service — PFX local bloqueado',
    };
  }
  const vendor = await loadVendorPfxAsync();
  if (!vendor) {
    return {
      status: 'pending_icp_cert',
      standard: 'none',
      reason: 'Configure PFX de teste local (dev) ou Puncto Signing Service (production)',
    };
  }
  if ('error' in vendor) {
    return { status: 'failed', standard: 'none', reason: vendor.error };
  }
  return { pfx: vendor.pfx, password: vendor.password };
}

export async function signAfdCades(content: Buffer | string): Promise<SignatureResult> {
  if (isProductionSigningEnabled()) {
    return remoteSignAfd(content);
  }
  const vendor = await loadDevVendorForSigning();
  if ('status' in vendor) return vendor;
  return signDetachedCadesWithPfx(content, vendor.pfx, vendor.password);
}

export async function signAejCades(
  content: Buffer | string,
  businessId?: string
): Promise<SignatureResult> {
  if (isProductionSigningEnabled()) {
    return remoteSignAej(content, businessId);
  }
  const vendor = await loadDevVendorForSigning();
  if ('status' in vendor) return vendor;
  return signDetachedCadesWithPfx(content, vendor.pfx, vendor.password);
}

export async function signPdfPadesEmbedded(
  unsignedPdf: Buffer,
  options?: {
    reason?: string;
    contactInfo?: string;
    name?: string;
    location?: string;
    signingTime?: Date;
    establishmentId?: string;
  }
): Promise<SignatureResult> {
  if (isProductionSigningEnabled()) {
    return remoteSignRepPReceipt(unsignedPdf, options?.establishmentId, options);
  }

  const vendor = await loadDevVendorForSigning();
  if ('status' in vendor) return vendor;

  try {
    const pdfDoc = await PDFDocument.load(unsignedPdf);
    let signerName = options?.name || 'Puncto Serviços de Tecnologia Ltda';
    try {
      const material = extractPemFromPfx(vendor.pfx, vendor.password);
      signerName = material.subjectCN || signerName;
    } catch {
      /* keep default */
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

export async function signDetachedCades(
  content: Buffer | string,
  _role: 'VENDOR' | 'EMPLOYER' = 'VENDOR'
): Promise<SignatureResult> {
  return signAfdCades(content);
}

export function sha256File(content: Buffer | string): string {
  const buf = typeof content === 'string' ? Buffer.from(content, 'latin1') : content;
  return createHash('sha256').update(buf).digest('hex');
}
