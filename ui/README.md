# UI (Next.js)

This package contains the Next.js frontend.

## Quick start

```cmd
npm install
npm run dev
```

- Dev server: http://localhost:3000
- E2E will auto-start a production build on port 3100 when run from this package.

## Scripts
- `npm run dev` — start dev server
- `npm run build` / `npm start` — production build/start
- `npm run lint` / `npm run typecheck` — static checks
- `npm test` — unit tests (if any)
- `npm run e2e:ci` — Playwright E2E tests

## Configuration
- Environment: `ui/.env.local`
  - `NEXT_PUBLIC_AUTH_MODE` — `mock` (default) or `firebase`
  - `NEXT_PUBLIC_API_BASE_URL` — usually `/api` so the Next.js proxy is used
  - `NEXT_PUBLIC_USE_MSW` — enable mock service worker for `/auth/*`

## Docs
- Features overview: `../docs/features.md`
- UI notes: `../docs/ui.md`
- Roles: `../docs/roles/parent.md`, `../docs/roles/teacher.md`, `../docs/roles/admin.md`
- API surface used by the UI: `../docs/features.md#api-surface-v1`
