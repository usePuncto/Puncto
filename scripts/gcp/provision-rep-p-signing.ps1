# Provision REP-P Signing stack (OIDC/WIF + private signer)
# Run once. Does NOT print secret values.
param(
  [string]$ProjectId = "puncto-7b776",
  [string]$ProjectNumber = "814647761022",
  [string]$Region = "southamerica-east1",
  [string]$VercelTeam = "punctos-projects",
  [string]$VercelProjectId = "",
  [string]$PfxFile = "",
  [string]$PfxPassword = ""
)

$ErrorActionPreference = "Continue"
$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloud)) {
  $gcloud = "gcloud"
}

$PoolId = "vercel-puncto"
$ProviderId = "vercel-oidc"
$RuntimeSa = "puncto-vercel-runtime@$ProjectId.iam.gserviceaccount.com"
$SignerSa = "puncto-repp-signer@$ProjectId.iam.gserviceaccount.com"

Write-Host "== Enabling APIs =="
& $gcloud services enable secretmanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com run.googleapis.com cloudfunctions.googleapis.com iam.googleapis.com --project=$ProjectId --quiet

Write-Host "== Service accounts =="
foreach ($sa in @("puncto-vercel-runtime", "puncto-repp-signer")) {
  $exists = & $gcloud iam service-accounts list --project=$ProjectId --filter="email:$sa@$ProjectId.iam.gserviceaccount.com" --format="value(email)" 2>$null
  if (-not $exists) {
    & $gcloud iam service-accounts create $sa --project=$ProjectId --display-name=$sa
    Write-Host "Created $sa"
  } else {
    Write-Host "Exists $sa"
  }
}

Write-Host "== Workload Identity Pool =="
$poolExists = $null
try {
  $poolExists = & $gcloud iam workload-identity-pools describe $PoolId --project=$ProjectId --location=global --format="value(name)" 2>$null
} catch { }
if (-not $poolExists) {
  & $gcloud iam workload-identity-pools create $PoolId `
    --project=$ProjectId --location=global `
    --display-name="Vercel Puncto"
}

$attrCondition = "assertion.environment=='production'"
if ($VercelProjectId) {
  $attrCondition = "assertion.environment=='production' && assertion.project_id=='$VercelProjectId'"
}

Write-Host "== WIF OIDC provider (condition: $attrCondition) =="
$provExists = $null
try {
  $provExists = & $gcloud iam workload-identity-pools providers describe $ProviderId `
    --project=$ProjectId --location=global --workload-identity-pool=$PoolId --format="value(name)" 2>$null
} catch { }
if (-not $provExists) {
  & $gcloud iam workload-identity-pools providers create-oidc $ProviderId `
    --project=$ProjectId --location=global `
    --workload-identity-pool=$PoolId `
    --display-name="Vercel OIDC" `
    --issuer-uri="https://oidc.vercel.com/$VercelTeam" `
    --allowed-audiences="https://vercel.com/$VercelTeam" `
    --attribute-mapping="google.subject=assertion.sub,attribute.project_id=assertion.project_id,attribute.environment=assertion.environment" `
    --attribute-condition=$attrCondition
} else {
  & $gcloud iam workload-identity-pools providers update-oidc $ProviderId `
    --project=$ProjectId --location=global `
    --workload-identity-pool=$PoolId `
    --attribute-condition=$attrCondition
}

Write-Host "== WIF principal -> puncto-vercel-runtime =="
if ($VercelProjectId) {
  $member = "principalSet://iam.googleapis.com/projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId/attribute.project_id/$VercelProjectId"
} else {
  $member = "principalSet://iam.googleapis.com/projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId/attribute.environment/production"
}
& $gcloud iam service-accounts add-iam-policy-binding $RuntimeSa `
  --project=$ProjectId `
  --role="roles/iam.workloadIdentityUser" `
  --member=$member 2>$null | Out-Null
Write-Host "Bound workloadIdentityUser: $member"

Write-Host "== Secret Manager secrets =="
foreach ($secret in @("REP_P_VENDOR_PFX", "REP_P_VENDOR_PFX_PASSWORD")) {
  $s = $null
  try {
    $s = & $gcloud secrets describe $secret --project=$ProjectId --format="value(name)" 2>$null
  } catch { }
  if (-not $s) {
    & $gcloud secrets create $secret --project=$ProjectId --replication-policy=automatic
    Write-Host "Created secret $secret"
  }
  & $gcloud secrets add-iam-policy-binding $secret `
    --project=$ProjectId `
    --member="serviceAccount:$SignerSa" `
    --role="roles/secretmanager.secretAccessor" 2>$null | Out-Null
}

if ($PfxFile -and (Test-Path $PfxFile)) {
  Write-Host "== Uploading PFX as base64 (no output) =="
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($PfxFile))
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmp, $b64, [System.Text.UTF8Encoding]::new($false))
    & $gcloud secrets versions add REP_P_VENDOR_PFX --project=$ProjectId --data-file=$tmp | Out-Null
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}
if ($PfxPassword) {
  Write-Host "== Uploading PFX password (no output) =="
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmp, $PfxPassword, [System.Text.UTF8Encoding]::new($false))
    & $gcloud secrets versions add REP_P_VENDOR_PFX_PASSWORD --project=$ProjectId --data-file=$tmp | Out-Null
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "== Firebase secret bindings (skip binary PFX — GSM base64 version is source of truth) =="
Push-Location (Join-Path $PSScriptRoot "..\..\punctoFunctions")
if ($PfxPassword) {
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmp, $PfxPassword, [System.Text.UTF8Encoding]::new($false))
    Get-Content $tmp -Raw | firebase functions:secrets:set REP_P_VENDOR_PFX_PASSWORD --data-file=- 2>&1 | Out-Null
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
}
Pop-Location

Write-Host "== Deploy repPSigningService =="
Push-Location (Join-Path $PSScriptRoot "..\..")
firebase deploy --only functions:puncto:repPSigningService --force 2>&1
Pop-Location

Write-Host "== run.invoker for puncto-vercel-runtime (re-apply after every deploy) =="
$serviceName = "reppsigningservice"
& $gcloud run services add-iam-policy-binding $serviceName `
  --project=$ProjectId --region=$Region `
  --member="serviceAccount:$RuntimeSa" `
  --role="roles/run.invoker" 2>&1

$runUrl = & $gcloud run services describe $serviceName --project=$ProjectId --region=$Region --format="value(status.url)" 2>$null
Write-Host "SIGNING_SERVICE_URL=$runUrl"
Write-Host "Done."
