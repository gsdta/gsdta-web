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

### Local Development (Recommended)

**One-command start:**
```bash
./start-dev-local.sh
```

Then visit:
- **UI**: http://localhost:3000
- **Emulator UI**: http://localhost:4445
- **Sign in with**: teacher@test.com / teacher123

**Complete guide**: See `docs/local-development.md` for detailed instructions.

### Package-Specific READMEs
- UI → `ui/README.md`
- API → `api/README.md`
- Persistence → `persistence/README.md`

## Local development details
- **UI dev server**: http://localhost:3000
- **API dev server**: http://localhost:8080
- **Firebase Emulators**: Auth (9099), Firestore (8889), UI (4445)
- **Test data**: Automatically seeded (5 users, 3 students, 3 invites)
- UI proxies to API via Next.js rewrites (`/api/*` → http://localhost:8080/api/*)

## Testing
- **E2E Tests**: See `RUN-E2E-TESTS.md` for running Playwright tests locally ⭐
- **Quick E2E**: Run `./run-e2e-tests.sh` (automated script)
- UI: lint, typecheck, unit, and Playwright E2E (spawns API + UI servers automatically). See `ui/README.md`.
- API: lint, typecheck, unit, and Cucumber E2E. See `api/README.md`.

## Docs index
All docs live under `docs/`. Highlights:
- **Local Development** → `docs/local-development.md` ⭐ **START HERE**
- Architecture → `docs/architecture.md`
- UI guide → `docs/ui.md`
- CI/CD → `docs/ci-cd.md`
- Infra & Deploy to GCP → `docs/infra.md`, `docs/gcp-deploy.md`
- Custom domain → `docs/custom-domain.md`
- CORS troubleshooting → `docs/cors-troubleshooting.md`

## Quick Reference
- **Test Credentials**: admin@test.com / admin123, teacher@test.com / teacher123, parent@test.com / parent123
- **Emulator UI**: http://localhost:4445 (view test data)
- **Seed Data**: `npm run seed` (create test users and data)
- **Reset Data**: `npm run seed:clear && npm run seed`

## License
See `LICENSE`.
