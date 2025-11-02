# Deploying gsdta-web to Google Cloud Platform (GCP)

This project ships a single Docker image that runs both the Next.js UI (port 3000) and the Go API (port 8080) in one container. The UI proxies requests from `/api/*` to the API's `/v1/*` endpoints inside the same container. We'll use:

- Artifact Registry to store images
- Cloud Run to host the container (HTTPS, autoscaling)
- GitHub Actions for CI/CD (optional but recommended)

You can deploy either via CI (recommended) or manually from your machine.

---

## 0) Prerequisites

- A GCP project with billing enabled
- Google Cloud CLI installed and authenticated
- Docker installed (for manual build/push)
- Maintainer/admin access to this GitHub repository

In a terminal (cmd.exe on Windows), set your variables for this session:

```
set PROJECT_ID=your-gcp-project-id
set REGION=us-central1
set GAR_REPO=web-apps
set SERVICE_NAME=gsdta-web
```

---

## 1) One-time GCP setup

Enable required services:

```
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
```

Create (or confirm) a Docker Artifact Registry repository:

```
gcloud artifacts repositories create %GAR_REPO% ^
  --repository-format=docker ^
  --location=%REGION% ^
  --description="Web apps images"
```

If it already exists, you can ignore the error.

Tip (Windows cmd.exe): do not wrap values in quotes when setting variables. For example, `set GAR_REPO="web-apps"` stores the quotes too, causing an invalid name error. Use `set GAR_REPO=web-apps` instead. Repository names must:
- use only lowercase letters, numbers, and hyphens
- begin with a letter and end with a letter or number

If you prefer, bypass variables and run a single line with literals:

```
gcloud artifacts repositories create gsdta-web ^
  --repository-format=docker ^
  --location=us-central1 ^
  --description="GSDTA web images"
```

---

## 2) CI user (service account) and permissions

Create a service account for GitHub Actions CI:

```
gcloud iam service-accounts create gsdta-web-ci ^
  --display-name "GSDTA Web CI"
```

Grant it minimal roles for deploying to Cloud Run and pushing to Artifact Registry:

```
REM Push to Artifact Registry
gcloud projects add-iam-policy-binding %PROJECT_ID% ^
  --member="serviceAccount:gsdta-web-ci@%PROJECT_ID%.iam.gserviceaccount.com" ^
  --role="roles/artifactregistry.writer"

REM Deploy/manage Cloud Run
gcloud projects add-iam-policy-binding %PROJECT_ID% ^
  --member="serviceAccount:gsdta-web-ci@%PROJECT_ID%.iam.gserviceaccount.com" ^
  --role="roles/run.admin"

REM Required for deploying services with a chosen runtime service account
gcloud projects add-iam-policy-binding %PROJECT_ID% ^
  --member="serviceAccount:gsdta-web-ci@%PROJECT_ID%.iam.gserviceaccount.com" ^
  --role="roles/iam.serviceAccountUser"
```

Create a JSON key for this CI service account (store it securely):

```
gcloud iam service-accounts keys create key.json ^
  --iam-account=gsdta-web-ci@%PROJECT_ID%.iam.gserviceaccount.com
```

Open `key.json` and copy its entire contents.

In GitHub, navigate to: Repository Settings → Secrets and variables → Actions → New repository secret

- Name: `GCP_SA_KEY`
- Value: paste the JSON from `key.json`

Then, delete `key.json` from your machine.

Security note: Keys work but are less secure than Workload Identity Federation (WIF). Consider migrating to WIF later.

---

## 3) Configure the GitHub Actions workflow

Open `.github/workflows/ci.yml` and set the env values near the top:

```
GCP_PROJECT_ID: your-gcp-project-id
GAR_LOCATION: us-central1
GAR_REPO: web-apps
SERVICE_NAME: gsdta-web
```

Already in place:
- The Docker build step passes `BACKEND_BASE_URL=http://localhost:8080/v1` so the UI correctly proxies `/api/*` to the API base path `/v1` inside the container.

Uncomment the "GCP deploy steps" section at the end of the workflow to:
- Authenticate to GCP using `GCP_SA_KEY`
- Configure Docker to push to Artifact Registry
- Push the image
- Deploy to Cloud Run on port 3000

Optional environment variables to add to the deploy command:
- `APP_ENV=production` (API runtime mode)
- `SEED_ON_START=false` (avoid dev seeding in prod)

Example (inside the deploy step):

```
--set-env-vars NEXT_TELEMETRY_DISABLED=1,NODE_ENV=production,APP_ENV=production,SEED_ON_START=false
```

Commit and push the changes. On each push to `main` (or PR), CI will build, test, build the Docker image, push it to Artifact Registry, and deploy to Cloud Run.

---

## 4) Manual build and deploy (no CI)

Authenticate and configure Docker for Artifact Registry:

