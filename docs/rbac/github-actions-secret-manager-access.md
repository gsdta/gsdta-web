# GitHub Actions Service Account – Secret Manager Access

The deploy workflow (`.github/workflows/deploy.yml`) authenticates to Google Cloud with the `gsdta-web-ci` service account. Existing setup docs (`docs/gcp-deploy.md`, `docs/cloud-run-env-vars.md`) grant it the following project roles:

- `roles/artifactregistry.writer`
- `roles/run.admin`
- `roles/iam.serviceAccountUser`

Those roles are sufficient for building and deploying to Cloud Run but do not allow the workflow to read Firebase configuration that lives in Secret Manager. When the workflow reaches the step that fetches `FIREBASE_*` secrets, it fails with:

One or more Firebase secrets are empty. Ensure the GitHub SA has Secret Manager access and that secrets exist.

Grant the missing Secret Manager role with the commands below. They bind the `roles/secretmanager.secretAccessor` role at the project level so the workflow can read all Firebase secrets that live in `YOUR_PROJECT_ID`.

## Prerequisites
- gcloud CLI installed and authenticated to the target project (Owner/Editor or a custom role with IAM write on the project)
- The GitHub Actions service account exists (example below uses: `gsdta-web-ci@YOUR_PROJECT_ID.iam.gserviceaccount.com`)

## Grant Secret Manager Secret Accessor (project-wide)

### Bash (macOS/Linux)
```bash
PROJECT_ID="YOUR_PROJECT_ID"
SA_EMAIL="gsdta-web-ci@${PROJECT_ID}.iam.gserviceaccount.com"

# Allow the GitHub Actions service account to read secrets in the project
# (covers FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_APP_ID, etc.)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Optional: confirm the role is now listed for the service account
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[]" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}" \
  --format="table(bindings.role)"
```

### PowerShell (Windows)
```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$SA_EMAIL = "gsdta-web-ci@$PROJECT_ID.iam.gserviceaccount.com"

# Allow the GitHub Actions service account to read secrets in the project
gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member "serviceAccount:$SA_EMAIL" `
  --role "roles/secretmanager.secretAccessor"

# Optional: confirm the role is now listed for the service account
gcloud projects get-iam-policy $PROJECT_ID `
  --flatten "bindings[]" `
  --filter "bindings.members:serviceAccount:$SA_EMAIL" `
  --format "table(bindings.role)"
```

### Windows Command Prompt (cmd.exe)
```cmd
set PROJECT_ID=YOUR_PROJECT_ID
set SA_EMAIL=gsdta-web-ci@%PROJECT_ID%.iam.gserviceaccount.com

rem Allow the GitHub Actions service account to read secrets in the project
gcloud projects add-iam-policy-binding %PROJECT_ID% --member "serviceAccount:%SA_EMAIL%" --role "roles/secretmanager.secretAccessor"

rem Optional: confirm the role is now listed for the service account
gcloud projects get-iam-policy %PROJECT_ID% --flatten "bindings[]" --filter "bindings.members:serviceAccount:%SA_EMAIL%" --format "table(bindings.role)"
```

## Alternative: scope access to individual secrets only
If you prefer to grant access per secret rather than project-wide, add IAM policy bindings on each secret.

### Bash
```bash
PROJECT_ID="YOUR_PROJECT_ID"
SA_EMAIL="gsdta-web-ci@${PROJECT_ID}.iam.gserviceaccount.com"
for s in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding "$s" \
    --project "$PROJECT_ID" \
    --member "serviceAccount:${SA_EMAIL}" \
    --role "roles/secretmanager.secretAccessor"
done
```

### PowerShell
```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$SA_EMAIL = "gsdta-web-ci@$PROJECT_ID.iam.gserviceaccount.com"
$secrets = @("FIREBASE_API_KEY","FIREBASE_AUTH_DOMAIN","FIREBASE_PROJECT_ID","FIREBASE_APP_ID")
foreach ($name in $secrets) {
  gcloud secrets add-iam-policy-binding $name `
    --project $PROJECT_ID `
    --member "serviceAccount:$SA_EMAIL" `
    --role "roles/secretmanager.secretAccessor"
}
```

### Windows Command Prompt
```cmd
set PROJECT_ID=YOUR_PROJECT_ID
set SA_EMAIL=gsdta-web-ci@%PROJECT_ID%.iam.gserviceaccount.com
for %S in (FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID) do gcloud secrets add-iam-policy-binding %S --project %PROJECT_ID% --member "serviceAccount:%SA_EMAIL%" --role "roles/secretmanager.secretAccessor"
rem Note: In a .bat script, use %%S instead of %S
```

## Optional: create or update Firebase secrets
If the Firebase public configuration secrets do not exist yet, create them and add a version. Replace the placeholder values with your real Firebase config values.

### Bash
```bash
PROJECT_ID="YOUR_PROJECT_ID"

# API KEY
gcloud secrets describe FIREBASE_API_KEY --project "$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud secrets create FIREBASE_API_KEY --replication-policy "automatic" --project "$PROJECT_ID"
printf '%s' 'YOUR_API_KEY' | gcloud secrets versions add FIREBASE_API_KEY --data-file=- --project "$PROJECT_ID"

