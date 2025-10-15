# GSDTA — Infrastructure Plan (GCP)

This document translates the project’s requirements and 2025 stack into a concrete, step-by-step GCP setup. It
prioritizes the tech stack in README (Next.js static → GCS+CDN, Go API → Cloud Run, PostgreSQL → Cloud SQL, OIDC,
Terraform, GitHub Actions OIDC). Note: requirements.md mentions Firestore + Firebase Auth; see Appendix A for that path.

## 0) Scope and Success Criteria

- Environments: dev and prod
- Regions: us-west2 for regional resources
- Domains: dev.gsdta.org (web), api.dev.gsdta.org (api); www.gsdta.org (web), api.gsdta.org (api)
- Success: Web served via CDN with TLS; API on Cloud Run with OIDC; API connects to Cloud SQL via private IP; CI/CD via
  GitHub OIDC; monitoring and budgets active

## 1) Projects, Billing, Guardrails

1. Create GCP projects: gsdta-dev and gsdta-prod (or one project for MVP)
2. Link billing accounts
3. Set budgets and alerts (monthly budget + 50/75/90% notifications)
4. Set org policies if available: block public GCS ACLs; restrict service account key creation; require uniform
   bucket-level access

## 2) Enable Required APIs (per project)

- run.googleapis.com
- artifactregistry.googleapis.com
- secretmanager.googleapis.com
- iam.googleapis.com
- cloudbuild.googleapis.com (if used) or iamcredentials.googleapis.com (for OIDC)
- sqladmin.googleapis.com
- compute.googleapis.com
- servicenetworking.googleapis.com
- vpcaccess.googleapis.com
- logging.googleapis.com, monitoring.googleapis.com

## 3) IAM and Service Accounts (least privilege)

Create service accounts (per env):

- sa-api-runtime@PROJECT_ID — Cloud Run runtime for API
- sa-deployer@PROJECT_ID — CI/CD deploy (impersonated via GitHub OIDC)
- sa-scheduler@PROJECT_ID — scheduled jobs (backups, maintenance)
- sa-cdn-backend@PROJECT_ID — load balancer to read web bucket

Grant minimal roles:

- Runtime (sa-api-runtime): logging.logWriter, cloudtrace.agent, secretmanager.secretAccessor, cloudsql.client,
  vpcaccess.user
- Deployer (sa-deployer): run.admin, artifactregistry.writer, iam.serviceAccountUser (on sa-api-runtime),
  storage.objectAdmin (on web bucket), compute.loadBalancerAdmin (if managing CDN), cloudsql.admin (if running
  migrations)
- Scheduler (sa-scheduler): run.invoker, storage.objectAdmin (if writing backups), cloudsql.client
- CDN backend (sa-cdn-backend): storage.objectViewer (bucket-level)
  Remove broad Editor on users/groups; prefer fine-grained grants.

## 4) Networking for Private Data Access

1. Create VPC (or use default) and choose a reserved IP range for Private Service Access (e.g., 10.10.0.0/16)
2. Create Private Service Connection to Google services (for Cloud SQL private IP)
3. Create a Serverless VPC Access connector in us-west2 (e.g., svpc-usw2) with sufficient IPs
4. Optionally configure Cloud NAT if the API needs outbound internet while egressing via VPC

## 5) Artifact Registry

1. Create Docker repository: us-west2-docker.pkg.dev/PROJECT_ID/gsdta
2. Configure CI to push API images here

## 6) Secret Manager

1. Create secrets as needed:
    - OIDC_CLIENT_ID, OIDC_CLIENT_SECRET (Auth0/Keycloak/GIP)
    - SENDGRID_API_KEY (email)
    - DB_PASSWORD (if not using IAM DB Auth)
2. Grant secretAccessor to sa-api-runtime (and to jobs that require them)

## 7) Cloud SQL for PostgreSQL

1. Create instance (pg-gsdta) in us-west2, private IP only
2. Choose small machine (start with 1 vCPU, 10–20 GB), auto storage increase ON
3. Create database gsdta and app user (or configure IAM DB Auth)
4. Enable automated backups + PITR (7–14 days)
5. Optionally disable public IP and authorized networks (private only)
6. Record connection info (private IP host, port 5432)

## 8) Cloud Run — API Service (Go)

1. Build API container and push to Artifact Registry
2. Deploy Cloud Run service gsdta-api (us-west2):
    - Service account: sa-api-runtime
    - VPC connector: svpc-usw2, egress: Private ranges only
    - CPU/mem: 1 vCPU / 512 MB; concurrency ~80; min instances 0; cap max instances
    - Env vars: DB_HOST, DB_PORT=5432, DB_NAME=gsdta, DB_USER, DB_PASSWORD_SECRET (or IAM), OIDC_ISSUER, OIDC_AUDIENCE
    - Ingress: all; Authentication: allow unauthenticated, enforce OIDC/JWT in app for protected endpoints
3. Configure domain mapping for api.dev.gsdta.org and api.gsdta.org; wait for managed certs

