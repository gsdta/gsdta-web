# GSDTA Web

[![CI (develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml)
[![Deploy (main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml)

Modern web app with a Next.js UI and a Next.js-based API, shipped as one Docker image.

## Structure

```
gsdta-web/
├─ ui/   # Next.js frontend
├─ api/  # Next.js API (route handlers)
├─ persistence/ # Firestore rules and indexes
├─ docs/ # Project docs (single source of truth)
└─ Dockerfile (bundles UI + API)
```

## Start here
- Features overview → `docs/features.md`
- Role pages → `docs/roles/parent.md`, `docs/roles/teacher.md`, `docs/roles/admin.md`
- API surface → `docs/features.md#api-surface-v1`
- CI/CD → `docs/ci-cd.md`
- Docker → `docs/docker.md`

## Quick start
For package-specific steps, see module READMEs:
- UI → `ui/README.md`
- API → `api/README.md`
- Persistence → `persistence/README.md`

## Local development (summary)
- UI dev server: http://localhost:3000
- API dev server: http://localhost:8080
- UI proxy to API via Next.js rewrites (`/api/*` → http://localhost:8080/api/*)

## Testing
- UI: lint, typecheck, unit, and Playwright E2E (spawns API + UI servers automatically). See `ui/README.md`.
- API: lint, typecheck, unit, and Cucumber E2E. See `api/README.md`.

## Docs index
All docs live under `docs/`. Highlights:
- Architecture → `docs/architecture.md`
- UI guide → `docs/ui.md`
- Infra & Deploy to GCP → `docs/infra.md`, `docs/gcp-deploy.md`
- Custom domain → `docs/custom-domain.md`
- CORS troubleshooting → `docs/cors-troubleshooting.md`

## License
See `LICENSE`.
