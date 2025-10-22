# Roadmap: Replace Google Sheets Registration with Go API + Cloud Firestore

Goal: Move registration from Google Sheets to our Go API persisting to Google Cloud Firestore. Maintain current UX of "no login required" and host both UI (Next.js) and API (Go) in the same Cloud Run container.

Success criteria:
- Users submit a registration form without logging in.
- UI sends the payload to the Go API.
- API validates and stores data in Firestore.
- Observability, security, and rollback are in place.
- Parity with existing Sheets flow, then enhancements.

Assumptions:
- We will use Google Cloud Firestore (Native mode). If an existing Datastore/Firestore setup exists, we'll adapt during Phase 0.
- UI (Next.js) and API (Go) run in the same Cloud Run container/service; the single exposed PORT serves UI, and UI proxies /api/* to the Go API on localhost.

**Implementation Plan:** See `docs/firestore-registration-implementation-plan.md` for detailed step-by-step guide.

---

## Phase 0 — Audit and Alignment (current state, risks, decisions)

Checklist:
- [ ] Inventory where Google Sheets is referenced in UI and API (identify files, env vars, secrets, and CI steps).
- [ ] Confirm current Cloud Run deployment topology: same container for UI+API, exposed PORT, internal ports, and router/proxy approach.
- [ ] Decide Firestore mode (prefer Native) and region (align with existing infra and latency needs).
- [ ] Review PII handling and compliance needs (data minimization, retention, consent text on form).
- [ ] Define minimal parity scope for v1 (fields to collect, non-functional requirements, error handling, rate limits).
- [ ] Update docs (architecture and requirements) with decisions.

Deliverables:
- [x] Short design note capturing: data model draft, endpoint contract, infra choices, and risks/mitigations.
- [x] Detailed implementation plan with step-by-step GCP setup instructions

---

## Phase 1 — Data Model and Firestore Provisioning

### Registration Data Model (Refined Requirements)

**Collection:** `registrations`

**Student Information:**
- firstName (string, required, 1-50 chars)
- lastName (string, required, 1-50 chars)
- dateOfBirth (string, required, ISO 8601: YYYY-MM-DD)
- gender (enum, required: "Male" | "Female" | "Rather not say")
- address (object, required):
  - line1 (string, required, min 5 chars) - Street address
  - line2 (string, optional) - Apartment/Unit
  - city (string, required, min 2 chars)
  - state (string, required, 2-letter code, default "CA")
  - zip (string, required, 5 or 9 digits)

**Guardian Information:**
- guardians (object):
  - primary (object, required):
    - firstName (string, required)
    - lastName (string, required)
    - relationship (enum, required: "Mother" | "Father" | "Uncle" | "Guardian")
    - email (string, required, normalized to lowercase)
    - phone (string, required, normalized to E.164: +1XXXXXXXXXX)
    - employer (string, optional)
  - secondary (object, optional):
    - firstName (string, optional)
    - lastName (string, optional)
    - relationship (enum, optional: "Mother" | "Father" | "Uncle" | "Guardian")
    - email (string, optional)
    - phone (string, optional)

**School Information:**
- school (object):
  - public (object, required):
    - name (string, required, dropdown or custom if "Other")
    - district (string, required, dropdown)
    - academicYear (string, required, dynamic: "2025-2026")
    - grade (string, required, TK through Grade-12)
  - tamil (object, required):
    - lastYearGrade (string, required: PreKG, KG1, KG2, 1-8, or "Was not enrolled")
    - lastYearSchool (string, optional: Bharthiyar, GSDTA, SDTP, Other)
    - enrollingGrade (string, required: PreKG, KG1, KG2, 1-8)
    - needsAssessment (boolean, required)

**System Metadata:**
- metadata (object):
  - submissionId (string, auto-generated: REG-YYYY-NNNNNN)
  - createdAt (timestamp, server-generated)
  - updatedAt (timestamp, server-generated)
  - status (string, default "submitted": submitted | reviewed | approved | rejected | enrolled)
  - source (string, default "web": web | admin | import)
  - dedupKey (string, SHA-256 hash for duplicate detection)
  - ipAddress (string, optional, from X-Forwarded-For)
  - userAgent (string, optional)

**Deduplication Strategy:**
- dedupKey = SHA256(primary.email + student.firstName + student.lastName + student.dateOfBirth + currentDay)
- Check for duplicates within 24-hour window
- Return 409 Conflict if duplicate found

### Firestore Provisioning Steps

**Prerequisites:**
- GCP account with billing enabled
- Project ID: `gsdta-web` (or your actual project ID)
- gcloud CLI installed and authenticated

**1. Enable Required APIs:**
```bash
gcloud services enable firestore.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

**2. Create Firestore Database:**
```bash
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native
```

**3. Create Service Account:**
```bash
gcloud iam service-accounts create gsdta-api-runner \
  --display-name="GSDTA API Cloud Run Service Account"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:gsdta-api-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

**4. Local Development - Firestore Emulator:**
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase emulators:start --only firestore
```

Set in `.env.local`:
```
FIRESTORE_EMULATOR_HOST=localhost:8080
GOOGLE_CLOUD_PROJECT=gsdta-web
```

**5. Create Firestore Indexes:**

Create `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "registrations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "metadata.status", "order": "ASCENDING" },
        { "fieldPath": "metadata.createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "registrations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "metadata.dedupKey", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "registrations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "guardians.primary.email", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

**6. Create Security Rules:**

Create `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registrations/{registrationId} {
      // Allow public to create (no auth required)
      allow create: if request.resource.data.keys().hasAll(['student', 'guardians', 'school', 'metadata']);
      
      // Only admins can read, update, delete (implement auth later)
      allow read, update, delete: if false;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

Verification:
- [ ] Firestore database created in us-central1
- [ ] Service account has datastore.user role
- [ ] Emulator runs locally on port 8080
- [ ] Indexes deployed successfully
- [ ] Security rules deployed successfully

---

## Phase 2 — API: Public Registration Endpoint

Contract (v1):
- POST /api/v1/registrations
  - Request: JSON matching the Registration schema (Phase 1). No auth required (public), with input validation.
  - Response: 201 Created with { id, submissionId, createdAt } on success
  - Error responses:
    - 400 Bad Request: Validation errors with field-specific messages
    - 409 Conflict: Duplicate registration detected
    - 429 Too Many Requests: Rate limit exceeded
    - 500 Internal Server Error: System error

Tasks:
- [ ] Define Go domain models in `api/internal/domain/registration.go`
- [ ] Implement Firestore client setup in `api/internal/storage/firestore/client.go`
- [ ] Create registration repository in `api/internal/storage/firestore/registration.go` with:
  - [ ] Create method with duplicate detection
  - [ ] GetByID method for future admin features
  - [ ] generateDedupKey helper
  - [ ] generateSubmissionID helper
- [ ] Implement HTTP handler in `api/internal/http/handlers/registration.go` with:
  - [ ] Request parsing and validation
  - [ ] Data normalization (email lowercase, phone E.164 format)
  - [ ] IP address extraction from X-Forwarded-For
  - [ ] Error response formatting
- [ ] Add validation using go-playground/validator
- [ ] Implement CORS middleware for UI origin
- [ ] Add rate limiting (basic: 10 submissions per IP per day)
- [ ] Structured logging with request ID, dedupKey, outcome
- [ ] Update OpenAPI spec (api/gsdta-api.json) with new endpoint
- [ ] Unit tests for repository layer
- [ ] Integration tests against Firestore emulator

Go Dependencies to Add:
```bash
cd api
go get cloud.google.com/go/firestore
go get google.golang.org/api
go get github.com/go-playground/validator/v10
go mod tidy
```

Verification:
- [ ] Test 201 success path with valid payload
- [ ] Test 400 validation errors (missing fields, invalid email, etc.)
- [ ] Test 409 duplicate detection within 24-hour window
- [ ] Test 500 error handling (Firestore down, etc.)
- [ ] All unit tests pass
- [ ] Integration tests pass against emulator

---

## Phase 3 — UI: Registration Form (No Login)

Scope (parity-first, then expand):
- [ ] Design minimal form based on data model; stage multi-step UX as a follow-up.
- [ ] Client-side validation mirroring API rules (keep error messages consistent).
- [ ] Submission to API via fetch to /api/registrations (internal proxy path); display success, error states, and reference code.
- [ ] Accessibility: labeled inputs, keyboard navigation, screen-reader friendly errors.
- [ ] i18n strings where applicable.
- [ ] E2E (Playwright): happy path, validation error, network error.

Verification:
- [ ] Form submits successfully to staging Cloud Run and a document appears in Firestore.

---

## Phase 4 — Container & Routing (UI + API in one Cloud Run service)

Constraints:
- Cloud Run exposes a single PORT externally.
- Both processes can run in one container; a common pattern is: UI listens on PORT, API on localhost:<apiPort>, and UI proxies /api/* to the API.

Tasks:
- [ ] Confirm Dockerfile(s) start both processes reliably and exit correctly on failures.
- [ ] Choose proxy strategy:
  - Next.js rewrites to http://127.0.0.1:<apiPort>, or
  - Lightweight reverse proxy (e.g., caddy/NGINX) routing /api → API and / → Next.js.
- [ ] Health checks: /healthz for API and a basic UI probe; wire Cloud Run health check to UI path.
- [ ] Environment variables: set API_PORT, PORT, NODE_ENV, GCLOUD project, etc.
- [ ] Local dev parity with docker-compose and/or dev scripts.

Verification:
- [ ] Smoke test: curl to /api/registrations (OPTIONS, POST) through the UI server port works in container.

---

## Phase 5 — Security, Privacy, and Abuse Controls

Tasks:
- [ ] CORS locked to known origins.
- [ ] CAPTCHA/anti-spam: plan reCAPTCHA v3 or Cloudflare Turnstile (optional for v1, but add hooks to enable).
- [ ] CSRF: same-origin + fetch + no credentialed cookies for this endpoint; confirm safe default.
- [ ] Rate limits / WAF: consider Cloud Armor policy for high-traffic scenarios.
- [ ] PII minimization: ensure only necessary fields are stored; review retention (TTL or admin purge tools).
- [ ] Secrets: runtime configuration via env/Secret Manager, avoid key files.
- [ ] Logging hygiene: no sensitive data in logs.

Verification:
- [ ] External scanner or basic abuse tests don’t overwhelm the endpoint; logs stay clean.

---

## Phase 6 — CI/CD, Staging, and Verification

Tasks:
- [ ] CI: build, test (Go unit/integration, UI tests), lint gates.
- [ ] CD: deploy to staging Cloud Run with appropriate service account.
- [ ] Staging smoke tests and Playwright E2E in pipeline.
- [ ] Observability: confirm logs in Cloud Logging; error alerts; latency dashboard (basic SLI).

Verification:
- [ ] Sign-off checklist for staging → production promotion.

---

## Phase 7 — Cutover and Migration from Google Sheets

Tasks:
- [ ] Feature flag: dual path (Sheets vs API) behind a toggle; default to API on staging first.
- [ ] Backfill (optional): export Sheets to CSV and import into Firestore via a one-off script or Go/Node tool.
- [ ] Disable Sheets writes after confidence window; archive old data with access controls.
- [ ] Monitor: error rate, submission volume, dedup hits; rollback plan documented.

Verification:
- [ ] After cutover, all new registrations are in Firestore; no regressions reported.

---

## Phase 8 — Post-launch Enhancements (Optional)

Ideas:
- [ ] Admin portal with auth to view/search/export registrations.
- [ ] Email/SMS confirmation to guardians.
- [ ] Multi-step form, autosave drafts (authenticated or magic-link).
- [ ] Attachments (document upload via Cloud Storage) with signed URLs.
- [ ] Analytics on form completion funnels.

---

## Step-by-step: GCP CLI snippets (reference)

Note: Replace placeholders like <PROJECT_ID>, <REGION>, and <SA_EMAIL>.

Enable APIs:
```
gcloud services enable run.googleapis.com firestore.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com --project <PROJECT_ID>
```

Create a service account and grant roles:
```
gcloud iam service-accounts create gsdta-api-runner --project <PROJECT_ID>

set SA_EMAIL=gsdta-api-runner@<PROJECT_ID>.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding <PROJECT_ID> ^
  --member=serviceAccount:%SA_EMAIL% ^
  --role=roles/datastore.user

gcloud projects add-iam-policy-binding <PROJECT_ID> ^
  --member=serviceAccount:%SA_EMAIL% ^
  --role=roles/secretmanager.secretAccessor
```

Deploy Cloud Run using that service account (example):
```
gcloud run deploy gsdta-web ^
  --project <PROJECT_ID> ^
  --region <REGION> ^
  --source . ^
  --service-account %SA_EMAIL% ^
  --allow-unauthenticated
```

Local Firestore emulator (example):
```
npm install -g firebase-tools
firebase emulators:start --only firestore
```

Environment for local dev:
- FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (or printed port)
- GOOGLE_CLOUD_PROJECT=<PROJECT_ID>

---

## Acceptance Criteria Matrix

- Phase 0: Documented decisions and risks approved.
- Phase 1: Firestore up (or emulator locally), IAM set, schema and indexes defined.
- Phase 2: API endpoint implemented with tests, OpenAPI updated.
- Phase 3: UI form integrated with API, E2E green.
- Phase 4: Container routing stable; health checks green.
- Phase 5: CORS locked; basic anti-abuse; no PII in logs.
- Phase 6: CI/CD gates and staging verification in place.
- Phase 7: Cutover complete; no Sheets writes; monitoring clean.
- Phase 8: Enhancements prioritized and scheduled.

---

## Risks and Mitigations
- Spam/Abuse: Add CAPTCHA and rate limits; monitor and enable Cloud Armor if needed.
- PII handling: Minimize fields, redact logs, document retention.
- Firestore costs/quotas: Use appropriate region, indexes, and consider TTL if needed.
- Single-container complexity: Ensure robust process supervision and routing; consider split services if complexity grows.
- Downtime during cutover: Use feature flags and canary, monitor metrics, have rollback.

---

## Next Step
- Execute Phase 0: Audit and Alignment. Capture findings in docs and then proceed to Phase 1.
