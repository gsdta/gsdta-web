# Prerequisites and Project Setup

Audience: first-time GCP/Firebase users. Goal: create a Google Cloud project, enable Firebase, and capture the basics needed for the RBAC work. No app code yet.

Outcomes
- A Google Cloud project with billing enabled
- Firebase added to that project
- A registered Web App so you have the Firebase SDK config (apiKey, authDomain, projectId, appId)
- Your project identifiers and environment notes captured for the team

---

> If you already have a GCP project with billing enabled (you do) and just need to enable Firebase and core services via CLI, jump to: Enable Firebase on existing project (gcloud)

---

## Enable Firebase on existing project (gcloud + firebase-tools)

Use these Windows cmd.exe commands to enable core Google APIs with gcloud, then add Firebase using the Firebase CLI (firebase-tools). Avoid environment variables; project and region are hardcoded below.

1) Authenticate and select the project (gcloud)
```cmd
gcloud auth login
gcloud config set project playground-personal-474821
```

2) Enable required Google APIs (gcloud)
```cmd
:: Firebase Management API (backend service)
gcloud services enable firebase.googleapis.com

:: Firebase Auth (Identity Toolkit) API
gcloud services enable identitytoolkit.googleapis.com

:: Firestore API
gcloud services enable firestore.googleapis.com
```

3) Add Firebase to the project (firebase-tools)
```cmd
:: Install once if needed: npm install -g firebase-tools
firebase login

:: Link Firebase to your existing GCP project
firebase projects:addfirebase playground-personal-474821
```
If prompted to select a project, choose playground-personal-474821. This operation makes your GCP project a Firebase project.

4) Create the Firestore database (Native mode) (gcloud)
```cmd
gcloud firestore databases create ^
  --location=us-central1 ^
  --type=firestore-native
```
If the database already exists, this command will report it and you can continue.

5) Create a Firebase Web App (to obtain SDK config) (firebase-tools) — Optional
Only required if your browser UI will use the Firebase client SDK (e.g., Firebase Auth for parent sign-in, Firestore from the browser, Analytics). If you use a different auth system (e.g., Auth.js/NextAuth) and do not call Firebase from the client, you can skip this step.
```cmd
:: Create a Web App under the project (optional if not using Firebase client SDK)
firebase apps:create web "GSDTA Web UI" --project playground-personal-474821

:: List apps to find the App ID
firebase apps:list --project playground-personal-474821
```
Copy the Web App ID from the list (looks like 1:############:web:XXXXXXXX).

6) Retrieve the Firebase Web SDK config (firebase-tools) — Optional
If you created a Web App above and plan to initialize Firebase in the browser:
```cmd
firebase apps:sdkconfig web <WEB_APP_ID> --project playground-personal-474821
```
Optionally save it to a file:
```cmd
firebase apps:sdkconfig web <WEB_APP_ID> --project playground-personal-474821 > sdkconfig.json
```

7) Verify in the Firebase Console
- Go to https://console.firebase.google.com → select project: playground-personal-474821
- You should see the project listed as a Firebase project and the Web App under Project settings → General → Your apps.

Troubleshooting
- If firebase-tools asks to initialize a .firebaserc, you can skip; we’re only running project-scoped commands with --project.

Limitations (still manual)
- Enabling Auth providers (Google, Email/Password) and setting Authorized domains must be done in Firebase Console (or via REST APIs), not gcloud.

---

## 1) Create a Google Cloud project

If you already have a project (you do), you can skip this section.

1. Sign in (or create an account): https://accounts.google.com
2. Open Google Cloud Console: https://console.cloud.google.com
3. Create a project:
   - Click the project dropdown (top-left) → New Project
   - Project name: e.g., gsdta-web
   - Note the Project ID (example: gsdta-web-12345)

## 2) Attach billing (required)

You indicated billing is already enabled. If not, follow the steps below.

1. In Cloud Console left nav → Billing → Link a billing account
2. If you don’t have one, follow prompts to set one up

Tip: Billing is required to use many services (including Firestore in production mode).

## 3) Install CLIs (local machine)

- Google Cloud CLI: https://cloud.google.com/sdk/docs/install
- Node.js LTS (includes npm): https://nodejs.org/
- Firebase CLI (optional but recommended, installed via npm):
```cmd
npm install -g firebase-tools
```

## 4) Authenticate and select your project (gcloud)

Open a Windows Command Prompt (cmd.exe) and run:
```cmd
gcloud auth login
gcloud config set project playground-personal-474821
```

Optional: set a default region used later (choose one, e.g., us-central1)
```cmd
set REGION=us-central1
```

## 5) Add Firebase to the GCP project

Use firebase-tools as shown above ("Enable Firebase on existing project"). The gcloud CLI does not provide a supported command to add Firebase to an existing project.

## 6) Register a Firebase Web App (to get SDK config)

Prefer firebase-tools as shown above. Console steps remain valid if you prefer the UI.

1. Firebase Console → Project settings (gear) → General → Your apps → Web
2. Click “Register app” (e.g., Name: gsdta-web-ui)
3. Copy the Web app config values and save for later:
   - apiKey
   - authDomain
   - projectId
   - appId

These values are needed by the UI when initializing Firebase.

## 7) Capture the basics for the team

Record the following in a shared, secure document:
- Project name and Project ID
- Billing account (yes/no)
- Default region (e.g., us-central1)
- Firebase Web app config (apiKey, authDomain, projectId, appId)
- Organization support email to use in Firebase Auth templates

Optional next steps (you can do these later):
- Add authorized domains in Firebase Auth (localhost, staging/prod)
- Decide on invite token TTL (e.g., 72 hours)

---

## What’s next

Proceed in order:
1) Firebase Auth setup → `01-auth-setup.md`
2) Firestore initialization → `02-firestore-init.md`
3) Seed the first Admin → `03-admin-seeding.md`

Or return to the RBAC master page: `../rbac-plan.md`
