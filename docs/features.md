# Product Features Overview

Last updated: 2025-11-02

This document summarizes the currently implemented features across the UI and API. For role-specific detail, see:
- Parent role → [roles/parent.md](./roles/parent.md)
- Teacher role → [roles/teacher.md](./roles/teacher.md)
- Admin role → [roles/admin.md](./roles/admin.md)

Related design/planning references:
- RBAC Plan → [rbac-plan.md](./rbac-plan.md)
- RBAC series → [rbac/](./rbac/)

## Public Site (UI)
Public pages are available without login. Current pages (covered by E2E tests):
- Home (English/Tamil), mobile header behavior
- About (English/Tamil)
- Calendar (English/Tamil)
- Documents (English/Tamil) with embedded PDF rendering
- Donate (English/Tamil)
- Team (English/Tamil) with images
- Textbooks (English/Tamil) — load grade/semester content
- Register page (English/Tamil) with client-side validation

Notes
- UI uses Next.js App Router. Images are unoptimized for static builds.
- Base URL for API calls is configured via `NEXT_PUBLIC_API_BASE_URL` (often set to `/api` so UI proxies to the API).

## Authentication and Sessions
Two modes exist to support development and production:
- Mock mode (default for local dev/tests)
  - `NEXT_PUBLIC_AUTH_MODE=mock`. Optional MSW (Mock Service Worker) for `/auth/*` endpoints.
  - Debug principals can be set; role-based routing enforced client-side.
- Firebase mode
  - `NEXT_PUBLIC_AUTH_MODE=firebase` enables Firebase Web SDK.
  - Client fetches `/api/v1/me` with `Authorization: Bearer <idToken>` to resolve roles/status.
  - Session is cached in `sessionStorage` and hydrated on load.

See: [rbac/06-session-handling-ui.md](./rbac/06-session-handling-ui.md)

## RBAC and Roles
System roles: parent, teacher, admin. High-level behavior:
- Parent signup is allowed; teacher/admin accounts are invite-based.
- Role-based routing in the UI directs users to `/parent`, `/teacher`, or `/admin` after sign-in.

Role details: [roles/parent.md](./roles/parent.md), [roles/teacher.md](./roles/teacher.md), [roles/admin.md](./roles/admin.md)

## Teacher Invite Flow
Endpoints (v1):
- Verify invite (public): `GET /api/v1/invites/verify?token=...`
  - Returns invite details when usable (id, email, role, status, expiresAt).
  - Test mode: `ALLOW_TEST_INVITES=1` enables `test-*` tokens.
  - Rate limited (20/min/IP). CORS allow-list enforced.
- Accept invite (authenticated): `POST /api/v1/invites/accept` with body `{ token }`
  - Requires Firebase ID token; signed-in email must match invite email.
  - Adds the role and marks the invite accepted.
  - Blocks users with non-active status.
  - Rate limited (10/min/IP). CORS allow-list enforced.
- Create invite (admin-only): `POST /api/v1/invites`
  - Requires admin role; creates a teacher invite with TTL and token.
  - Rate limited (30/hour/IP). CORS allow-list enforced.

UI behavior
- Invite verification page shows details and prompts sign-in if needed.
- Acceptance flow requires authentication; on success, routes to `/teacher`.

## User Profile
- `GET /api/v1/me` (authenticated) merges Firebase token fields with Firestore profile.
- Auto-creates parent profile on first sign-in (per policy).

## Security Measures
- Token verification helper and reusable guard
  - `verifyIdToken()` validates tokens.
  - `requireAuth()` loads profile and enforces status/role gating (used by protected endpoints).
- Abuse throttling
  - In-memory per-IP limiter for verify/accept/create invite endpoints; sets `Retry-After` on 429.
- CORS policy
  - Development: localhost/local network allowed.
  - Production: allow-list (e.g., https://www.gsdta.com).
- Minimal request logging middleware
  - Assigns `x-request-id` and logs method/path/IP for `/api/v1/*`.

## Testing Coverage
- E2E (Playwright): public pages, auth mocks, signup validation, teacher invite verification and error states.
- API e2e/unit tests: invites and users library; endpoint health.

## Deployment Notes
- UI/API can run locally with the UI proxying to the API.
- CI runs Playwright against a locally started API (test mode) and UI.
- For production, prefer a shared rate-limit store and real Firebase credentials via secure secrets.