# AUTH DOMAIN
gcloud secrets describe FIREBASE_AUTH_DOMAIN --project "$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud secrets create FIREBASE_AUTH_DOMAIN --replication-policy "automatic" --project "$PROJECT_ID"
printf '%s' 'YOUR_AUTH_DOMAIN' | gcloud secrets versions add FIREBASE_AUTH_DOMAIN --data-file=- --project "$PROJECT_ID"

# PROJECT ID
gcloud secrets describe FIREBASE_PROJECT_ID --project "$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud secrets create FIREBASE_PROJECT_ID --replication-policy "automatic" --project "$PROJECT_ID"
printf '%s' 'YOUR_PROJECT_ID' | gcloud secrets versions add FIREBASE_PROJECT_ID --data-file=- --project "$PROJECT_ID"

# APP ID
gcloud secrets describe FIREBASE_APP_ID --project "$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud secrets create FIREBASE_APP_ID --replication-policy "automatic" --project "$PROJECT_ID"
printf '%s' 'YOUR_APP_ID' | gcloud secrets versions add FIREBASE_APP_ID --data-file=- --project "$PROJECT_ID"
```

### PowerShell
```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"

# API KEY
if (-not (gcloud secrets describe FIREBASE_API_KEY --project $PROJECT_ID 2>$null)) { gcloud secrets create FIREBASE_API_KEY --replication-policy "automatic" --project $PROJECT_ID }
"YOUR_API_KEY" | Out-File -FilePath tmp.txt -NoNewline
gcloud secrets versions add FIREBASE_API_KEY --data-file tmp.txt --project $PROJECT_ID
Remove-Item tmp.txt

# AUTH DOMAIN
if (-not (gcloud secrets describe FIREBASE_AUTH_DOMAIN --project $PROJECT_ID 2>$null)) { gcloud secrets create FIREBASE_AUTH_DOMAIN --replication-policy "automatic" --project $PROJECT_ID }
"YOUR_AUTH_DOMAIN" | Out-File -FilePath tmp.txt -NoNewline
gcloud secrets versions add FIREBASE_AUTH_DOMAIN --data-file tmp.txt --project $PROJECT_ID
Remove-Item tmp.txt

# PROJECT ID
if (-not (gcloud secrets describe FIREBASE_PROJECT_ID --project $PROJECT_ID 2>$null)) { gcloud secrets create FIREBASE_PROJECT_ID --replication-policy "automatic" --project $PROJECT_ID }
"YOUR_PROJECT_ID" | Out-File -FilePath tmp.txt -NoNewline
gcloud secrets versions add FIREBASE_PROJECT_ID --data-file tmp.txt --project $PROJECT_ID
Remove-Item tmp.txt

# APP ID
if (-not (gcloud secrets describe FIREBASE_APP_ID --project $PROJECT_ID 2>$null)) { gcloud secrets create FIREBASE_APP_ID --replication-policy "automatic" --project $PROJECT_ID }
"YOUR_APP_ID" | Out-File -FilePath tmp.txt -NoNewline
gcloud secrets versions add FIREBASE_APP_ID --data-file tmp.txt --project $PROJECT_ID
Remove-Item tmp.txt
```

### Windows Command Prompt (cmd.exe)
```cmd
set PROJECT_ID=YOUR_PROJECT_ID

rem API KEY
gcloud secrets describe FIREBASE_API_KEY --project %PROJECT_ID% >NUL 2>&1
if errorlevel 1 gcloud secrets create FIREBASE_API_KEY --replication-policy "automatic" --project %PROJECT_ID%
echo YOUR_API_KEY> tmp.txt
gcloud secrets versions add FIREBASE_API_KEY --data-file tmp.txt --project %PROJECT_ID%
del tmp.txt

rem AUTH DOMAIN
gcloud secrets describe FIREBASE_AUTH_DOMAIN --project %PROJECT_ID% >NUL 2>&1
if errorlevel 1 gcloud secrets create FIREBASE_AUTH_DOMAIN --replication-policy "automatic" --project %PROJECT_ID%
echo YOUR_AUTH_DOMAIN> tmp.txt
gcloud secrets versions add FIREBASE_AUTH_DOMAIN --data-file tmp.txt --project %PROJECT_ID%
del tmp.txt

rem PROJECT ID
gcloud secrets describe FIREBASE_PROJECT_ID --project %PROJECT_ID% >NUL 2>&1
if errorlevel 1 gcloud secrets create FIREBASE_PROJECT_ID --replication-policy "automatic" --project %PROJECT_ID%
echo YOUR_PROJECT_ID> tmp.txt
gcloud secrets versions add FIREBASE_PROJECT_ID --data-file tmp.txt --project %PROJECT_ID%
del tmp.txt

rem APP ID
gcloud secrets describe FIREBASE_APP_ID --project %PROJECT_ID% >NUL 2>&1
if errorlevel 1 gcloud secrets create FIREBASE_APP_ID --replication-policy "automatic" --project %PROJECT_ID%
echo YOUR_APP_ID> tmp.txt
gcloud secrets versions add FIREBASE_APP_ID --data-file tmp.txt --project %PROJECT_ID%
del tmp.txt
```

## Notes
- Use the project-wide binding for simplicity; use per-secret bindings if you require least-privilege.
- The workflow only needs read (Accessor) permission. Do not grant Secret Manager Admin unless you intend to manage secrets from CI.
- After permissions are granted and the secrets exist, re-run the workflow (or dispatch with `auth_mode=mock` to bypass Firebase while testing the rest of the pipeline).
