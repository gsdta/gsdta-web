# GSDTA Web

[![CI (develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml)
[![Deploy (main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml)

Modern web app with a Next.js UI and a Next.js-based API, shipped as one Docker image.

## Structure

```
gsdta-web/
├─ ui/   # Next.js frontend
├─ api/  # Next.js API (route handlers)
├─ docs/ # Project docs
└─ Dockerfile (bundles UI + API)
```

## Quick start (local)

- Prerequisites: Node.js 20+, optional Docker Desktop

UI (http://localhost:3000):

```cmd
cd ui
copy .env.example .env.local
npm install
npm run dev
```

API (http://localhost:8080):

```cmd
cd api
npm install
npm run dev
```

## Testing

UI:

```cmd
cd ui
npm run lint
npm run typecheck
npm test
npm run pw:install  
npm run test:e2e
```

API (starts server on 8080 and runs Cucumber):

```cmd
cd api
npm run lint
npm run typecheck
npm run test:e2e
```

## Docker

Production-style (UI on 3000, API on 8080):

```cmd
docker-compose up --build
```

Developer hot-reload for UI (http://localhost:3001):

```cmd
docker-compose --profile dev up --build ui-dev
```

## Configuration

- UI env file: `ui/.env.local`
  - Example: `NEXT_PUBLIC_USE_MSW=false`

## CI/CD

- Overview of workflows and deployment: see `GITHUB_ACTIONS.md`

## Docs

- Architecture: `docs/architecture.md`
- UI guide: `docs/ui.md`
- Docker setup: `DOCKER.md`
- Custom domain: `docs/custom-domain.md`
- Infra & Deploy to GCP: `docs/infra.md`, `docs/gcp-deploy.md`
- GCloud bootstrap (CLI): `infra/gcloud-bootstrap.md`

## Infrastructure bootstrap (gcloud)

Goal: Create cloud resources in a repeatable way using CLI. Commands below use Windows cmd.exe syntax. Project and region are hardcoded for your environment.

Prereqs
- Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
- (Optional) Install Firebase CLI: `npm install -g firebase-tools`
- Have project billing enabled

Authenticate and select the project
```cmd
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Enable required APIs
```cmd
gcloud services enable ^
  firestore.googleapis.com ^
  run.googleapis.com ^
  secretmanager.googleapis.com ^
  cloudbuild.googleapis.com ^
  iamcredentials.googleapis.com ^
  firebase.googleapis.com ^
  identitytoolkit.googleapis.com
```

Create Firestore database (Native mode)
```cmd
gcloud firestore databases create ^
  --location=us-central1 ^
  --type=firestore-native
```

Create a service account for runtime (UI/API)
```cmd
gcloud iam service-accounts create gsdta-api-runner ^
  --display-name="GSDTA API Service Account"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID ^
  --member="serviceAccount:gsdta-api-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" ^
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID ^
  --member="serviceAccount:gsdta-api-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" ^
  --role="roles/secretmanager.secretAccessor"
```

Add Firebase to the GCP project (one-time) using firebase-tools
```cmd
firebase login
firebase projects:addfirebase YOUR_PROJECT_ID
```

Deploy Firestore rules and indexes (from repo files)
Note: Firebase CLI is required for rules/indexes deployment.
```cmd
:: From repo root
firebase deploy --project YOUR_PROJECT_ID --only firestore:rules
firebase deploy --project YOUR_PROJECT_ID --only firestore:indexes
```

Limitations and notes
- Enabling Firebase Auth providers (Google, Email/Password) is not covered by gcloud. Do this once via the Firebase Console (Authentication → Sign-in method), or automate with the Firebase Management/Identity Toolkit APIs.
- Authorized domains for Auth are configured in the Firebase Console (Authentication → Settings → Authorized domains).
- For Cloud Run deployment and custom domain mapping, see docs in this repo (docs/gcp-deploy.md, docs/custom-domain.md).

## License

See `LICENSE`.
