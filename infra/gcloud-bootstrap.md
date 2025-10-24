# Infrastructure Bootstrap via gcloud (Windows)

Purpose: One place for repeatable, CLI-based setup of core GCP/Firebase resources used by this repo. This is copy-paste friendly for Windows cmd.exe and mirrors what we’ve documented across README and RBAC docs. We’ll automate later.

Works with
- Google Cloud project (billing enabled)
- Windows cmd.exe shell

References in repo
- README → "Infrastructure bootstrap (gcloud)"
- RBAC → `docs/rbac/00-prereqs-project-setup.md` (Firebase enablement, Firestore, Web App)
- GCP deploy → `docs/gcp-deploy.md`

---

## 0) Prerequisites

Install tools
```cmd
REM Google Cloud CLI: https://cloud.google.com/sdk/docs/install
REM Node.js LTS (for firebase-tools): https://nodejs.org/
REM Firebase CLI	npm install -g firebase-tools
```

Authenticate and select the project
```cmd
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

---

## 1) Enable required APIs (gcloud)

```cmd
REM Core Firebase + Firestore
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firestore.googleapis.com

REM Optional for runtime/CI/CD in this repo
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable iamcredentials.googleapis.com
```

---

## 2) Add Firebase to the existing GCP project (firebase-tools)

```cmd
firebase login
firebase projects:addfirebase YOUR_PROJECT_ID
```
Note: Allow 1–2 minutes for the operation to propagate. Verify at https://console.firebase.google.com (select your project).

---

## 3) Create Firestore (Native mode) (gcloud)

```cmd
gcloud firestore databases create ^
  --location=us-central1 ^
  --type=firestore-native
```
If Firestore already exists, the command will report it and you can continue.

---

## 4) Create a service account (runtime) (gcloud)

Used by the container or CI/CD if you run server-side code that needs Firestore or secrets.
```cmd
gcloud iam service-accounts create gsdta-api-runner ^
  --display-name="GSDTA API Service Account"

REM Firestore read/write (Datastore User)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID ^
  --member="serviceAccount:gsdta-api-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" ^
  --role="roles/datastore.user"

REM (Optional) Read secrets at runtime
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID ^
  --member="serviceAccount:gsdta-api-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com" ^
  --role="roles/secretmanager.secretAccessor"
```

Local dev (optional): create a key only for local testing, never commit keys.
```cmd
gcloud iam service-accounts keys create sa-key.json ^
  --iam-account=gsdta-api-runner@YOUR_PROJECT_ID.iam.gserviceaccount.com

REM set GOOGLE_APPLICATION_CREDENTIALS=%CD%\sa-key.json
```

---

## 5) Create a Firebase Web App and get SDK config (firebase-tools)

```cmd
REM Create Web app under the project
firebase apps:create web "GSDTA Web UI" --project YOUR_PROJECT_ID

REM List apps to obtain the Web App ID
firebase apps:list --project YOUR_PROJECT_ID
```
Copy the Web App ID from the output (e.g., 1:###########:web:XXXXXXXX) then:
```cmd
firebase apps:sdkconfig web <WEB_APP_ID> --project YOUR_PROJECT_ID

REM Optionally save
firebase apps:sdkconfig web <WEB_APP_ID> --project YOUR_PROJECT_ID > sdkconfig.json
```

---

## 6) Deploy Firestore rules and indexes (firebase-tools)

We keep Firestore rules and indexes under `persistence/` in this repo.
```cmd
firebase login
firebase use YOUR_PROJECT_ID

REM Deploy rules & indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 7) Verify

- Firebase Console → Project settings → General → Your apps: see the Web App
- Firebase Console → Firestore Database: database exists in us-central1
- Firebase Console → Authentication → Settings → Authorized domains: add localhost and your domains (manual)
- Firebase Console → Authentication → Sign-in method: enable Google + Email/Password (manual)

---

## 8) Notes, limits, and next steps

- Some Firebase settings (Auth providers, authorized domains) aren’t covered by gcloud; configure via Console or REST APIs.
- For Cloud Run deployment and custom domain mapping, see `docs/gcp-deploy.md` and `docs/custom-domain.md`.
- We may automate these steps later (cmd/PowerShell script or Cloud Build/TF). For now, this doc is the single source of truth for manual CLI bootstrap.
