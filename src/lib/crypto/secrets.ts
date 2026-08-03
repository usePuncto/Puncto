/**
 * AES-256-GCM helpers for encrypting employer PFX passwords / blobs at rest.
 * Key: PUNCTO_SECRETS_ENCRYPTION_KEY (64 hex chars = 32 bytes) in env.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export type EncryptedBlob = {
  v: 1;
  alg: 'aes-256-gcm';
  iv: string; // base64
  tag: string; // base64
  ciphertext: string; // base64
};

function getKey(): Buffer {
  const raw = process.env.PUNCTO_SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'PUNCTO_SECRETS_ENCRYPTION_KEY não configurada (64 hex chars). Necessária para armazenar certificado do empregador.'
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  // Derive stable 32-byte key from arbitrary secret string
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plaintext: Buffer | string): EncryptedBlob {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptSecret(blob: EncryptedBlob): Buffer {
  const key = getKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, 'base64')),
    decipher.final(),
  ]);
}

export function decryptSecretUtf8(blob: EncryptedBlob): string {
  return decryptSecret(blob).toString('utf8');
}

export function hasSecretsKey(): boolean {
  return Boolean(process.env.PUNCTO_SECRETS_ENCRYPTION_KEY);
}
