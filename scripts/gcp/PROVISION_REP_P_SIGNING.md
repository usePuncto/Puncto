# Provision REP-P Signing (GCP + Vercel WIF)

Execute once per project. **Do not commit secrets or PFX files.**

## 1. Variables

```powershell
$PROJECT_ID = "puncto-7b776"
$PROJECT_NUMBER = "814647761022"
$REGION = "southamerica-east1"
$VERCEL_TEAM = "punctos-projects"
$VERCEL_PROJECT_ID = "prj_FSEifrtJP3AuhmmoVexm43nCuFYJ"
$POOL_ID = "vercel-puncto"
$PROVIDER_ID = "vercel-oidc"
$RUNTIME_SA = "puncto-vercel-runtime@$PROJECT_ID.iam.gserviceaccount.com"
$SIGNER_SA = "puncto-repp-signer@$PROJECT_ID.iam.gserviceaccount.com"
```

## 2. Workload Identity Pool + OIDC provider

```powershell
gcloud iam workload-identity-pools create $POOL_ID `
  --project=$PROJECT_ID --location=global `
  --display-name="Vercel Puncto"

gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID `
  --project=$PROJECT_ID --location=global `
  --workload-identity-pool=$POOL_ID `
  --display-name="Vercel OIDC" `
  --issuer-uri="https://oidc.vercel.com/$VERCEL_TEAM" `
  --allowed-audiences="https://vercel.com/$VERCEL_TEAM" `
  --attribute-mapping="google.subject=assertion.sub,attribute.project_id=assertion.project_id,attribute.environment=assertion.environment" `
  --attribute-condition="assertion.environment=='production'"
```

## 3. Service accounts

```powershell
gcloud iam service-accounts create puncto-vercel-runtime `
  --project=$PROJECT_ID --display-name="Vercel Production runtime (WIF)"

gcloud iam service-accounts create puncto-repp-signer `
  --project=$PROJECT_ID --display-name="REP-P ICP signing service only"
```

## 4. WIF → puncto-vercel-runtime (Production + project only)

```powershell
$MEMBER = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.environment/production"

gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA `
  --project=$PROJECT_ID `
  --role="roles/iam.workloadIdentityUser" `
  --member=$MEMBER
```

Optional tighter binding (recommended — project_id + production via provider attribute-condition):
```powershell
$MEMBER_PROJ = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.project_id/$VERCEL_PROJECT_ID"
gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA `
  --project=$PROJECT_ID `
  --role="roles/iam.workloadIdentityUser" `
  --member=$MEMBER_PROJ
```

Provider attribute-condition (already set):
`assertion.environment=='production' && assertion.project_id=='prj_FSEifrtJP3AuhmmoVexm43nCuFYJ'`

## 5. Secret Manager (PFX — upload as **base64**, never raw binary in Firebase CLI)

```powershell
# PFX must be stored base64-encoded (defineSecret reads string; binary corrupts via text paths)
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("vendor.pfx"))
$tmp = New-TemporaryFile
[IO.File]::WriteAllText($tmp, $b64)
gcloud secrets versions add REP_P_VENDOR_PFX --project=$PROJECT_ID --data-file=$tmp
Remove-Item $tmp -Force

# Password (plain text, single line):
# echo -n "password" | gcloud secrets versions add REP_P_VENDOR_PFX_PASSWORD --data-file=-

gcloud secrets add-iam-policy-binding REP_P_VENDOR_PFX `
  --project=$PROJECT_ID `
  --member="serviceAccount:$SIGNER_SA" `
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding REP_P_VENDOR_PFX_PASSWORD `
  --project=$PROJECT_ID `
  --member="serviceAccount:$SIGNER_SA" `
  --role="roles/secretmanager.secretAccessor"
```

## 6. Deploy Signing Service + grant run.invoker

```powershell
cd punctoFunctions
# Password only via firebase CLI; PFX via GSM base64 (section 5)
firebase functions:secrets:set REP_P_VENDOR_PFX_PASSWORD
cd ..
firebase deploy --only functions:puncto:repPSigningService --force

# IMPORTANT: firebase deploy resets Cloud Run IAM — re-apply run.invoker every deploy:
gcloud run services add-iam-policy-binding reppsigningservice `
  --project=$PROJECT_ID --region=$REGION `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/run.invoker"
```

## 7. Vercel Production env (no JSON keys)

| Variable | Value |
|----------|-------|
| `GCP_PROJECT_NUMBER` | project number |
| `GCP_WORKLOAD_IDENTITY_POOL_ID` | `vercel-puncto` |
| `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `vercel-oidc` |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `puncto-vercel-runtime@…` |
| `PUNCTO_SIGNING_SERVICE_URL` | Cloud Run URL (ex: `https://reppsigningservice-….a.run.app`) |
| `PUNCTO_VENDOR_CNPJ` | `64571681000120` |

Enable OIDC on Vercel project (Settings → Security).

**Do NOT set** `REP_P_SIGNING_INTERNAL_SECRET`, `GOOGLE_APPLICATION_CREDENTIALS`, or GSM paths on Vercel.

## 8. Cloud Audit Logs (Secret Manager)

Enable Data Access logs for Secret Manager in GCP Console → IAM & Admin → Audit Logs → Secret Manager → Read.

## 9. Operations reference

| Operação | Input | Output | Chave privada? |
|----------|-------|--------|----------------|
| `signAfd` | AFD 004 latin1 base64 | p7s base64 | Sim |
| `signAej` | AEJ pipe base64 | p7s base64 | Sim |
| `signRepPReceipt` | PDF base64 | signed PDF base64 | Sim |
| `validateVendorCert` | (none) | cert meta + ok/blockers | Sim (probe only, read-only) |
