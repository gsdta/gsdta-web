# GSDTA API (Next.js)

This package contains the Next.js-based API for the application.

## Quick start

```cmd
npm install
npm run dev
```

- Dev server: http://localhost:8080
- Base path: `/api/v1/*`

Production build/start:

```cmd
npm run build
npm start
```

## Key endpoints (v1)
- `GET /api/v1/health` — readiness/health
- `GET /api/v1/openapi.json` — OpenAPI spec
- `GET /api/v1/docs` — API docs pages
- `GET /api/v1/me` — current user profile (auth required)
- `GET /api/v1/invites/verify?token=...` — verify teacher invite (public)
- `POST /api/v1/invites/accept` — accept invite (auth required)
- `POST /api/v1/invites` — create teacher invite (admin only)

## Security
- Token verification via Firebase Admin SDK
- Reusable `requireAuth()` guard enforces active status and roles
- Rate limiting on invite endpoints (verify/accept/create)
- CORS allow-list with per-route OPTIONS handlers

## Tests
```cmd
npm run lint
npm run typecheck
npm test                 :: unit tests
npm run test:e2e         :: Cucumber e2e (if configured)
```

## Docs
- Features overview: `../docs/features.md`
- API surface: `../docs/features.md#api-surface-v1`
- CI/CD: `../docs/ci-cd.md`
- Docker: `../docs/docker.md`
