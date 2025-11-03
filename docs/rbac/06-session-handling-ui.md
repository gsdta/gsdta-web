# Session Handling (UI) — Current Behavior

This page documents how the UI manages session state today in both mock and Firebase modes.

## Modes

- Mock mode (default in local dev/test)
  - Controlled by `NEXT_PUBLIC_AUTH_MODE=mock` and `NEXT_PUBLIC_USE_MSW` (mock service worker for `/auth/*`).
  - Auth state is stored in `sessionStorage` under key `auth:user` and hydrated on load.
  - The debug principal can be set via `X-Debug-User` (when MSW disabled) or MSW endpoints (when enabled).

- Firebase mode
  - Controlled by `NEXT_PUBLIC_AUTH_MODE=firebase`. Firebase Web SDK is loaded lazily.
  - We subscribe to `onAuthStateChanged` and `onIdTokenChanged`.
  - The current Firebase ID token is exposed to `apiFetch` via `setAuthTokenProvider`, so API calls can send `Authorization: Bearer <idToken>`.

## Boot

- On mount, `AuthProvider` hydrates the user from `sessionStorage` if present.
- Depending on mode:
  - Mock: reads session from MSW at `/auth/session` when `NEXT_PUBLIC_USE_MSW` is enabled; otherwise falls back to a legacy `/auth/me` endpoint if present.
  - Firebase: after Firebase emits a user, fetches `/api/v1/me` (via `apiFetch` and `EFFECTIVE_BASE_URL`) to resolve roles/status and cache a mapped user in `sessionStorage`.

## Role-based landing

- After sign-in (Firebase mode) or explicit login (mock mode), routes consult the `AuthProvider` user and redirect based on role(s):
  - parent → `/parent`, teacher → `/teacher`, admin → `/admin`, otherwise `/`.
- `/api/v1/me` returns roles and status; UI currently picks a primary role for routing.

## Networking

- Client requests use `apiFetch`, which joins paths to `EFFECTIVE_BASE_URL` (either an absolute base URL or `/api` for Next.js proxy).
- In tests/e2e, `NEXT_PUBLIC_API_BASE_URL=/api` and the UI proxy forwards to the local API on port 8080.

## Notes

- Email verification is available via Firebase user tokens; the API’s `/v1/me` response also includes `emailVerified`.
- The current design uses client-side guards; SSR/route-level guards are planned separately.
