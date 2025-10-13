# UI Delivery Plan & Phased TODO

Scope: Build the GSDTA UI end-to-end without waiting on backend or infra. Use MSW for API mocking, OIDC flows simulated, and static export for deployment. Core stack and conventions are pinned in `docs/agent.md`.

Status legend

- [ ] TODO
- [~] In progress
- [x] Done

Dependencies

- None on backend/infra for Phases 0–8. Phase 9+ prepare for integration and deploy.

Milestones (suggested)

- M0 Foundations (T+1 week)
- M1 Core user flows (T+3 weeks)
- M2 Teacher/Admin workflows (T+5 weeks)
- M3 Dev deployment + UAT (T+6 weeks)

Requirements coverage

- Parent Registration & Student Profiles → Phases 2
- Enrollment & Class Placement → Phase 3
- Teacher Attendance → Phase 4
- Announcements & Events → Phase 5
- Reports (basic) → Phase 6
- YouTube Embeds & content → Phase 7

---

## Phase 0 — Foundations and Scaffolding

Goals: Create a production-grade Next.js app with TypeScript, Tailwind, linting/formatting, tests, MSW, and CI.

Tasks

- [x] Initialize Next.js (App Router, TS) with pnpm; configure `output: 'export'`
- [x] Add Tailwind CSS (base styles, color tokens, typography)
- [x] ESLint (next/core-web-vitals) + Prettier; import/order and no-floating-promises rules
- [x] Commit hooks: husky + lint-staged; Conventional Commits (commitlint)
- [x] Jest + React Testing Library setup; sample component test
- [x] Playwright E2E scaffold; base smoke spec (home → login)
- [x] MSW 2.x: browser worker booted in dev; node server scaffolded (Jest wiring deferred to Phase 1)
- [x] Env: `.env.example` with `NEXT_PUBLIC_API_BASE_URL`, OIDC placeholders
- [x] App shell: layout, header/nav, footer, 404/500 pages
- [x] CI: GitHub Actions to install, lint, typecheck, unit test, E2E (Playwright, serve out), and build static out

Acceptance criteria

- [x] `npm run dev` runs (MSW starts in dev via MockProvider)
- [x] `npm run build` produces `out/` (Next 15 static export semantics)
- [x] MSW intercepts `/auth/session` and `/students` in dev (DevStatus shows status)
- [x] CI workflow configured (lint, typecheck, tests, build, E2E Playwright)

Artifacts

- next.config.mjs, tailwind.config.ts, postcss.config.js
- jest.config.cjs, playwright.config.ts, .eslintrc.cjs, .prettierrc, .lintstagedrc, commitlint.config.cjs

---

## Phase 1 — Auth Shell & RBAC (Mocked)

Goals: Role-based navigation and route protection with mocked session.

Tasks

- [x] Implement `AuthProvider` with session context from `/auth/session` (MSW)
- [x] Routes: `/login`, `/logout`, `/dashboard`; guard `(app)` routes by role
- [x] Role-based nav (Admin, Teacher, Parent); header shows user + role
- [x] MSW handlers for login/logout/session; error cases (401, 500)
- [x] E2E: unauth → login redirect; role changes nav visibility

Acceptance criteria

- [x] Visiting protected route redirects to `/login`
- [x] Switching mocked role updates nav & access without reload

---

## Phase 2 — Parent Registration & Student Profiles

Goals: CRUD student profiles; parent can manage multiple students.

Tasks

- [x] Pages: `/students` (list), `/students/new`, `/students/[id]`
- [x] Forms: react-hook-form + zod; validation and errors
- [x] MSW: GET/POST/PATCH `/students`; fixtures with 2 students
- [x] Avatar/initials component; phone/email formatting helpers
- [x] Unit tests: form validation and list rendering; E2E happy flow

Acceptance criteria

- [x] Create/edit student; changes persist via MSW store
- [x] Validation errors surfaced accessibly (aria-describedby)

---

## Phase 3 — Enrollment & Class Placement

Goals: Parent applies; admin reviews, accepts, waitlists; capacity checks in UI.

Tasks

- [ ] Pages: Parent `/enrollment/apply` and status; Admin `/enrollment/review`
- [ ] MSW: POST `/enrollments`; GET with `status` filter; PATCH to update status
- [ ] UI waitlist rule: class capacity from `/classes`; client-side guard
- [ ] Notifications: toast feedback; mock email confirmation (UI-only)
- [ ] Tests: accept/waitlist/reject paths; capacity boundary

