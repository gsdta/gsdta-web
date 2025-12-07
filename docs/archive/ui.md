# UI Guide (Next.js)

This page summarizes how the UI is structured and how to run and test it.

## Overview
- Framework: Next.js (App Router)
- Port (dev): 3000
- API access: `NEXT_PUBLIC_API_BASE_URL` — typically `/api` so the Next.js proxy reaches the API
- Auth modes:
  - `mock` (default for local/test)
  - `firebase` (production)

## Run locally
```cmd
cd ui
npm install
npm run dev
```

## Build and start
```cmd
cd ui
npm run build
npm start
```

## Testing
- Lint and typecheck:
```cmd
npm run lint
npm run typecheck
```
- Playwright e2e (spawns API + UI servers automatically):
```cmd
npm run e2e:ci
```

## Configuration
- `.env.local` in `ui/` controls:
  - `NEXT_PUBLIC_AUTH_MODE` — `mock` or `firebase`
  - `NEXT_PUBLIC_API_BASE_URL` — base URL for API calls (often `/api`)
  - `NEXT_PUBLIC_USE_MSW` — enable MSW for `/auth/*` in mock mode

## Features
For current features and role-specific behavior, see:
- Features overview: `./features.md`
- Roles: `./roles/parent.md`, `./roles/teacher.md`, `./roles/admin.md`

## Notes
- PDFs use pdf.js worker copied during postinstall.
- The UI proxy is defined in `ui/next.config.ts` rewrites.
