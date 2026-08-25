/**
 * Puncto Signing Service — PRIVATE Cloud Function (REP-P ICP-Brasil only).
 *
 * Auth: IAM only (invoker: private) — Vercel WIF → puncto-vercel-runtime → ID token
 * Secrets: defineSecret() bindings (REP_P_VENDOR_PFX, REP_P_VENDOR_PFX_PASSWORD)
 *
 * Operations:
 *   signAfd | signAej | signRepPReceipt | validateVendorCert (read-only, no generic sign)
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import {
  executeSignOperation,
  validateVendorCertificateInternal,
  type SignResponse,
} from '../lib/signing/repPSignerCore';
import { bindVendorPfxSecrets } from '../lib/signing/vendorPfx';
import { logSigningAudit, newCorrelationId } from '../lib/signing/audit';

export const repPVendorPfx = defineSecret('REP_P_VENDOR_PFX');
export const repPVendorPfxPassword = defineSecret('REP_P_VENDOR_PFX_PASSWORD');
const vendorCnpj = defineString('PUNCTO_VENDOR_CNPJ', { default: '' });
const signingEnv = defineString('PUNCTO_SIGNING_ENV', { default: 'production' });

const SIGNER_SA = 'puncto-repp-signer@puncto-7b776.iam.gserviceaccount.com';

const ALLOWED_OPS = new Set([
  'signAfd',
  'signAej',
  'signRepPReceipt',
  'validateVendorCert',
]);

type RequestBody = {
  operation: string;
  correlationId?: string;
  establishmentId?: string;
  contentBase64?: string;
  callerEnv?: string;
  padesOptions?: {
    reason?: string;
    contactInfo?: string;
    name?: string;
    location?: string;
  };
};

export const repPSigningService = onRequest(
  {
    region: 'southamerica-east1',
    invoker: 'private',
    timeoutSeconds: 120,
    memory: '512MiB',
    serviceAccount: SIGNER_SA,
    secrets: [repPVendorPfx, repPVendorPfxPassword],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // IAM auth is enforced by Cloud Run (invoker: private) — no shared secret header
    bindVendorPfxSecrets(
      () => repPVendorPfx.value(),
      () => repPVendorPfxPassword.value()
    );
    process.env.PUNCTO_VENDOR_CNPJ = vendorCnpj.value();

    const body = req.body as RequestBody;
    if (!body?.operation || !ALLOWED_OPS.has(body.operation)) {
      res.status(400).json({ error: 'Operação inválida ou não permitida' });
      return;
    }

    if (signingEnv.value() !== 'production') {
      res.status(403).json({ error: 'Signing Service não está em modo production' });
      return;
    }

    const correlationId = body.correlationId || newCorrelationId();
    const establishmentId = body.establishmentId || null;
    const callerEnv = body.callerEnv || 'unknown';

    if (body.operation === 'validateVendorCert') {
      const validation = await validateVendorCertificateInternal();
      logSigningAudit({
        correlationId,
        operation: 'validateVendorCert',
        establishmentId,
        contentSha256: null,
        certVersion: validation.certVersion,
        result: validation.ok ? 'validated' : 'failed',
        reason: validation.ok ? undefined : validation.blockers.join('; '),
        timestamp: new Date().toISOString(),
        callerEnv,
      });
      res.status(validation.ok ? 200 : 422).json({ correlationId, ...validation });
      return;
    }

    if (!body.contentBase64) {
      res.status(400).json({ error: 'contentBase64 obrigatório para assinatura' });
      return;
    }

    const content = Buffer.from(body.contentBase64, 'base64');
    const maxBytes = body.operation === 'signRepPReceipt' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (content.length > maxBytes) {
      res.status(413).json({ error: 'Conteúdo excede limite permitido para a operação' });
      return;
    }

    const result: SignResponse = await executeSignOperation({
      operation: body.operation as 'signAfd' | 'signAej' | 'signRepPReceipt',
      content,
      establishmentId,
      correlationId,
      callerEnv,
      padesOptions: body.padesOptions,
    });

    res.status(result.status === 'signed' ? 200 : 422).json(result);
  }
);
