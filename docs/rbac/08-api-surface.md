# API Surface — Current Implementation and Plans

This document summarizes the API endpoints in the current codebase and the near-term planned additions.

## Implemented (v1)

- GET /api/v1/health (public)
  - Simple readiness/health response.

- GET /api/v1/docs (public)
  - Serves API documentation pages.

- GET /api/v1/openapi.json (public)
  - Generated OpenAPI spec for the API.

- GET /api/v1/me (auth required)
  - Verifies Firebase ID token (Authorization: Bearer <idToken>), loads/creates a user profile, and returns:
    - uid, email, name, roles, status, emailVerified
  - Creates a default parent profile on first sign-in (per Parent Signup Policy).

- GET /api/v1/invites/verify?token=... (public)
  - Validates an invite token and returns invite details when usable:
    - id, email, role, status, expiresAt
  - Returns 400 if token is missing; 404 when not found/expired.
  - Test mode (ALLOW_TEST_INVITES=1) supports tokens like `test-valid-token` without Firestore.

- POST /api/v1/invites/accept (auth required)
  - Body: { token: string }
  - Verifies Firebase ID token and ensures the signed-in email matches the invite email.
  - Adds the invited role to the user profile and marks the invite accepted.
  - Returns updated user profile fields (uid, email, roles, status).

Notes
- CORS: Development allows localhost origins; production allows specific domains (e.g., https://www.gsdta.com).
- Auth: Per-route verification via a helper (no global middleware), returning structured error codes for auth errors.

## Planned

- POST /api/v1/admin/invites (admin only)
  - Creates roleInvites/{id} for teacher/admin roles (requires admin role on the caller).

- Admin user management (list/search, role changes)
  - Endpoints TBD based on RBAC and operational needs.