```
gcloud auth configure-docker %REGION%-docker.pkg.dev --quiet
```

Build the image locally from the repo root. The command below injects version metadata and the correct API base path:

```
for /f %%i in ('git rev-parse --short HEAD') do set COMMIT=%%i
for /f %%i in ('git describe --tags --always 2^>NUL') do set VERSION=%%i
if not defined VERSION set VERSION=dev
for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToUniversalTime().ToString(\"yyyy-MM-ddTHH:mm:ssZ\")"') do set BUILDTIME=%%i

set IMAGE_URI=%REGION%-docker.pkg.dev/%PROJECT_ID%/%GAR_REPO%/%SERVICE_NAME%:%COMMIT%

docker build ^
  --build-arg VERSION=%VERSION% ^
  --build-arg COMMIT=%COMMIT% ^
  --build-arg BUILDTIME=%BUILDTIME% ^
  --build-arg BACKEND_BASE_URL=http://localhost:8080/v1 ^
  -t %IMAGE_URI% .
```

Push the image:

```
docker push %IMAGE_URI%
```

Deploy to Cloud Run (public, managed):

```
gcloud run deploy %SERVICE_NAME% ^
  --image %IMAGE_URI% ^
  --region %REGION% ^
  --platform managed ^
  --allow-unauthenticated ^
  --port 3000 ^
  --set-env-vars NEXT_TELEMETRY_DISABLED=1,NODE_ENV=production,APP_ENV=production,SEED_ON_START=false,NEXT_PUBLIC_SITE_URL=https://app.gsdta.com
```

**IMPORTANT:** Replace `https://app.gsdta.com` with your actual production domain. This prevents CORS errors where the app tries to load resources from `http://localhost:3000`.

The deploy command outputs a service URL like `https://<service>-<hash>-<region>.a.run.app`.

---

## 5) Verify after deploy

- Open the Cloud Run URL in your browser. You should see the UI.
- API via UI proxy: visit `https://<service-url>/api/version` to hit the Go API `GET /v1/version` endpoint through Next.js rewrite.
- Logs: in Cloud Console → Cloud Run → your service → Logs. You can also stream locally:

```
gcloud logs tail --project=%PROJECT_ID% --min-log-level=INFO --format="json" --billing-project=%PROJECT_ID% ^
  --log-name=projects/%PROJECT_ID%/logs/run.googleapis.com%2Fstdout
```

---

## 6) Runtime configuration reference

Go API (env at runtime):
- `APP_ENV` (default: development) — set to `production` in Cloud Run
- `PORT` (default: 8080) — the API listens here inside the container
- `LOG_LEVEL` (default: info)
- `CORS_ALLOWED_ORIGINS` (default: http://localhost:3000) — not critical in single-container pattern
- `SEED_ON_START` (default: true in dev when no DB) — set to `false` in prod
- `DATABASE_URL` — optional Postgres connection string (if you add a real DB)
Next.js (runtime):
- `NEXT_PUBLIC_SITE_URL` — **REQUIRED in production**. Your site's public URL (e.g., `https://app.gsdta.com`). Used for generating absolute URLs in metadata, structured data, and assets. Defaults to `http://localhost:3000` if not set, causing CORS errors in production.
- `NEXT_TELEMETRY_DISABLED` — set to `1` to disable Next.js telemetry

- `MIGRATE_ON_START` (default: false)

Next.js (build-time):
- `BACKEND_BASE_URL` — baked at build; we pass `http://localhost:8080/v1` in Docker build so `/api/*` → API `/v1/*`
- `NEXT_OUTPUT=standalone` — configured in Dockerfile for production

Next.js (runtime):
- `PORT=3000` — Cloud Run must send traffic here (`--port 3000`)
- `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`

---

## 7) Common gotchas

- 404 on `/api/*`: ensure the Docker build uses `--build-arg BACKEND_BASE_URL=http://localhost:8080/v1`.
- 502/Container failed to start: ensure Cloud Run `--port 3000` matches the container's Next.js port. The API runs internally on 8080.
- Auth errors pushing images: confirm Artifact Registry is in the same region as your push target and that your CI service account has `roles/artifactregistry.writer`.

---

## 8) Optional: Workload Identity Federation (WIF)

WIF removes the need for long-lived JSON keys. To use it:
- Create a workload identity pool and provider for GitHub
- Grant `roles/iam.workloadIdentityUser` on your CI service account to the provider
- Use `google-github-actions/auth@v2` in GitHub Actions with `workload_identity_provider` and `service_account`

See: https://github.com/google-github-actions/auth#setup

---

## 9) Cleanup

To delete the Cloud Run service:

```
gcloud run services delete %SERVICE_NAME% --region %REGION%
```

To delete the Artifact Registry repository (removes all images):

```
gcloud artifacts repositories delete %GAR_REPO% --location %REGION%
```