Acceptance criteria

- [ ] Parent sees application status; Admin can change status; capacity respected

---

## Phase 4 — Teacher Attendance

Goals: Teachers mark attendance by date and class; roster view.

Tasks

- [ ] Pages: `/classes`, `/classes/[id]`, `/classes/[id]/attendance`
- [ ] MSW: GET roster; GET/POST attendance by date
- [ ] Sticky roster table; keyboard-friendly toggles; bulk present/absent
- [ ] Export CSV (client-only) for selected date
- [ ] Tests: date selector, save, CSV contents

Acceptance criteria

- [ ] Attendance saved in MSW store; reflects on reload; CSV export matches records

---

## Phase 5 — Announcements & Events

Goals: CRUD announcements; events list and registration.

Tasks

- [ ] Announcements: list/create/edit for Admin; audience targeting
- [ ] Events: list/detail; parent register; capacity count client-side
- [ ] MSW endpoints; error paths (409 full event)
- [ ] Tests: create announcement; register for event; full capacity edge

Acceptance criteria

- [ ] New announcement visible to targeted roles; event registration respects capacity

---

## Phase 6 — Reports (Basic)

Goals: Attendance summaries by class/student; CSV export.

Tasks

- [ ] Page: `/reports/attendance`; filters (term, class, date range)
- [ ] Client aggregation over MSW data; virtualized table if needed
- [ ] Export CSV; print styles
- [ ] Tests: filter logic; export

Acceptance criteria

- [ ] Summary aligns with underlying attendance records for selected filter

---

## Phase 7 — YouTube Embeds & Content Pages

Goals: Embed playlists and static info pages.

Tasks

- [ ] Component: `YouTubePlaylist` with playlistId prop; responsive iframe
- [ ] Pages: `/resources`, `/about`; content from simple JSON/config
- [ ] Tests: renders and passes a11y basics

Acceptance criteria

- [ ] Embeds load without layout shift; accessible titles

---

## Phase 8 — A11y, Performance, Theming, i18n-lite

Goals: Polish UX and performance; basic localization scaffolding.

Tasks

- [ ] Focus management, skip links, semantic landmarks
- [ ] Lighthouse audits and fixes (target ≥ 90 mobile)
- [ ] Dark mode support; spacing/typography tokens
- [ ] i18n scaffold with minimal keys; future Tamil support

Acceptance criteria

- [ ] Lighthouse mobile ≥ 90; axe checks pass on key pages

---

## Phase 9 — Static Export & Dev Deployment (Manual)

Goals: Produce `/out` and document manual GCS+CDN deploy.

Tasks

- [ ] Build & export; verify relative asset paths
- [ ] Create deployment doc/commands; CDN invalidation steps
- [ ] Smoke test checklist post-deploy

Acceptance criteria

- [ ] `/out` is complete; manual deploy validated with smoke tests

---

## Phase 10 — API Integration Readiness

Goals: Make switching from MSW to real API trivial.

Tasks

- [ ] OpenAPI draft covering all endpoints in `agent.md`
- [ ] Typed API client (`fetch` with zod parsing, error mapping)
- [ ] Feature flag: `USE_MSW=true|false` via env; SSR-safe guards
- [ ] Contract tests using MSW with recorded fixtures

Acceptance criteria

- [ ] Flip flag disables MSW; UI degrades gracefully awaiting real API

---

## Phase 11 — Prod Readiness & Observability

Goals: SEO, analytics, error monitoring, release notes.

Tasks

- [ ] SEO: metadata, sitemap, robots; per-env `siteUrl`
- [ ] Analytics (e.g., GA4) behind consent banner
- [ ] Error monitoring (Sentry) optional; source maps
- [ ] Versioned changelog; feature flags documented

Acceptance criteria

- [ ] Basic SEO validated; analytics events visible in dev property; errors captured in dev

---

## Backlog / Nice-to-haves

- Design system extraction (tokens + primitive components)
- PWA (offline cache of schedule and roster)
- Teacher kiosk mode and quick scan (future barcode)
- Calendar integrations (ICS export)

## Working Agreements

- Small PRs (<400 lines), each mapped to a Phase task
- Tests and accessibility checks included before merge
- Keep MSW fixtures close to feature code; update alongside UI changes
