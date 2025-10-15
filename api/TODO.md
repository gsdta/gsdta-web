# GSDTA API + DB — Phased TODO

Purpose: Convert docs in `docs/` into a concrete, incremental backlog. Start with a Go API using an in-memory mock DB,
then swap the data layer to a real DB (Firestore for MVP or PostgreSQL for the 2025 stack). Each phase is small and
independently shippable.

Source docs summarized

- requirements.md: Roles (Admin/Teacher/Parent), Phase 1 features, data model (collections), MVP acceptance.
- architecture.md: Two target stacks — Primary (Go API + Cloud SQL) and MVP alternative (Firestore + Firebase Auth).
- infra.md: GCP setup, IAM, networking, CI/CD, CDN, domain mapping; Appendix for Firestore path.
- api-db.md: API deploy to Cloud Run, secrets, migrations, CI/CD; Appendix A for Firestore + Firebase Auth.
- ui.md: Static Next.js on GCS+CDN, auth integration options, acceptance.

Guiding constraints

- Start with API + mock DB (in-memory store). No external services required to ship early endpoints.
- Keep public calendar and read-only listing endpoints unauthenticated if safe (no PII). Gate PII and writes with auth.
- Prefer small PRs: one feature slice per phase; add tests first.

-------------------------

Phase 0 — Repo and API bootstrap
Checklist

- [x] Go module init, basic folder structure: `cmd/api`, `internal/{http,domain,store,middlewares,config}`
- [x] HTTP server with graceful shutdown; `GET /healthz` and `GET /v1/version`
- [x] Central config (env vars) + .env.example (no secrets)
- [x] Logging (structured), request ID, recovery middleware
- [x] CORS policy (allow dev UI origin only)
- [x] Linting/format (golangci-lint) and unit test scaffolding
- [x] Makefile (or simple scripts) for build/test/run
- [x] Minimal README with local run instructions
  Acceptance
- `go test ./...` passes; `/healthz` returns 200; repo builds from clean clone.

Phase 1 — Domain models and mock DB
Checklist

- [ ] Define core domain structs (IDs are UUIDs): User, Guardian, Student, Term, Campus, Room, Class, Enrollment,
  Attendance, Assessment, Score, Event, EventRegistration, Announcement
- [ ] Repository interfaces per aggregate (e.g., StudentRepo, ClassRepo, EnrollmentRepo…)
- [ ] In-memory store implementation with concurrency-safe maps + RWMutex
- [ ] Seed data loader for dev (terms, campuses, one class, one teacher, one parent/student)
- [ ] Pagination, filtering primitives (limit/offset; createdAt/updatedAt on aggregates)
- [ ] Error model (typed errors: NotFound, Conflict, Validation, Permission)
  Acceptance
- Unit tests for repo interfaces (happy path + NotFound + concurrent writes)

Phase 2 — Auth (stub first, pluggable later)
Checklist

- [ ] Role model: admin | teacher | parent (from requirements.md)
- [ ] Auth middleware (stub): accept `X-Debug-User` header in dev to simulate identity and roles
- [ ] RBAC helper: requireRole(), requireAnyRole(), ownership checks for student/guardian
- [ ] `GET /v1/auth/me` returns current principal (from stub)
- [ ] Feature flag to switch validator to Firebase ID token or OIDC later
  Acceptance
- Protected routes reject unauthenticated requests; role-gated tests pass.

Phase 3a — Admin: Terms, Campuses, Rooms, Classes
Checklist

- [ ] CRUD: `/v1/terms`, `/v1/campuses`, `/v1/rooms`, `/v1/classes`
- [ ] Validation: unique names per scope, capacity > 0, time ranges sane
- [ ] Linkage: class -> term, teacherId (optional), roomId, level, day/time, capacity, playlistId
- [ ] List endpoints support pagination and filters (by term, campus, teacher)
  Acceptance
- Admin can create a term, campus, room, and a class; list filters return expected results.

Phase 3b — Parent & Student profiles
Checklist

- [ ] Guardians (parents) CRUD: `/v1/guardians`
- [ ] Students CRUD: `/v1/students` (guardian ownership enforced)
- [ ] Fields per requirements: name, DOB, prior level, medical notes, photo consent
- [ ] Admin can read all; parent can only read/write their own dependents
  Acceptance
- Parent creates student; admin sees full roster; ownership tests enforced.

Phase 3c — Enrollment workflow
Checklist

- [ ] Public apply: `POST /v1/enrollments:apply` (studentId, classId, preferences)
- [ ] Status transitions: applied → waitlisted | enrolled | rejected | dropped
- [ ] Capacity + waitlist queue auto-enforced; atomic promotion when seats free
- [ ] Admin actions: accept/waitlist/reject/move/transfer endpoints
- [ ] Optional: event hooks for emails (stub only for now)
  Acceptance
- When class is full, next apply is waitlisted; accepting frees waitlist head correctly.

Phase 3d — Calendars
Checklist

- [ ] Public calendar (no PII): `/v1/calendar/public?termId=…` (classes and events)
- [ ] Personal calendars: `/v1/calendar/mine` for parent/teacher (derived from enrollments/assignments)
  Acceptance
