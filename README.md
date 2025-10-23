# GSDTA Web

[![CI (develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml)
[![Deploy (main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml)

Modern web app with a Next.js UI and a Next.js-based API, shipped as one Docker image.

## Structure

```
gsdta-web/
├─ ui/   # Next.js frontend
├─ api/  # Next.js API (route handlers)
├─ docs/ # Project docs
└─ Dockerfile (bundles UI + API)
```

## Quick start (local)

- Prerequisites: Node.js 20+, optional Docker Desktop

UI (http://localhost:3000):

```cmd
cd ui
copy .env.example .env.local
npm install
npm run dev
```

API (http://localhost:8080):

```cmd
cd api
npm install
npm run dev
```

## Testing

UI:

```cmd
cd ui
npm run lint
npm run typecheck
npm test
npm run pw:install  
npm run test:e2e
```

API (starts server on 8080 and runs Cucumber):

```cmd
cd api
npm run lint
npm run typecheck
npm run test:e2e
```

## Docker

Production-style (UI on 3000, API on 8080):

```cmd
docker-compose up --build
```

Developer hot-reload for UI (http://localhost:3001):

```cmd
docker-compose --profile dev up --build ui-dev
```

## Configuration

- UI env file: `ui/.env.local`
  - Example: `NEXT_PUBLIC_USE_MSW=false`

## CI/CD

- Overview of workflows and deployment: see `GITHUB_ACTIONS.md`

## Docs

- Architecture: `docs/architecture.md`
- UI guide: `docs/ui.md`
- Docker setup: `DOCKER.md`
- Custom domain: `docs/custom-domain.md`
- Infra & Deploy to GCP: `docs/infra.md`, `docs/gcp-deploy.md`

## License

See `LICENSE`.
