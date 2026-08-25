/**
 * Cliente Vercel Production → Puncto Signing Service (privado, IAM/WIF only).
 * Nunca recebe PFX/senha — apenas assinatura ou validação.
 */

import type { SignatureResult } from './signing-result';
import { isVercelWifConfigured, requestWithVercelWif } from '@/lib/gcp/vercel-wif-auth';

export function isProductionSigningEnabled(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' &&
    Boolean(process.env.PUNCTO_SIGNING_SERVICE_URL) &&
    isVercelWifConfigured()
  );
}

/** Preview/Development não devem alcançar o signer de produção */
export function assertNotPreviewSigningCaller(): void {
  const env = process.env.VERCEL_ENV;
  if (env && env !== 'production') {
    throw new Error(
      `Assinatura ICP real bloqueada em VERCEL_ENV=${env}. WIF OIDC não disponível fora de Production.`
    );
  }
}

async function callSigningService<T>(body: Record<string, unknown>): Promise<T> {
  assertNotPreviewSigningCaller();

  const url = process.env.PUNCTO_SIGNING_SERVICE_URL?.trim();
  if (!url) {
    throw new Error('PUNCTO_SIGNING_SERVICE_URL ausente');
  }

  return requestWithVercelWif<T>(url, body);
}

type SignServiceResponse = {
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

export async function remoteSignAfd(
  content: Buffer | string,
  establishmentId?: string
): Promise<SignatureResult> {
  const buf = typeof content === 'string' ? Buffer.from(content, 'latin1') : content;
  try {
    const data = await callSigningService<SignServiceResponse>({
      operation: 'signAfd',
      establishmentId: establishmentId || null,
      contentBase64: buf.toString('base64'),
    });
    if (data.status !== 'signed' || !data.p7sBase64) {
      return {
        status: 'failed',
        standard: 'none',
        reason: data.reason || 'Signing Service recusou AFD',
      };
    }
    return {
      status: 'signed',
      standard: 'CAdES-detached',
      p7s: Buffer.from(data.p7sBase64, 'base64'),
      signerSubject: data.signerSubject,
    };
  } catch (e) {
    return {
      status: 'failed',
      standard: 'none',
      reason: e instanceof Error ? e.message : 'Falha ao chamar Signing Service',
    };
  }
}

export async function remoteSignAej(
  content: Buffer | string,
  establishmentId?: string
): Promise<SignatureResult> {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  try {
    const data = await callSigningService<SignServiceResponse>({
      operation: 'signAej',
      establishmentId: establishmentId || null,
      contentBase64: buf.toString('base64'),
    });
    if (data.status !== 'signed' || !data.p7sBase64) {
      return {
        status: 'failed',
        standard: 'none',
        reason: data.reason || 'Signing Service recusou AEJ',
      };
    }
    return {
      status: 'signed',
      standard: 'CAdES-detached',
      p7s: Buffer.from(data.p7sBase64, 'base64'),
      signerSubject: data.signerSubject,
    };
  } catch (e) {
    return {
      status: 'failed',
      standard: 'none',
      reason: e instanceof Error ? e.message : 'Falha ao chamar Signing Service',
    };
  }
}

export async function remoteSignRepPReceipt(
  unsignedPdf: Buffer,
  establishmentId?: string,
  padesOptions?: {
    reason?: string;
    contactInfo?: string;
    name?: string;
    location?: string;
  }
): Promise<SignatureResult> {
  try {
    const data = await callSigningService<SignServiceResponse>({
      operation: 'signRepPReceipt',
      establishmentId: establishmentId || null,
      contentBase64: unsignedPdf.toString('base64'),
      padesOptions,
    });
    if (data.status !== 'signed' || !data.signedPdfBase64) {
      return {
        status: 'failed',
        standard: 'none',
        reason: data.reason || 'Signing Service recusou comprovante',
      };
    }
    return {
      status: 'signed',
      standard: 'PAdES-embedded',
      signedPdf: Buffer.from(data.signedPdfBase64, 'base64'),
      signerSubject: data.signerSubject,
    };
  } catch (e) {
    return {
      status: 'failed',
      standard: 'none',
      reason: e instanceof Error ? e.message : 'Falha ao chamar Signing Service',
    };
  }
}

export type RemoteValidateResult = {
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

export async function remoteValidateVendorCert(): Promise<RemoteValidateResult> {
  assertNotPreviewSigningCaller();
  return callSigningService<RemoteValidateResult>({
    operation: 'validateVendorCert',
  });
}
