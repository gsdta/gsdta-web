# Setting Environment Variables in Cloud Run (CI/CD Method)

This guide shows exactly how your environment variables and secrets are configured when deploying to Cloud Run via GitHub Actions. We keep this single, clean method and remove all others.

What this sets for you at deploy time:
- Env vars (public + server):
  - NEXT_TELEMETRY_DISABLED=1
  - NODE_ENV=production
  - NEXT_PUBLIC_AUTH_MODE=firebase
  - NEXT_PUBLIC_API_BASE_URL=/api
  - GOOGLE_CLOUD_PROJECT=playground-personal-474821
  - NEXT_PUBLIC_USE_MSW=false
  - USE_GO_API=false
- Secrets (injected as env vars):
  - NEXT_PUBLIC_FIREBASE_API_KEY ← Secret Manager: FIREBASE_API_KEY:latest
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ← Secret Manager: FIREBASE_AUTH_DOMAIN:latest
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID ← Secret Manager: FIREBASE_PROJECT_ID:latest
  - NEXT_PUBLIC_FIREBASE_APP_ID ← Secret Manager: FIREBASE_APP_ID:latest

Notes:
- Any env var used by the browser must be prefixed with NEXT_PUBLIC_.
- Secrets are read by Cloud Run at runtime from Secret Manager. Make sure the runtime service account has access.

---

## Step 0 — Prerequisites (one-time)
- GCP project: playground-personal-474821
- You can run PowerShell locally with gcloud installed and authenticated
- Secret Manager API enabled

PowerShell:
```powershell
$PROJECT_ID = "playground-personal-474821"
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
```

---

## Step 1 — Create or update Firebase secrets in Secret Manager
Run once. If a secret already exists, add a new version instead of creating again.

PowerShell:
```powershell
$PROJECT_ID = "playground-personal-474821"

# Create (first-time)
echo "YOUR_FIREBASE_API_KEY" | gcloud secrets create FIREBASE_API_KEY --data-file=- --project=$PROJECT_ID
echo "playground-personal-474821.firebaseapp.com" | gcloud secrets create FIREBASE_AUTH_DOMAIN --data-file=- --project=$PROJECT_ID
echo "playground-personal-474821" | gcloud secrets create FIREBASE_PROJECT_ID --data-file=- --project=$PROJECT_ID
echo "YOUR_FIREBASE_APP_ID" | gcloud secrets create FIREBASE_APP_ID --data-file=- --project=$PROJECT_ID

# If they already exist, add versions instead:
# echo "YOUR_FIREBASE_API_KEY" | gcloud secrets versions add FIREBASE_API_KEY --data-file=- --project=$PROJECT_ID
# echo "playground-personal-474821.firebaseapp.com" | gcloud secrets versions add FIREBASE_AUTH_DOMAIN --data-file=- --project=$PROJECT_ID
# echo "playground-personal-474821" | gcloud secrets versions add FIREBASE_PROJECT_ID --data-file=- --project=$PROJECT_ID
# echo "YOUR_FIREBASE_APP_ID" | gcloud secrets versions add FIREBASE_APP_ID --data-file=- --project=$PROJECT_ID

# Sanity check one of them
gcloud secrets describe FIREBASE_API_KEY --project=$PROJECT_ID
```

Where to get these values:
- In Firebase Console → Project Settings → General → Your apps → Web config snippet.

---

## Step 2 — Grant Secret Manager access to the Cloud Run runtime service account
Cloud Run typically uses the Compute Engine default service account unless you set a custom one. Detect and grant access to the actual runtime identity.

Prefer a script? You can run the helper script instead of the sub-steps below:
```powershell
# Grants access for all four secrets to the runtime SA (auto-detected)
./setup-firebase-secrets.ps1 -ProjectId "playground-personal-474821" -Region "us-central1" -ServiceName "gsdta-web" -GrantOnly
```

### 2.1 — Identify the runtime service account used by your service
```powershell
$PROJECT_ID = "playground-personal-474821"
$SERVICE_NAME = "gsdta-web"
$REGION = "us-central1"

$RuntimeSA = gcloud run services describe $SERVICE_NAME `
  --region $REGION `
  --format="value(spec.template.spec.serviceAccountName)"
```

