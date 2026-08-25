# ICP-Brasil — Puncto Signing Service (privado)

## Fluxo Production

```
Vercel Production (OIDC token automático)
  → GCP Workload Identity Federation (pool vercel-puncto)
  → puncto-vercel-runtime@puncto-7b776.iam.gserviceaccount.com
  → Google-signed ID token (audience = repPSigningService URL)
  → repPSigningService (invoker: private, IAM only)
  → puncto-repp-signer@… (defineSecret: REP_P_VENDOR_PFX + PASSWORD)
  → assina in-process — PFX/senha NUNCA saem do serviço
```

**Sem** JSON key, **sem** `GOOGLE_APPLICATION_CREDENTIALS`, **sem** `REP_P_SIGNING_INTERNAL_SECRET`.

## Autenticação vs autorização

| Camada | Mecanismo |
|--------|-----------|
| Autenticação | Vercel OIDC → WIF → SA impersonation → ID token IAM |
| Autorização semântica | Document gate por operação (AFD/AEJ/PDF) |
| Rastreabilidade | Cloud Logging `audit: rep_p_signing` |

## Operações

| Operação | Input permitido | Output | Utiliza chave privada? |
|----------|-----------------|--------|------------------------|
| `signAfd` | AFD layout 004 validado | CAdES `.p7s` (base64) | **Sim** |
| `signAej` | AEJ pipe `01\|`… | CAdES `.p7s` (base64) | **Sim** |
| `signRepPReceipt` | PDF `%PDF-` | PAdES PDF (base64) | **Sim** |
| `validateVendorCert` | _(nenhum conteúdo)_ | metadados cert + ok/blockers | **Sim** (probe PKCS#7; somente leitura, sem assinatura arbitrária) |

A 4ª operação é **`validateVendorCert`**: validação/go-live, não oracle genérico.

## Separação de ambientes

| Ambiente | WIF assume SA? | Signer prod? | Cert real? |
|----------|----------------|--------------|------------|
| Vercel **Production** | Sim (condition `environment=production`) | Sim | Via GSM no signer |
| Vercel **Preview** | **Não** (WIF condition) | **Não** | **Não** |
| **Development** | **Não** | **Não** | PFX teste local opcional |

## Service accounts

| SA | Papel |
|----|-------|
| `puncto-vercel-runtime@…` | `roles/run.invoker` **somente** em `repPSigningService` |
| `puncto-repp-signer@…` | Runtime do signer; `secretAccessor` **somente** em `REP_P_VENDOR_PFX*` |

## Secrets

Vinculados via Firebase `defineSecret()` — **não** `.env`, Firestore, ou Vercel.

Provision: `scripts/gcp/PROVISION_REP_P_SIGNING.md`

## Go-live

- `PUNCTO_VENDOR_CNPJ=64571681000120` (Production — configurado Vercel + signer)
- `PUNCTO_AFD_INPI_ID` — **BLOCKED** até registro real (≠ zeros)
- Assinatura falha em Production → 422 (sem fallback unsigned)

## Pós-deploy obrigatório

`firebase deploy` **reseta** IAM do Cloud Run subjacente. Reaplicar após cada deploy do signer:

```powershell
gcloud run services add-iam-policy-binding reppsigningservice `
  --project=puncto-7b776 --region=southamerica-east1 `
  --member="serviceAccount:puncto-vercel-runtime@puncto-7b776.iam.gserviceaccount.com" `
  --role="roles/run.invoker"
```

## GSM audit

Habilitar Data Access logs: `AccessSecretVersion` — identidade, secret, timestamp, operação; **sem** payload.
