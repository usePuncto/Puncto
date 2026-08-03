/**
 * Employer (client) e-CNPJ A1 certificate storage for AEJ signing.
 * Path: businesses/{businessId}/timeClockMeta/employerCertificate
 */

import { db } from '@/lib/firebaseAdmin';
import {
  decryptSecret,
  decryptSecretUtf8,
  encryptSecret,
  type EncryptedBlob,
  hasSecretsKey,
} from '@/lib/crypto/secrets';
import { extractPemFromPfx, inspectPfx } from './pfx';

export type EmployerCertPublicMeta = {
  subjectCN: string;
  subjectRaw: string;
  taxIdFromCert: string | null;
  validFrom: string;
  validTo: string;
  uploadedAt: string;
  uploadedBy: string;
  hasCertificate: true;
};

type EmployerCertDoc = {
  pfxEncrypted: EncryptedBlob;
  passwordEncrypted: EncryptedBlob;
  subjectCN: string;
  subjectRaw: string;
  taxIdFromCert: string | null;
  validFrom: string;
  validTo: string;
  uploadedAt: Date | FirebaseFirestore.Timestamp;
  uploadedBy: string;
};

function certRef(businessId: string) {
  return db
    .collection('businesses')
    .doc(businessId)
    .collection('timeClockMeta')
    .doc('employerCertificate');
}

function toIso(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return '';
}

export async function getEmployerCertMeta(
  businessId: string
): Promise<EmployerCertPublicMeta | { hasCertificate: false }> {
  const snap = await certRef(businessId).get();
  if (!snap.exists) return { hasCertificate: false };
  const data = snap.data() as EmployerCertDoc;
  return {
    hasCertificate: true,
    subjectCN: data.subjectCN,
    subjectRaw: data.subjectRaw,
    taxIdFromCert: data.taxIdFromCert,
    validFrom: data.validFrom,
    validTo: data.validTo,
    uploadedAt: toIso(data.uploadedAt),
    uploadedBy: data.uploadedBy,
  };
}

export async function saveEmployerCertificate(input: {
  businessId: string;
  pfxBuffer: Buffer;
  password: string;
  uploadedBy: string;
}): Promise<EmployerCertPublicMeta> {
  if (!hasSecretsKey()) {
    throw new Error('PUNCTO_SECRETS_ENCRYPTION_KEY não configurada no servidor');
  }

  // Validate PFX + password before storing
  const inspected = inspectPfx(input.pfxBuffer, input.password);
  // Also ensure we can extract PEM (same path used at AEJ sign time)
  extractPemFromPfx(input.pfxBuffer, input.password);

  const now = new Date();
  const doc: EmployerCertDoc = {
    pfxEncrypted: encryptSecret(input.pfxBuffer),
    passwordEncrypted: encryptSecret(input.password),
    subjectCN: inspected.subjectCN,
    subjectRaw: inspected.subjectRaw,
    taxIdFromCert: inspected.taxIdFromCert,
    validFrom: inspected.validFrom,
    validTo: inspected.validTo,
    uploadedAt: now,
    uploadedBy: input.uploadedBy,
  };

  await certRef(input.businessId).set(doc);

  return {
    hasCertificate: true,
    subjectCN: inspected.subjectCN,
    subjectRaw: inspected.subjectRaw,
    taxIdFromCert: inspected.taxIdFromCert,
    validFrom: inspected.validFrom,
    validTo: inspected.validTo,
    uploadedAt: now.toISOString(),
    uploadedBy: input.uploadedBy,
  };
}

export async function deleteEmployerCertificate(businessId: string): Promise<void> {
  await certRef(businessId).delete();
}

/**
 * Decrypt employer PFX + password for AEJ signing.
 * Extracts PEM/key on demand via extractPemFromPfx (caller / signAejCades).
 */
export async function loadEmployerPfxCredentials(businessId: string): Promise<
  | { pfx: Buffer; password: string; meta: EmployerCertPublicMeta }
  | { error: string }
  | null
> {
  const snap = await certRef(businessId).get();
  if (!snap.exists) return null;

  try {
    if (!hasSecretsKey()) {
      return { error: 'PUNCTO_SECRETS_ENCRYPTION_KEY não configurada' };
    }
    const data = snap.data() as EmployerCertDoc;
    const pfx = decryptSecret(data.pfxEncrypted);
    const password = decryptSecretUtf8(data.passwordEncrypted);
    return {
      pfx,
      password,
      meta: {
        hasCertificate: true,
        subjectCN: data.subjectCN,
        subjectRaw: data.subjectRaw,
        taxIdFromCert: data.taxIdFromCert,
        validFrom: data.validFrom,
        validTo: data.validTo,
        uploadedAt: toIso(data.uploadedAt),
        uploadedBy: data.uploadedBy,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha ao descriptografar certificado do empregador',
    };
  }
}

/**
 * Utility: decrypt stored employer PFX and return PEM/KEY for signing pipelines.
 */
export async function extractEmployerPemFromStoredPfx(businessId: string) {
  const creds = await loadEmployerPfxCredentials(businessId);
  if (!creds) {
    throw new Error('Certificado do empregador não cadastrado');
  }
  if ('error' in creds) {
    throw new Error(creds.error);
  }
  const material = extractPemFromPfx(creds.pfx, creds.password);
  return {
    certPem: material.certPem,
    keyPem: material.keyPem,
    meta: creds.meta,
  };
}
