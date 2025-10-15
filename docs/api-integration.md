# API Integration Plan (Switch from MSW mocks to real API)

This document describes how to migrate the UI from the current MSW-based mock API to the real backend API documented
at http://localhost:8082/v1/docs. It outlines environment setup, endpoint mapping, code changes, auth, testing, rollout,
and rollback.

Assumptions:

- The real API base path is /v1 (as implied by the docs URL). If your OpenAPI/Swagger spec is available at
  /v1/openapi.json, we can use it for codegen. If the path differs, adjust the NEXT_PUBLIC_API_BASE_URL accordingly.
- The backend runs locally at http://localhost:8082.

## High-level approach

- Introduce a single source of truth for the API base URL: NEXT_PUBLIC_API_BASE_URL (e.g., http://localhost:8082/v1).
- Keep MSW for local development and for Playwright "mocked" tests, but allow a flag to disable it and hit the real API.
- Migrate endpoints feature-by-feature behind a feature flag and verify via a separate Playwright project that targets
  the real API.
- Optionally add a Next.js rewrite proxy (/api -> backend /v1) to avoid CORS, so the UI can talk to the backend without
  changing much code.
- Add OpenAPI-generated types/clients later to harden type coverage and reduce drift.

## Environments and configuration

- Add an env var used by the browser (hence NEXT_PUBLIC_ prefix):
    - NEXT_PUBLIC_API_BASE_URL=http://localhost:8082/v1
- Where to set it:
    - Local dev: create .env.local with the line above.
    - Windows one-off dev session: `set NEXT_PUBLIC_API_BASE_URL=http://localhost:8082/v1 && npm run dev`
    - Docker dev: pass env through docker-compose or Dockerfile.dev as needed.

Optional: Avoid CORS via a Next.js rewrite. This allows using a relative base like /api and have Next proxy to the
backend.

- next.config.ts (conceptual):
    - async rewrites() { return [{ source: '/api/:path*', destination: 'http://localhost:8082/v1/:path*' }] }
- Then set NEXT_PUBLIC_API_BASE_URL=/api
- Choose either direct base URL or the proxy; do not mix.

## Current UI API modules and endpoints

The UI has thin API wrappers in src/lib:

- enrollment-api.ts and attendance-api.ts already use NEXT_PUBLIC_API_BASE_URL.
- student-api.ts currently uses relative paths; we will align it with the same base URL.

Mock endpoints implemented via MSW (src/mocks/handlers.ts):

- Auth: /auth/session, /auth/login, /auth/logout, /auth/role
- Students: /students, /students/:id
- Classes: /classes, /classes/:id
- Enrollments: /enrollments (GET/POST), /enrollments/:id (PATCH)
- Attendance: /classes/:classId/roster, /classes/:classId/attendance (GET/POST)
- Test helpers: /test/reset

The real API will likely have similar resources under /v1. Confirm exact paths and payload shapes
in http://localhost:8082/v1/docs and adjust adapters if needed.

## Mapping plan and minimal adapter changes

1) Base URL unification

- Ensure all API modules use a common base URL (NEXT_PUBLIC_API_BASE_URL or /api if using rewrites).
- This change is backward compatible (if the env var is unset, we continue to call same-origin routes, which MSW
  intercepts).

2) Endpoint mapping checklist (verify each against /v1/docs)

- Students
    - list: GET {base}/students
    - get: GET {base}/students/{id}
    - create: POST {base}/students
    - update: PATCH {base}/students/{id}
- Classes
    - list: GET {base}/classes
    - details: GET {base}/classes/{id}
- Enrollments
    - list/filter: GET {base}/enrollments?status=&studentId=
    - create: POST {base}/enrollments
    - update status/notes: PATCH {base}/enrollments/{id}
- Attendance
    - roster: GET {base}/classes/{classId}/roster
    - get for date: GET {base}/classes/{classId}/attendance?date=YYYY-MM-DD
    - save: POST {base}/classes/{classId}/attendance { date, records[] }
