/**
 * Quick sign test against deployed repPSigningService (requires gcloud SA impersonation).
 */
import { buildAfd } from '../../src/lib/time-clock/afd';
import { execFileSync } from 'child_process';

const URL =
  process.env.PUNCTO_SIGNING_SERVICE_URL ||
  'https://reppsigningservice-jlqqtm27vq-rj.a.run.app';
const RUNTIME_SA = 'puncto-vercel-runtime@puncto-7b776.iam.gserviceaccount.com';
const gcloud =
  process.env.GCLOUD_PATH ||
  `${process.env.LOCALAPPDATA}/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd`;

function idToken(): string {
  return execFileSync(
    gcloud,
    [
      'auth',
      'print-identity-token',
      `--impersonate-service-account=${RUNTIME_SA}`,
      `--audiences=${URL}`,
      '--quiet',
    ],
    { encoding: 'utf8' }
  ).trim();
}

async function main() {
  const afd = buildAfd({
    employerTaxId: '12.345.678/0001-95',
    employerLegalName: 'Empresa Teste LTDA',
    periodStart: new Date('2024-06-01'),
    periodEnd: new Date('2024-06-30'),
    generatedAt: new Date('2024-06-16'),
    inpiId: '12345678901234567',
    manufacturerTaxId: '64571681000120',
    marks: [],
    employerChanges: [],
    employeeChanges: [],
    sensitiveEvents: [],
  });

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operation: 'signAfd',
      contentBase64: Buffer.from(afd, 'latin1').toString('base64'),
      callerEnv: 'homolog',
    }),
  });

  const data = await res.json();
  if (res.ok && data.status === 'signed' && data.p7sBase64) {
    console.log('signAfd OK', {
      signerSubject: data.signerSubject,
      p7sBytes: Buffer.from(data.p7sBase64, 'base64').length,
      correlationId: data.correlationId,
    });
  } else {
    console.error('signAfd FAIL', res.status, data);
    process.exit(1);
  }
}

main();
