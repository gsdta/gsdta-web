# Setup Firebase Secrets in GCP Secret Manager and grant Cloud Run access
# Usage examples:
#   ./setup-firebase-secrets.ps1 -ProjectId "playground-personal-474821" -Region "us-central1" -ServiceName "gsdta-web"
#   ./setup-firebase-secrets.ps1 -ProjectId "playground-personal-474821" -Region "us-central1" -ServiceName "gsdta-web" -GrantOnly
#   ./setup-firebase-secrets.ps1 -ProjectId "..." -NonInteractive -FirebaseApiKey "..." -FirebaseAppId "..."

param(
  [Parameter(Mandatory=$false)] [string]$ProjectId = "playground-personal-474821",
  [Parameter(Mandatory=$false)] [string]$Region = "us-central1",
  [Parameter(Mandatory=$false)] [string]$ServiceName = "gsdta-web",
  [Parameter(Mandatory=$false)] [switch]$GrantOnly,
  [Parameter(Mandatory=$false)] [switch]$NonInteractive,
  [Parameter(Mandatory=$false)] [string]$FirebaseApiKey,
  [Parameter(Mandatory=$false)] [string]$FirebaseAppId,
  [Parameter(Mandatory=$false)] [string]$FirebaseAuthDomain,
  [Parameter(Mandatory=$false)] [string]$FirebaseProjectId
)

function Write-TempNoNewline($value) {
  $f = New-TemporaryFile
  Set-Content -Path $f -Value $value -NoNewline
  return $f
}

function Ensure-Secret($name, $value, $projectId) {
  $file = Write-TempNoNewline $value
  try {
    gcloud secrets create $name --data-file=$file --project=$projectId | Out-Null
    Write-Host "✓ Created secret $name" -ForegroundColor Green
  } catch {
    Write-Host "! Secret $name may already exist. Adding new version..." -ForegroundColor Yellow
    gcloud secrets versions add $name --data-file=$file --project=$projectId | Out-Null
    Write-Host "✓ Added new version to secret $name" -ForegroundColor Green
  } finally {
    Remove-Item $file -Force -ErrorAction SilentlyContinue
  }
}

function Get-RuntimeServiceAccount($serviceName, $region, $projectId) {
  $sa = gcloud run services describe $serviceName `
    --region $region `
    --format="value(spec.template.spec.serviceAccountName)"

  if ([string]::IsNullOrWhiteSpace($sa)) {
    $projectNumber = gcloud projects describe $projectId --format="value(projectNumber)"
    $sa = "$projectNumber-compute@developer.gserviceaccount.com"
  }
  return $sa
}

function Grant-SecretAccess($serviceAccount, $projectId, $secretNames) {
  foreach ($name in $secretNames) {
    gcloud secrets add-iam-policy-binding $name `
      --member="serviceAccount:$serviceAccount" `
      --role="roles/secretmanager.secretAccessor" `
      --project=$projectId | Out-Null
    Write-Host "✓ Granted secretAccessor on $name to $serviceAccount" -ForegroundColor Green
  }
}

Write-Host "Configuring Firebase secrets and access for project: $ProjectId" -ForegroundColor Cyan

$secrets = @(
  @{ Name = 'FIREBASE_API_KEY';      Value = $FirebaseApiKey },
  @{ Name = 'FIREBASE_AUTH_DOMAIN';  Value = ($FirebaseAuthDomain ? $FirebaseAuthDomain : "$ProjectId.firebaseapp.com") },
  @{ Name = 'FIREBASE_PROJECT_ID';   Value = ($FirebaseProjectId  ? $FirebaseProjectId  : $ProjectId) },
  @{ Name = 'FIREBASE_APP_ID';       Value = $FirebaseAppId }
)

if (-not $GrantOnly) {
  if (-not $NonInteractive) {
    if (-not $FirebaseApiKey) { $FirebaseApiKey = Read-Host "Firebase API Key" }
    if (-not $FirebaseAppId)  { $FirebaseAppId  = Read-Host "Firebase App ID" }
    # Rebuild secrets hashtable with collected values
    $secrets = @(
      @{ Name = 'FIREBASE_API_KEY';      Value = $FirebaseApiKey },
      @{ Name = 'FIREBASE_AUTH_DOMAIN';  Value = ($FirebaseAuthDomain ? $FirebaseAuthDomain : "$ProjectId.firebaseapp.com") },
      @{ Name = 'FIREBASE_PROJECT_ID';   Value = ($FirebaseProjectId  ? $FirebaseProjectId  : $ProjectId) },
      @{ Name = 'FIREBASE_APP_ID';       Value = $FirebaseAppId }
    )
  } else {
    if (-not $FirebaseApiKey -or -not $FirebaseAppId) {
      throw "NonInteractive mode requires -FirebaseApiKey and -FirebaseAppId."
    }
  }

  Write-Host "Creating or updating secrets in Secret Manager..." -ForegroundColor Cyan
  foreach ($s in $secrets) {
    if ($null -ne $s.Value -and $s.Value -ne '') {
      Ensure-Secret -name $s.Name -value $s.Value -projectId $ProjectId
    } else {
      Write-Host "! Skipping $($s.Name) because no value was provided." -ForegroundColor Yellow
    }
  }
}

Write-Host "Resolving Cloud Run runtime service account..." -ForegroundColor Cyan
$runtimeSA = Get-RuntimeServiceAccount -serviceName $ServiceName -region $Region -projectId $ProjectId
Write-Host "Runtime Service Account: $runtimeSA" -ForegroundColor Yellow

Write-Host "Granting Secret Manager access to runtime service account..." -ForegroundColor Cyan
Grant-SecretAccess -serviceAccount $runtimeSA -projectId $ProjectId -secretNames @('FIREBASE_API_KEY','FIREBASE_AUTH_DOMAIN','FIREBASE_PROJECT_ID','FIREBASE_APP_ID')

Write-Host ""
Write-Host "✓ Done." -ForegroundColor Green
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "- Push to main to trigger deployment, or run the deploy workflow manually."
Write-Host "- Verify secret bindings: gcloud secrets get-iam-policy FIREBASE_API_KEY --project=$ProjectId"