- Auth (confirm exact protocol in /v1/docs)
    - session: GET {base}/auth/session (or equivalent)
    - login: POST {base}/auth/login (email/password or role-based for dev)
    - logout: POST {base}/auth/logout

3) Payload shape differences

- If the real API returns different field names or shapes, add thin mapping in the lib layer (e.g., transform snake_case
  to camelCase, normalize nullables) to keep the UI components unchanged.

## Auth strategy

- Determine auth method from /v1/docs:
    - Cookie-based session: ensure fetch includes credentials where needed (credentials: 'include'). Configure
      CORS/rewrites accordingly.
    - Bearer tokens (e.g., JWT): store access token in memory (or sessionStorage) and attach to fetch requests via
      Authorization header.
- Update src/components/AuthProvider.tsx and related auth helpers to:
    - On login, call backend login, receive user + token or cookie.
    - Persist only what’s safe (e.g., user display info) in sessionStorage if required by UI; avoid storing long-lived
      tokens in localStorage.
    - On refresh, call session endpoint (or decode cookie) to restore auth state.
- E2E considerations: the current tests depend on a role selector; for real API, add a dev-only login helper route (or a
  test-only token) if the API supports it; otherwise log in via proper credentials.

## MSW toggling and test strategy

- Keep MSW for local UI-only development and mocked Playwright tests.
- Introduce a flag to disable MSW when hitting the real API:
    - Example: `NEXT_PUBLIC_USE_MSW=false` disables worker startup.
    - Default `true` in dev to keep the old behavior.
- Playwright projects split:
    - project "mocked": default, uses MSW (as today).
    - project "api": sets NEXT_PUBLIC_API_BASE_URL=http://localhost:8082/v1, NEXT_PUBLIC_USE_MSW=false; runs against a
      running backend.
- Test data seeding for "api" project:
    - Prefer calling real backend seed endpoints if available, or running backend with predictable seed.
    - Replace calls to /test/reset with a backend-supported reset or seed command. If none exists, scope tests to
      read-only scenarios or add a safe seed.

## Step-by-step phases

Phase 0 — Prep

- Confirm API availability: open http://localhost:8082/v1/docs.
- Identify the OpenAPI JSON (often /v1/openapi.json). Note security schemes and response shapes.

Phase 1 — Base URL and MSW toggle

- Add NEXT_PUBLIC_API_BASE_URL to .env.local.
- Align student-api.ts to use the base URL, like enrollment and attendance modules.
- Add a simple feature flag NEXT_PUBLIC_USE_MSW (default true). Only start the MSW worker if true.

Phase 2 — Connectivity smoke test

- Temporarily set NEXT_PUBLIC_API_BASE_URL to backend and NEXT_PUBLIC_USE_MSW=false.
- Start dev server. Verify calls succeed in the Network tab (or via console logs) for list endpoints (students/classes).
- If CORS blocks requests, enable the Next.js rewrite proxy and switch base URL to /api.

Phase 3 — Auth integration

- Wire AuthProvider to backend login/session/logout.
- Update UI login flow to the real auth method (dev credentials or role emulation route if the API provides one).
- Validate redirect and protected routes work.

Phase 4 — Enrollments/Attendance integration

- Match payloads for enrollments and attendance. Add mapping if the backend uses different field names or enums.
- Ensure attendance date behavior matches UI expectations (YYYY-MM-DD, timezone handling).

Phase 5 — Tests split and stabilization

- Add a Playwright project for API integration testing. Seed data predictably.
- Keep existing mocked tests; mark unstable mocked scenarios for removal once parity is achieved.

Phase 6 — Rollout and cleanup

- Default dev to MSW=true; CI can run both mocked and API projects.
- After API proves stable, flip dev default to MSW=false where appropriate.
- Remove unused mock handlers gradually.

## OpenAPI code generation (optional but recommended)