### 2.2 — Fall back to the Compute Engine default service account if empty
```powershell
if (-not $RuntimeSA) {
  $ProjectNumber = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
  $RuntimeSA = "$ProjectNumber-compute@developer.gserviceaccount.com"
}
Write-Host "Runtime Service Account: $RuntimeSA"
```

### 2.3 — Grant Secret Manager Secret Accessor on each secret
```powershell
$Secrets = @(
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_APP_ID"
)

foreach ($name in $Secrets) {
  gcloud secrets add-iam-policy-binding $name `
    --member="serviceAccount:$RuntimeSA" `
    --role="roles/secretmanager.secretAccessor" `
    --project=$PROJECT_ID
}
```

### 2.4 — Verify IAM policy on one secret
```powershell
gcloud secrets get-iam-policy FIREBASE_API_KEY --project=$PROJECT_ID
```

---

## Step 3 — Add the GitHub secret for CI authentication
The workflow uses a service account key to authenticate to GCP (simple to start; you can switch to Workload Identity later).

- In GitHub → Repository Settings → Secrets and variables → Actions
- New repository secret
  - Name: GCP_SA_KEY
  - Value: paste the full JSON key for your CI service account

Tip: If you don’t have a CI service account yet, create one and grant minimal roles:
- roles/artifactregistry.writer
- roles/run.admin
- roles/iam.serviceAccountUser

Create a key:
```powershell
gcloud iam service-accounts create gsdta-web-ci --display-name "GSDTA Web CI"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:gsdta-web-ci@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:gsdta-web-ci@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:gsdta-web-ci@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"

gcloud iam service-accounts keys create key.json --iam-account=gsdta-web-ci@$PROJECT_ID.iam.gserviceaccount.com
# Open key.json, copy its entire contents into the GitHub secret GCP_SA_KEY, then delete key.json
```

---

## Step 4 — Confirm the workflow configuration
The workflow `.github/workflows/deploy.yml` already:
- Authenticates to GCP using `GCP_SA_KEY`
- Builds and pushes the image to Artifact Registry
- Deploys to Cloud Run with the correct env vars and secrets

Key part of the deploy step (already in the repo):
```yaml
--set-env-vars NEXT_TELEMETRY_DISABLED=1,NODE_ENV=production,NEXT_PUBLIC_AUTH_MODE=firebase,NEXT_PUBLIC_API_BASE_URL=/api,GOOGLE_CLOUD_PROJECT=playground-personal-474821,NEXT_PUBLIC_USE_MSW=false,USE_GO_API=false
--set-secrets NEXT_PUBLIC_FIREBASE_API_KEY=FIREBASE_API_KEY:latest,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,NEXT_PUBLIC_FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,NEXT_PUBLIC_FIREBASE_APP_ID=FIREBASE_APP_ID:latest
```
If you need to change values later (like project ID, region, or service name), edit the `env:` block at the top of `deploy.yml`.

---

## Step 5 — Deploy via GitHub Actions
- Push to the `main` branch (or use “Run workflow” → workflow_dispatch in Actions)
- The pipeline will build, push, and deploy the image, setting variables and secrets automatically

---

## Step 6 — Verify after deploy
PowerShell:
```powershell
$REGION = "us-central1"
$SERVICE_NAME = "gsdta-web"

# Check env vars injected into the service
gcloud run services describe $SERVICE_NAME --region $REGION --format="yaml(spec.template.spec.containers[0].env)"

# Open the service URL in your browser (copy from the describe output or Cloud Console)
```

You should see the UI at the Cloud Run URL. API calls from the UI use `/api/*` and are rewritten internally; no extra CORS setup is needed.

---

## Troubleshooting (CI-only)
- In PowerShell, use $PROJECT_ID (not %PROJECT_ID%).
- If “Secret not found”: create it or add a version in Secret Manager.
- If “Permission denied” at runtime: ensure you granted `roles/secretmanager.secretAccessor` to the actual runtime service account (Step 2).
- Check logs: Cloud Console → Cloud Run → your service → Logs, or
  ```powershell
  gcloud run services logs read gsdta-web --region us-central1 --limit 100
  ```
