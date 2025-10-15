# API + Database — Setup and Deployment Steps (Cloud Run + Cloud SQL)

This guide covers the Go API on Cloud Run and PostgreSQL on Cloud SQL with private networking, secrets, migrations,
CI/CD, and observability. It aligns with the 2025 stack while acknowledging the MVP variant using Firestore + Firebase
Auth (Appendix A).

## 0) Scope

- Environments: dev, prod
- Regions: us-west2
- Domains: api.dev.gsdta.org, api.gsdta.org
- Auth: OIDC (Auth0/Keycloak/GIP) enforced in the app; see Appendix A for Firebase tokens

## 1) Prerequisites

- GCP projects created with billing and budgets
- Required APIs enabled (see infra.md Section 2)
- Service accounts from infra.md created:
    - sa-api-runtime (Cloud Run runtime)
    - sa-deployer (CI/CD deploy)
    - sa-scheduler (scheduled jobs)
- Workload Identity Federation configured for GitHub Actions → GCP (for CI/CD)

## 2) Networking

1. Private Service Access: reserve IP range (e.g., 10.10.0.0/16) and create private connection to Google services
2. Serverless VPC Access: create connector `svpc-usw2` in us-west2 with adequate IPs
3. Egress mode for Cloud Run: “Private ranges only” to reach Cloud SQL via private IP

## 3) Cloud SQL for PostgreSQL

1. Create instance `pg-gsdta` (Postgres 15+) in us-west2, private IP only
2. Sizing: start small (1 vCPU, 10–20 GB); auto storage increase ON
3. Database & users:
    - Create DB `gsdta`
    - Create user `app_user` with strong password (or configure IAM DB Auth)
4. Backups & PITR: daily automated backups + PITR (7–14 days)
5. Flags (optional): `log_min_duration_statement`, `log_connections`
6. Note connection details: private IP host, port 5432

## 4) Secrets & Config

- Secret Manager secrets (per env):
    - DB_PASSWORD (if not using IAM DB Auth)
    - SENDGRID_API_KEY (email)
    - OIDC_CLIENT_ID, OIDC_CLIENT_SECRET (if API performs token exchange/introspection)
- Runtime env vars:
    - PROJECT_ID, DB_HOST, DB_PORT=5432, DB_NAME=gsdta, DB_USER, DB_PASSWORD_SECRET (or IAM), OIDC_ISSUER, OIDC_AUDIENCE
    - Optional: LOG_LEVEL, OTEL_EXPORTER_OTLP_ENDPOINT

## 5) Migrations

- Tooling: goose or golang-migrate. Recommended: run via CI or a Cloud Run Job using the same VPC connector and SA
- DATABASE_URL pattern: `postgres://DB_USER:DB_PASS@DB_HOST:5432/gsdta?sslmode=disable`
- Steps (CI/CD typical):
    1) Build API image and push to Artifact Registry
    2) Run migrations (idempotent) against Cloud SQL via connector
    3) Deploy API revision

## 6) API — Cloud Run Deployment

1. Build container: multi-stage Dockerfile with minimal runtime image
2. Deploy service `gsdta-api` (us-west2):
    - SA: sa-api-runtime
    - VPC connector: svpc-usw2; egress to private ranges only
    - Resources: 1 vCPU / 512MB; concurrency 80; min 0; set a max for cost control
    - Env: DB, OIDC, and other required vars (see Section 4)
    - Ingress: all; Authentication: allow unauthenticated at Cloud Run, enforce OIDC/JWT in the app for protected
      endpoints
3. Domain mappings: api.dev.gsdta.org and api.gsdta.org; managed certs
4. CORS: configure responses to allow UI origin(s)

## 7) CI/CD (GitHub Actions OIDC → GCP)

- Workflow (per env):
    - Authenticate to GCP via OIDC and impersonate sa-deployer
    - API job:
        1) Lint/test
        2) Build and push image to Artifact Registry
        3) Run DB migrations (command or containerized job)
        4) Deploy Cloud Run with pinned image digest
        5) Smoke test key endpoint (healthz)
- Permissions: grant minimal roles to sa-deployer as per infra.md
- Rollback plan: redeploy previous image digest

## 8) Observability

- Logging: structured logs (request ID, user ID if known, trace/span IDs)
- Error Reporting: ensure uncaught panics emit stack traces
- Monitoring: uptime check on API; alerts for 5xx rate, latency, and CPU/memory saturation
- Optional: OpenTelemetry exporters to Cloud Trace/Monitoring

## 9) Backups & Maintenance

- Cloud SQL automated backups + PITR
- Logical dumps: Cloud Run Job (SA: sa-scheduler) running `pg_dump` nightly to `gsdta-db-backups-PROJECT_ID` bucket with
  lifecycle retention 30–90 days
- Maintenance windows and minor version upgrades scheduled

## 10) Security

- Secrets only in Secret Manager
- Private IP access to Cloud SQL via VPC connector; no authorized networks
- Strict IAM: separate runtime vs deploy roles; no broad Editor
- Input validation and output encoding in API; rate limit at app level initially
- Optional: Front API with HTTPS Load Balancer + Cloud Armor for WAF/rate limiting

## 11) Acceptance Checklist

- API domain resolves with TLS; health endpoint returns 200
- Auth required for protected endpoints; OIDC tokens validated
- API connects to Cloud SQL via private IP; migrations applied successfully
- CI/CD pipeline runs on main push and deploys pinned image; smoke test passes
- Uptime checks green; 5xx alerts configured

---

## Appendix A — Firestore + Firebase Auth Variant (MVP Path)

If following requirements.md MVP path instead of Postgres + OIDC:

- Replace Cloud SQL with Firestore (Native mode) in us-west2; enable firebase.googleapis.com and
  firestore.googleapis.com
- Auth via Firebase Auth (Email + Google); allowed domains configured
- API verification: validate Firebase ID tokens; extract custom claims for roles (admin/teacher/parent)
- Firestore Security Rules: implement least-privilege access by role and document ownership
- Storage: create `consent` and `exports` buckets with uniform bucket-level access and Public Access Prevention;
  lifecycle: exports auto-delete after 90 days; consent versioning ON
- Backups: Cloud Scheduler invokes a secured Cloud Run Job/Function to export Firestore to GCS daily
- Acceptance deltas: Data stored in Firestore; API enforces Firebase tokens; exports available to admins
