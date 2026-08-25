/**
 * Homologação REP-P Signing (WIF + IAM + validateVendorCert).
 * Não imprime secrets. Requer gcloud autenticado.
 *
 * Usage:
 *   npx tsx scripts/gcp/homolog-rep-p-signing.ts
 */

const PROJECT_ID = 'puncto-7b776';
const REGION = 'southamerica-east1';
const SIGNING_URL =
  process.env.PUNCTO_SIGNING_SERVICE_URL ||
  'https://southamerica-east1-puncto-7b776.cloudfunctions.net/repPSigningService';
const RUNTIME_SA = `puncto-vercel-runtime@${PROJECT_ID}.iam.gserviceaccount.com`;
const SIGNER_SA = `puncto-repp-signer@${PROJECT_ID}.iam.gserviceaccount.com`;
const VENDOR_CNPJ = '64571681000120';

type TestRow = { test: string; result: string };

const results: TestRow[] = [];

function pass(test: string, detail = 'OK') {
  results.push({ test, result: `PASS — ${detail}` });
}

function fail(test: string, detail: string) {
  results.push({ test, result: `FAIL — ${detail}` });
}

function skip(test: string, detail: string) {
  results.push({ test, result: `SKIP — ${detail}` });
}

async function gcloudJson(args: string[]): Promise<unknown> {
  const { execFileSync } = await import('child_process');
  const gcloud =
    process.env.GCLOUD_PATH ||
    `${process.env.LOCALAPPDATA}/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd`;
  const out = execFileSync(gcloud, [...args, '--format=json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out || 'null');
}

async function getIdToken(audience: string): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getIdTokenClient(audience);
  const headers = await client.getRequestHeaders(audience);
  const authHeader = headers.Authorization || headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Falha ao obter ID token');
  }
  return authHeader.slice('Bearer '.length);
}

async function main() {
  console.log('REP-P Signing homologation\n');

  // 1. Chamada sem IAM → 401/403
  try {
    const res = await fetch(SIGNING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'validateVendorCert' }),
    });
    if (res.status === 401 || res.status === 403) {
      pass('Chamada sem IAM recebe 401/403', `HTTP ${res.status}`);
    } else {
      fail('Chamada sem IAM recebe 401/403', `HTTP ${res.status}`);
    }
  } catch (e) {
    fail('Chamada sem IAM recebe 401/403', e instanceof Error ? e.message : 'erro');
  }

  // 2. Signer SA pode invocar (simula runtime com user creds + impersonation check via deploy SA)
  try {
    const token = await getIdToken(SIGNING_URL);
    const res = await fetch(SIGNING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation: 'validateVendorCert', callerEnv: 'homolog-script' }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      blockers?: string[];
      certMeta?: { taxIdFromCert?: string | null; validTo?: string };
    };
    if (res.status === 200 && body.ok) {
      pass('validateVendorCert funciona', 'certificado válido');
      const certCnpj = (body.certMeta?.taxIdFromCert || '').replace(/\D/g, '');
      if (certCnpj === VENDOR_CNPJ) {
        pass('Certificado pertence ao CNPJ configurado', VENDOR_CNPJ);
      } else {
        fail(
          'Certificado pertence ao CNPJ configurado',
          `cert=${certCnpj || 'n/a'} expected=${VENDOR_CNPJ}`
        );
      }
      if (body.certMeta?.validTo && new Date(body.certMeta.validTo) > new Date()) {
        pass('Certificado está válido', `até ${body.certMeta.validTo}`);
      } else {
        fail('Certificado está válido', body.certMeta?.validTo || 'sem validTo');
      }
    } else if (res.status === 422) {
      fail('validateVendorCert funciona', body.blockers?.join('; ') || `HTTP ${res.status}`);
      fail('Certificado pertence ao CNPJ configurado', 'validação falhou');
      fail('Certificado está válido', 'validação falhou');
    } else {
      fail('validateVendorCert funciona', `HTTP ${res.status}`);
    }
  } catch (e) {
    fail('validateVendorCert funciona', e instanceof Error ? e.message : 'erro');
  }

  // 3. IAM: signer tem secretAccessor, runtime não
  try {
    const pfxPolicy = (await gcloudJson([
      'secrets',
      'get-iam-policy',
      'REP_P_VENDOR_PFX',
      '--project',
      PROJECT_ID,
    ])) as { bindings?: Array<{ role: string; members: string[] }> };
    const accessors =
      pfxPolicy.bindings
        ?.filter((b) => b.role.includes('secretAccessor'))
        .flatMap((b) => b.members) || [];
    if (accessors.some((m) => m.includes(SIGNER_SA))) {
      pass('Signer consegue acessar PFX (secretAccessor)', SIGNER_SA);
    } else {
      fail('Signer consegue acessar PFX (secretAccessor)', 'binding ausente');
    }
    if (accessors.some((m) => m.includes(RUNTIME_SA))) {
      fail('Caller não consegue acessar PFX', 'runtime SA tem secretAccessor');
    } else {
      pass('Caller não consegue acessar PFX', 'runtime SA sem secretAccessor');
    }
  } catch (e) {
    skip('Signer consegue acessar PFX (secretAccessor)', e instanceof Error ? e.message : 'gcloud');
    skip('Caller não consegue acessar PFX', 'gcloud indisponível');
  }

  // 4. run.invoker só no runtime SA
  try {
    const services = (await gcloudJson([
      'run',
      'services',
      'list',
      '--project',
      PROJECT_ID,
      '--region',
      REGION,
    ])) as Array<{ metadata: { name: string } }>;
    const signingSvc = services.find((s) =>
      s.metadata.name.toLowerCase().includes('reppsigning')
    );
    if (!signingSvc) {
      skip('Vercel Production consegue invocar (IAM run.invoker)', 'serviço Cloud Run não listado');
    } else {
      const policy = (await gcloudJson([
        'run',
        'services',
        'get-iam-policy',
        signingSvc.metadata.name,
        '--project',
        PROJECT_ID,
        '--region',
        REGION,
      ])) as { bindings?: Array<{ role: string; members: string[] }> };
      const invokers =
        policy.bindings
          ?.filter((b) => b.role === 'roles/run.invoker')
          .flatMap((b) => b.members) || [];
      if (invokers.some((m) => m.includes(RUNTIME_SA))) {
        pass('IAM run.invoker concedido ao runtime SA', RUNTIME_SA);
      } else {
        fail('IAM run.invoker concedido ao runtime SA', 'binding ausente — aplicar manualmente');
      }
    }
  } catch (e) {
    skip('IAM run.invoker', e instanceof Error ? e.message : 'gcloud');
  }

  skip(
    'Vercel Production consegue invocar',
    'requer OIDC habilitado + env WIF na Vercel Production (teste pós-deploy Vercel)'
  );
  skip(
    'Vercel Preview não consegue',
    'requer deploy Preview + WIF attribute-condition production (teste pós-deploy Vercel)'
  );

  console.log('\n| Teste | Resultado |');
  console.log('|-------|-----------|');
  for (const r of results) {
    console.log(`| ${r.test} | ${r.result} |`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
