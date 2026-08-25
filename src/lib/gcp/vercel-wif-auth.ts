/**
 * Vercel Production → GCP via Workload Identity Federation (OIDC).
 * No JSON keys, no FIREBASE_ADMIN as generic GCP identity.
 */

import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';

export function isVercelWifConfigured(): boolean {
  return Boolean(
    process.env.GCP_PROJECT_NUMBER &&
      process.env.GCP_WORKLOAD_IDENTITY_POOL_ID &&
      process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID &&
      process.env.GCP_SERVICE_ACCOUNT_EMAIL
  );
}

function buildExternalAccountConfig() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER!;
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID!;
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID!;
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL!;

  return {
    type: 'external_account' as const,
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: getVercelOidcToken,
    },
  };
}

export async function requestWithVercelWif<T>(
  targetUrl: string,
  body: Record<string, unknown>
): Promise<T> {
  if (process.env.VERCEL_ENV !== 'production') {
    throw new Error(
      'WIF OIDC só permitido em VERCEL_ENV=production (Preview/Development bloqueados)'
    );
  }

  if (!isVercelWifConfigured()) {
    throw new Error(
      'GCP WIF não configurado (GCP_PROJECT_NUMBER, POOL_ID, PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL)'
    );
  }

  const external = ExternalAccountClient.fromJSON(buildExternalAccountConfig());
  if (!external) {
    throw new Error('Falha ao criar ExternalAccountClient (WIF)');
  }

  const idClient = await (
    external as unknown as {
      getIdTokenClient: (target: string) => Promise<{
        request: <R>(opts: {
          url: string;
          method: string;
          data: Record<string, unknown>;
        }) => Promise<{ data: R }>;
      }>;
    }
  ).getIdTokenClient(targetUrl);
  const res = await idClient.request<T>({
    url: targetUrl,
    method: 'POST',
    data: { ...body, callerEnv: 'production' },
  });
  return res.data;
}
