# API Auth and Authorization — Current Behavior

This page documents how authentication and authorization are enforced in the API today.

## Approach

- Per-route verification using a helper (`verifyIdToken` in `api/src/lib/auth.ts`).
- No global middleware; each protected route imports and calls the helper.
- Public routes do not verify a token.

## Protected routes (examples)

- `GET /api/v1/me`
  - Requires `Authorization: Bearer <Firebase ID token>`.
  - Loads/creates user profile, returns roles/status and token fields.
  - Returns structured auth errors: `401 auth/missing-token`, `401 auth/invalid-token`, `403 auth/forbidden` (inactive status).

- `POST /api/v1/invites/accept`
  - Requires `Authorization: Bearer <Firebase ID token>`.
  - Validates request body `{ token: string }`, checks invite usability and email match, then adds the role and marks invite accepted.
  - Returns 400/404/401/403 as appropriate with structured codes (e.g., `invite/invalid-token`, `invite/not-found`, `invite/email-mismatch`).

## Public routes

- `GET /api/v1/health`, `GET /api/v1/docs`, `GET /api/v1/openapi.json` — public, no token required.
- `GET /api/v1/invites/verify?token=...` — public; returns invite details when usable or 400/404.

## CORS policy

- Dev: allows localhost and local network origins; sets `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` when allowed.
- Prod: allow-list of trusted domains (e.g., `https://www.gsdta.com`).
- OPTIONS handlers are present per route to return `204` with `Access-Control-Allow-*` headers.

## Test/development behavior

- Invite test mode: `ALLOW_TEST_INVITES=1` enables test tokens like `test-valid-token` without hitting Firestore.
- Logs avoid PII; minimal request context is logged (e.g., `requestId`, `uid`).

## Planned (optional)

- Global middleware for token verification and role mapping to reduce duplication.
- Centralized error code/types and rate limiting for sensitive endpoints.