## 9) Frontend — Static Next.js on GCS + Cloud CDN

1. Create GCS buckets (uniform access; public access prevention ON):
    - gsdta-web-dev-PROJECT_ID (dev)
    - gsdta-web-prod-PROJECT_ID (prod)
2. Create HTTPS load balancer with backend buckets and enable Cloud CDN
3. Issue managed SSL certs for dev.gsdta.org and www.gsdta.org
4. Grant sa-cdn-backend storage.objectViewer on the web buckets
5. Set cache headers on uploaded assets; plan for CDN invalidations per release

## 10) DNS and TLS

1. Point DNS A/AAAA records to the HTTPS load balancer IPs for dev.gsdta.org and www.gsdta.org
2. Map API domains via Cloud Run domain mappings (api.dev.gsdta.org, api.gsdta.org)
3. Enforce HTTPS and HSTS at the edge

## 11) CI/CD — GitHub Actions via OIDC → GCP

1. Configure Workload Identity Federation (per env):
    - Create pool/provider for GitHub (issuer https://token.actions.githubusercontent.com)
    - Attribute condition to restrict to the gsdtа/gsdta repo and main branch (adjust as needed)
    - Allow provider to impersonate sa-deployer
2. Pipelines:
    - API: build → push to Artifact Registry → run DB migrations → deploy Cloud Run
    - Web: next export → sync /out to web bucket → invalidate CDN
3. Do not store cloud keys; use OIDC impersonation and project-scoped roles

## 12) Observability and Alerts

1. Ensure Cloud Logging/Monitoring are enabled (default)
2. Configure Error Reporting for Go panics/errors
3. Create Uptime checks for web and API; alert on downtime and high 5xx rates
4. Dashboards for Cloud Run, Cloud SQL, CDN cache hit ratio
5. Use structured logs and propagate trace headers; consider OTEL exporters

## 13) Backups and Data Hygiene

1. Cloud SQL: automated backups + PITR configured; test restore quarterly
2. Logical dumps: create a GCS bucket gsdta-db-backups-PROJECT_ID with lifecycle (retain 30–90 days)
3. Schedule Cloud Run Job (sa-scheduler) to run pg_dump nightly to backups bucket
4. Web buckets: optional versioning; lifecycle to prune old versions/artifacts

## 14) Security Hardening

- Secrets only in Secret Manager; never in images or CI vars
- Dedicated runtime SA; restrict deploys to sa-deployer via OIDC
- Cloud SQL private IP only; prefer IAM DB Auth or strong credentials rotated via Secret Manager
- Web buckets are not publicly listable; access only through CDN backend SA
- Optional WAF with Cloud Armor on the HTTPS load balancer
- Periodically review IAM bindings and audit logs

## 15) Cost Controls

- Budgets with alerts on each project
- Cap Cloud Run max instances
- Artifact cleanup policy; prune old images
- GCS lifecycle rules to remove old artifacts and backups

## 16) Environment Promotion

- Mirror all resources in gsdta-dev and gsdta-prod
- Separate buckets, DBs, secrets, domains (dev.* vs prod)
- Promote via branches and environment-specific CI triggers

## 17) Terraform Structure and Apply Order

- Repository layout:
    - infra/terraform/modules/* (run, sql, storage, cdn, network, iam)
    - infra/terraform/envs/dev and infra/terraform/envs/prod (stacks)
- Remote state: bootstrap tf-state-PROJECT_ID bucket (versioning ON, public access prevention)
- Apply order: project/billing → networking → Artifact Registry → IAM/SAs → Secret Manager → Cloud SQL → Cloud Run →
  storage+CDN → monitoring/alerts

## 18) Acceptance Checklist (Go/SQL stack)

- Web reachable at dev.gsdta.org and www.gsdta.org with TLS and CDN
- API reachable at api.dev.gsdta.org and api.gsdta.org with OIDC enforcement
- API connects to Cloud SQL via private IP (VPC connector); migrations applied
- CI/CD deploys on merge to main using OIDC; no long-lived keys
- Uptime checks green; alerts configured; error reporting captures exceptions

---

## Appendix A — Firestore + Firebase Auth (Requirements Path)

If choosing the MVP path in requirements.md (Firestore + Firebase Auth) instead of Postgres + OIDC:

- Replace Section 6/7 with:
    - Firestore (Native mode) in us-west2; enable firebase.googleapis.com, firestore.googleapis.com
    - Firebase Auth providers: Email/Password and Google; set authorized domains
    - Security Rules enforce roles via Firebase custom claims (admin/teacher/parent)
- Backend (Cloud Run): verify Firebase ID tokens on protected routes; roles from custom claims
- Storage buckets: consent and exports buckets with uniform access, public access prevention; lifecycle rules (exports
  auto-delete after 90 days)
- Scheduler: jobs to export Firestore backups to GCS
- Acceptance deltas: Data stored in Firestore; Auth via Firebase; API enforces Firebase tokens

This appendix keeps the MVP aligned to requirements while allowing a later migration to the 2025 Postgres stack if
desired.
