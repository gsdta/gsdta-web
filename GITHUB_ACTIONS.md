# GitHub Actions Workflows (CI and Deploy)

This document describes the CI and deployment workflows configured for this repository, based on the current workflow files in `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.

## Overview

There are two workflows:

- CI (`ci.yml`) – runs on pushes to `develop`, runs build-and-test for API and UI.
- Deploy (`deploy.yml`) – runs on pushes to `main`, or manually via workflow dispatch, builds and pushes a Docker image and (optionally) deploys to Cloud Run after passing tests.

Notes:
- Documentation/content changes are ignored by CI to save time.
- The UI job depends on the API job in both workflows.

---

## CI Workflow

File: `.github/workflows/ci.yml`

Triggers:
- Push to `develop`
- Ignores: `**.md`, `docs/**`, `**/*.mdx`, `**/*.txt`

Purpose:
- Validate the API and UI with linting, type checks, and E2E tests.

Jobs:

1) API – Build & Test
- Runner: `ubuntu-latest`
- Working directory: `api`
- Tooling: Node.js 20 with npm cache (`cache-dependency-path: api/package-lock.json`)
- Steps:
  - Checkout repository
  - Install dependencies: `npm ci`
  - Lint: `npm run lint`
  - Typecheck: `npm run typecheck`
  - E2E (Cucumber): `npm run test:e2e`

2) UI – Build & Test (needs: API)
- Runner: `ubuntu-latest`
- Container: `mcr.microsoft.com/playwright:v1.48.2-jammy` (pre-installs browsers and system deps)
- Working directory: `ui`
- Tooling: Node.js 20 with npm cache (`cache-dependency-path: ui/package-lock.json`)
- Steps:
  - Checkout repository
  - Install dependencies: `npm ci`
  - Lint: `npm run lint`
  - Typecheck: `npm run typecheck`
  - Unit tests (if present): `npm test --if-present`
  - E2E (Playwright): `npm run e2e:ci`

Notes:
- The Playwright container eliminates the slow `npx playwright install --with-deps` step.
- Our Playwright config only runs Chromium; if you ever enable Firefox/WebKit projects, keep using the container or adjust install accordingly.

Failure behavior:
- Any failing step fails the workflow; the UI job does not run if the API job fails.

---

## Deploy Workflow

File: `.github/workflows/deploy.yml`

Triggers:
- Push to `main`
- Manual trigger (`workflow_dispatch`) with inputs:
  - `run_deploy` (default: `true`) – when `false`, the workflow will build and test, and build the Docker image, but skip pushing the image and skip Cloud Run deployment.
  - `image_tag` (default: empty) – when provided, used as the image tag; otherwise the short commit SHA is used.

Environment variables:
- `NODE_VERSION`: `20`
- `GCP_PROJECT_ID`: `YOUR_PROJECT_ID`
- `GAR_LOCATION`: `us-central1`
- `GAR_REPO`: `web-apps`
- `SERVICE_NAME`: `gsdta-web`

Purpose:
- Build and test API and UI (same as CI), then build and push a Docker image, and deploy to Google Cloud Run.

Jobs and flow:

1) API – Build & Test
- Same as the CI API job (Node 20; `npm ci`, lint, typecheck, Cucumber E2E), running in `api/`.

2) UI – Build & Test (needs: API)
- Same as the CI UI job (Node 20; `npm ci`, lint, typecheck, unit tests if present, Playwright E2E), running in `ui/`, also using the Playwright container.

3) Docker – Build & Push Docker image (needs: UI)
- Permissions: `contents: read`, `id-token: write`
- Steps:
  - Checkout repository
  - Authenticate to GCP using `google-github-actions/auth@v2` and `secrets.GCP_SA_KEY`
  - Setup `gcloud` CLI
  - Configure Docker to use Artifact Registry: `gcloud auth configure-docker ${GAR_LOCATION}-docker.pkg.dev --quiet`
  - Compute metadata (step `meta`):
    - `commit`: short SHA (7 chars)
    - `version`: `git describe --tags --always` (fallback `dev`)
    - `buildtime`: UTC ISO-8601 timestamp
    - `tag`: `image_tag` input if provided (on dispatch), else short SHA
    - `image_uri`: `${GAR_LOCATION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GAR_REPO}/${SERVICE_NAME}:$tag`
  - Set up Docker Buildx
  - Build image (Dockerfile at repo root) with build args: `VERSION`, `COMMIT`, `BUILDTIME`; tag with `image_uri`
  - Push image – conditional:
    - Pushed when event is `push` OR `run_deploy == 'true'` (for manual dispatch)

4) Deploy – Deploy to Cloud Run (needs: Docker)
- Condition: runs when event is `push` OR `run_deploy == 'true'`
- Steps:
  - Authenticate to GCP and setup `gcloud`
  - Deploy:
    - Service: `${SERVICE_NAME}`
    - Image: `${{ needs.docker.outputs.image_uri }}`
    - Region: `${GAR_LOCATION}` (Cloud Run region)
    - Platform: managed
    - Allow unauthenticated
    - Port: `3000`
    - Env vars: `NEXT_TELEMETRY_DISABLED=1`, `NODE_ENV=production`

Notes:
- There is no separate cleanup job and no explicit concurrency group configured in the workflow.

---

## Required Secrets

- `GCP_SA_KEY` – Google Cloud service account JSON with permissions to:
  - Authenticate (`id-token`) and use `gcloud`
  - Push to Artifact Registry in `${GAR_LOCATION}` (`web-apps` repo under `${GCP_PROJECT_ID}`)
  - Deploy to Cloud Run in the same project/region

## Permissions

- CI workflow: default `contents: read`.
- Deploy workflow (Docker/Deploy jobs): `contents: read`, `id-token: write` for Workload Identity / auth action.

## Caching

- Node.js setup uses npm cache with `cache-dependency-path` per package (`api/package-lock.json`, `ui/package-lock.json`).
- Playwright browsers are provided by the container; no additional caching is required. If you run without the container, prefer a targeted install and cache (Chromium-only):
  - Install step: `npx playwright install --with-deps chromium`
  - Cache: `~/.cache/ms-playwright` keyed by Playwright version and OS

## Troubleshooting

- Lint/Typecheck failures: run locally in the respective folder
  - API: `npm run lint`, `npm run typecheck`, `npm run test:e2e`
  - UI: `npm run lint`, `npm run typecheck`, `npm run e2e:ci`
- If you choose not to use the Playwright container:
  - Use Chromium-only install to reduce time: `npx playwright install --with-deps chromium`
  - Optionally cache `~/.cache/ms-playwright` in Actions to avoid re-downloading browsers each run
- Docker build issues: build locally from repo root with the same build args `VERSION`, `COMMIT`, `BUILDTIME`.
- GCP deploy issues: verify `GCP_SA_KEY`, project/region values, and Cloud Run IAM allow deployment and unauthenticated access (if desired).

## At-a-glance Flow

- develop branch:
  - push → CI → API job → UI job
- main branch:
  - push → Deploy → API job → UI job → Docker image build/push → Cloud Run deploy
- manual dispatch:
  - dispatch → API job → UI job → Docker image build → (conditional push/deploy based on `run_deploy`)