- Public calendar lists expected classes/events; personal returns user-scoped items.

Phase 3e — Attendance (teacher)
Checklist

- [ ] Model: Present | Late | Absent; audit timestamps
- [ ] Endpoints: `/v1/classes/{id}/attendance/{date}` — GET/PUT (bulk upsert)
- [ ] "Mark all present" convenience flag
- [ ] Admin summaries + CSV export (export deferred to Phase 5)
  Acceptance
- Teacher can submit attendance; idempotent updates; summaries correct on sample data.

Phase 3f — Assessments & Scores
Checklist

- [x] Create assessment (admin/teacher): title, date, level, maxScore
- [x] Bulk score entry endpoint; per-student read for parents
- [ ] CSV export deferred to Phase 5
  Acceptance
- Parent sees score history; teacher can update in bulk.

Phase 3g — Events & Registrations
Checklist

- [x] Define events (title, dates, location, capacity, eligibility by level/class)
- [x] Parent registers student; capacity + waitlist enforced
- [x] Admin roster listing
  Acceptance
- Over-capacity creates waitlist; roster reflects statuses accurately.

Phase 3h — Announcements
Checklist

- [x] Announcements: scope school | class; title, body, publishAt
- [x] Public read if school-scoped and not PII; class-scoped gated by role/enrollment
  Acceptance
- PublishAt respected; visibility per scope enforced.

Phase 3i — Reports (read-only)
Checklist

- [x] Enrollment by class/level
- [x] Attendance rate by student/class
- [x] Test score summary per term
- [x] Event registration rosters
  Acceptance
- Report endpoints return correct aggregates on seeded data.

Phase 4 — Non-functional polish
Checklist

- [x] Consistent API errors (RFC7807-like JSON)
- [x] Input validation (struct tags), request size limits, sane timeouts
- [x] Pagination defaults + max caps; sorting where useful
- [x] Basic rate limiting (token bucket) and ETags for GETs
- [x] OpenAPI spec (minimal) generated from handlers
  Acceptance
- Contract tests pass; OpenAPI served at `/v1/openapi.json`.

Phase 5 — Exports & Storage (stub)
Checklist

- [x] CSV exports for attendance, scores, rosters
- [x] Interface for object storage; local FS impl for dev
- [x] Admin-only download endpoints
  Acceptance
- CSV contents match queries; permissions enforced.

Phase 6 — Containerization & Local DX
Checklist

- [x] Multi-stage Dockerfile; small runtime image
- [x] Make targets: `make dev`, `make build`, `make test`, `make docker`
- [x] Seed script wired to dev run
  Acceptance
- Container runs locally; healthz reachable; seed data present.

Phase 7 — CI (local + GitHub)
Checklist

- [x] GitHub Actions: lint, test, build (no deploy yet)
- [x] Cache dependencies; run on PRs and main
- [x] Smoke test `/healthz`
  Acceptance
- CI green on main; PRs show status checks.

Phase 8 — Real DB swap (choose one path)
Option A: Firestore (MVP path from requirements)

- [ ] Add Firestore repository implementations (behind interfaces)
- [ ] Token validation using Firebase ID tokens; roles from custom claims
- [ ] Firestore Security Rules draft (for future UI direct reads if needed)
- [ ] Storage buckets (consent, exports) interfaces hooked when ready
- [ ] Minimal deployment to Cloud Run (no VPC needed)
  Acceptance: Data persists across restarts; Firebase tokens required on protected routes.

Option B: PostgreSQL (2025 primary stack)

- [ ] SQL schema + migrations (goose/golang-migrate)
- [ ] Postgres repo implementations
- [ ] Connection pooling, context timeouts, retries
- [ ] Migrations run in CI before deploy
- [ ] Observability fields (created_at/updated_at, audit tables as needed)
  Acceptance: API connects via DATABASE_URL; migrations applied; core flows pass with SQL backend.

Phase 9 — Deploy to GCP (minimal)
Checklist

- [ ] Cloud Run service (us-west2), domain mapping `api.dev.gsdta.org`
- [ ] Secrets wired (Secret Manager or env for dev)
- [ ] Basic uptime check
- [ ] CORS for dev UI domain
  Acceptance
- `/healthz` and `/v1/version` reachable over HTTPS with TLS.

Parking lot (later phases)

- Payments & receipts, Volunteer management, Teacher availability & auto-scheduling, Multilingual UI, Photo galleries,
  PWA offline attendance, WAF/Cloud Armor, Full observability with OTEL.

Quick endpoint sketch (for planning)

- Public: `GET /healthz`, `GET /v1/version`, `GET /v1/calendar/public`, `GET /v1/announcements?scope=school`
- Auth: `GET /v1/auth/me`
- Admin: CRUD for terms/campuses/rooms/classes, announcements; reports
- Parent: guardians, students, enrollments, calendar/mine, event registrations, scores read
- Teacher: classes (mine), attendance, assessments/scores write, calendar/mine

Notes

- Timezone: store all timestamps in UTC; render per campus TZ in UI.
- IDs: UUIDv4 (string) in JSON; validate format on input.
- Concurrency: ensure enrollment moves are atomic; use locks in mock DB.
- Exports: sanitize CSVs; never emit PII in public endpoints.
