/**
 * Validação fiscal/vendor para go-live — Production delega certificado ao Signing Service.
 * Vercel Production NÃO carrega PFX do GSM diretamente.
 */

import fs from 'fs';
import path from 'path';
import { extractPemFromPfx } from './pfx';
import { onlyDigits } from './fiscal-utils';
import {
  isProductionSigningEnabled,
  remoteValidateVendorCert,
  assertNotPreviewSigningCaller,
} from './signing-client';

export function getConfiguredVendorCnpj(): string {
  return onlyDigits(
    process.env.PUNCTO_VENDOR_CNPJ || process.env.PUNCTO_MANUFACTURER_CNPJ || ''
  );
}

export function getConfiguredInpiId(): string {
  return onlyDigits(process.env.PUNCTO_AFD_INPI_ID || process.env.PUNCTO_INPI_ID || '');
}

export type VendorCertValidation = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  certMeta?: {
    subjectCN: string;
    taxIdFromCert: string | null;
    validFrom: string;
    validTo: string;
    source: string;
  };
};

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

export function validateInpiRegistration(inpiRaw?: string): string | null {
  const digits = onlyDigits(inpiRaw ?? getConfiguredInpiId());
  if (digits.length !== 17) {
    return 'PUNCTO_AFD_INPI_ID deve ter 17 dígitos numéricos (registro INPI do REP-P)';
  }
  if (/^0+$/.test(digits)) {
    return 'PUNCTO_AFD_INPI_ID inválido — registro INPI real obrigatório para go-live REP-P';
  }
  return null;
}

export function validateVendorCnpj(cnpjRaw?: string): string | null {
  const digits = onlyDigits(cnpjRaw ?? getConfiguredVendorCnpj());
  if (digits.length !== 14) {
    return 'PUNCTO_VENDOR_CNPJ deve ter 14 dígitos (CNPJ da desenvolvedora Puncto)';
  }
  if (!isValidCnpj14(digits)) {
    return 'PUNCTO_VENDOR_CNPJ inválido (dígitos verificadores)';
  }
  return null;
}

/** Dev-only local PFX for tests — never production */
export async function loadVendorPfxAsync(): Promise<
  | { pfx: Buffer; password: string; source: 'local_dev_path' }
  | { error: string }
  | null
> {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return null;
  }

  const pfxPath =
    process.env.PUNCTO_VENDOR_ICP_PFX_PATH || process.env.PUNCTO_ICP_PFX_PATH;
  const password =
    process.env.PUNCTO_VENDOR_ICP_PFX_PASSWORD || process.env.PUNCTO_ICP_PFX_PASSWORD;
  if (!pfxPath || !password) return null;

  const abs = path.isAbsolute(pfxPath) ? pfxPath : path.resolve(process.cwd(), pfxPath);
  if (!fs.existsSync(abs)) {
    return { error: `PFX local não encontrado (dev): ${abs}` };
  }
  return {
    pfx: fs.readFileSync(abs),
    password,
    source: 'local_dev_path',
  };
}

export async function validateVendorIcpCertificate(): Promise<VendorCertValidation> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const inpiErr = validateInpiRegistration();
  if (inpiErr) blockers.push(inpiErr);

  const cnpjErr = validateVendorCnpj();
  if (cnpjErr) blockers.push(cnpjErr);

  if (isProductionSigningEnabled()) {
    try {
      const remote = await remoteValidateVendorCert();
      blockers.push(...remote.blockers);
      return {
        ok: blockers.length === 0 && remote.ok,
        blockers,
        warnings,
        certMeta: remote.certMeta
          ? {
              subjectCN: remote.certMeta.subjectCN,
              taxIdFromCert: remote.certMeta.taxIdFromCert,
              validFrom: remote.certMeta.validFrom,
              validTo: remote.certMeta.validTo,
              source: 'signing_service_gsm',
            }
          : undefined,
      };
    } catch (e) {
      blockers.push(
        e instanceof Error ? e.message : 'Falha ao validar certificado via Signing Service'
      );
      return { ok: false, blockers, warnings };
    }
  }

  if (process.env.VERCEL_ENV === 'preview') {
    blockers.push(
      'Preview não possui acesso ao certificado ICP real — use Production para go-live'
    );
    return { ok: false, blockers, warnings };
  }

  const loaded = await loadVendorPfxAsync();
  if (!loaded) {
    blockers.push('Certificado de teste local ausente (dev/homolog)');
    return { ok: false, blockers, warnings };
  }
  if ('error' in loaded) {
    blockers.push(loaded.error);
    return { ok: false, blockers, warnings };
  }

  let material;
  try {
    material = extractPemFromPfx(loaded.pfx, loaded.password);
  } catch (err) {
    blockers.push(err instanceof Error ? err.message : 'Falha ao abrir PFX de teste');
    return { ok: false, blockers, warnings };
  }

  const now = new Date();
  if (now < material.validFrom) blockers.push('Certificado notBefore futuro');
  if (now > material.validTo) blockers.push('Certificado expirado');

  warnings.push('Ambiente dev — certificado de teste, não ICP produção');

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    certMeta: {
      subjectCN: material.subjectCN,
      taxIdFromCert: material.taxIdFromCert,
      validFrom: material.validFrom.toISOString(),
      validTo: material.validTo.toISOString(),
      source: loaded.source,
    },
  };
}

export async function assertRepPVendorReadyForGoLive(): Promise<void> {
  assertNotPreviewSigningCaller();
  const v = await validateVendorIcpCertificate();
  if (!v.ok) {
    const err = new Error(v.blockers.join('; '));
    (err as Error & { code: string; blockers: string[] }).code = 'REP_P_VENDOR_NOT_READY';
    (err as Error & { blockers: string[] }).blockers = v.blockers;
    throw err;
  }
}