- Use one of:
    - openapi-typescript to generate types:
      `npx openapi-typescript http://localhost:8082/v1/openapi.json -o src/lib/api-schema.ts`
    - orval to generate typed clients from the spec.
- Introduce a shared http client that attaches auth headers and parses errors in a consistent way. Migrate functions in
  src/lib to use the generated client.

## Error handling and observability

- Standardize jsonFetch wrapper to include base URL, default headers, optional credentials, retry policy for idempotent
  GETs, and structured errors.
- Log API failures to the console in dev; surface meaningful toast/error messages in the UI.

## Acceptance criteria

- With NEXT_PUBLIC_USE_MSW=true (default), UI works as today with mocks.
- With NEXT_PUBLIC_USE_MSW=false and NEXT_PUBLIC_API_BASE_URL=http://localhost:8082/v1, the following work end-to-end
  against the real API:
    - Auth login/logout + session restore.
    - List classes and navigate to class detail.
    - Enrollments listing and creation.
    - Attendance roster retrieval and save for a date.
- Playwright has a second project that runs against the real API and passes the above flows with predictable data.

## Quickstart commands (Windows cmd)

- Dev with mocks (current default):
    - npm run dev
- Dev against real API (direct):
    - set NEXT_PUBLIC_USE_MSW=false && set NEXT_PUBLIC_API_BASE_URL=http://localhost:8082/v1 && npm run dev
- Dev against real API (via Next.js proxy):
    - add a rewrite /api -> http://localhost:8082/v1 in next.config.ts
    - set NEXT_PUBLIC_USE_MSW=false && set NEXT_PUBLIC_API_BASE_URL=/api && npm run dev

## Notes and TODOs

- Replace /test/reset usage in tests with backend-supported seed/reset if available.
- Confirm auth scheme in /v1/docs; update AuthProvider and fetch client accordingly.
- Validate timezone for attendance dates; consider normalizing to UTC date strings.
- If the backend imposes rate-limits or request sizes, add debouncing and form payload size checks where needed.

## Dev debug header auth model (current backend behavior)

The current backend uses a development stub header instead of real sessions/tokens:

- Header: `X-Debug-User: id|role1,role2|email|name`
- No /auth/login or /auth/logout endpoints yet (calls to those will 404)
- Protected routes run auth middleware first; missing/invalid header → 401

UI support added:

- Shared fetch wrapper (`src/lib/api-client.ts`) now injects the header automatically when `NEXT_PUBLIC_USE_MSW=false`.
- Source of the header (priority order):
    1. LocalStorage key `auth:debug-user` (set when user chooses a role)
    2. Build/runtime env var `NEXT_PUBLIC_DEBUG_USER`
- `AuthProvider` builds a debug spec for a selected role (admin/teacher/parent) and stores it; then queries `/auth/me`
  to hydrate user info.

Environment variable (optional):

- `NEXT_PUBLIC_DEBUG_USER=u-admin|admin|admin@example.com|Admin User` (example) lets the container start already
  authenticated as admin.

Implications:

- 401s during early integration were caused by the header being absent, not by invalid credentials.
- 404s on `/v1/auth/login` or `/v1/auth/logout` are expected until those endpoints are implemented.

Recommended backend improvements (optional):

1. OpenAPI security scheme: document `X-Debug-User` as `apiKey` in header so tooling shows an Authorize button.
2. Stub endpoints:
    - `POST /v1/auth/login` -> Accepts JSON {id, roles, email, name}, echoes principal (dev only)
    - `POST /v1/auth/logout` -> 204 No Content
3. Add `GET /v1/enrollments` list endpoint (currently group-level middleware returns 401 before a 404 clarifies
   absence).
4. Clarify in docs: difference between 401 (missing/invalid header) vs 404 (unknown route) vs 403 (insufficient role, if
   implemented later).

Migration to real auth later:

- Replace header injection in `api-client.ts` with token/cookie strategy.
- Remove debug header UI/logic once proper OIDC/JWT or session-based auth is live.
