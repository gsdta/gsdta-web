# GSDTA Web

[![UI E2E (develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/gsdta/gsdta-web/actions/workflows/ci.yml)
[![UI E2E (main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/gsdta/gsdta-web/actions/workflows/deploy.yml)

This repository contains the UI (Next.js) for the GSDTA web application.

## 📁 Structure

```
gsdta-web/
├── ui/              # Next.js frontend application
│   ├── src/         # React components, pages, lib
│   ├── public/      # Static assets
│   ├── tests/       # E2E and unit tests
│   └── package.json
├── docs/            # Project documentation
├── .github/         # CI/CD workflows
└── Dockerfile       # Deployment image
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Docker** (optional) - [Download](https://www.docker.com/products/docker-desktop)

### Local Development

**UI:**

```cmd
cd ui
copy .env.example .env.local
npm install
npm run dev
```

UI runs on http://localhost:3000

#### Use helper scripts

```cmd
REM Start UI
dev.bat ui
```

#### Docker Development Mode

```cmd
docker-compose --profile dev up
```

- UI: http://localhost:3001

## 🔨 Build

### Build UI

```cmd
build.bat
```

**Or:**

```cmd
cd ui
npm run build
REM Output: ui\.next\ (standalone server)
```

**Docker (Production):**

```cmd
docker build -t gsdta-web:latest .
docker run -p 3000:3000 gsdta-web:latest
```

## 🧪 Testing

### Test Everything

```cmd
test.bat
```

### Test Individually

**API Tests:**

```cmd
cd api
scripts\test.bat
REM Or: go test ./... -v
```

**UI Unit Tests:**

```cmd
cd ui
npm test
```

**UI E2E Tests (Playwright):**

```cmd
cd ui
npm run pw:install  # First time only
npm run test:e2e
```

**API Linting:**

```cmd
cd api
scripts\lint.bat
REM Requires: golangci-lint (https://golangci-lint.run/)
```

**UI Linting:**

```cmd
cd ui
npm run lint
npm run typecheck
```

## 🐳 Docker

### Production (Single Container)

```bash
docker-compose up --build -d ui
# Access: http://localhost:3000
```

### Development (Hot Reload)

```cmd
docker-compose --profile dev up --build

REM UI: http://localhost:3001
```

```bash
docker-compose --profile dev up --build -d
# UI: http://localhost:3001
- [Architecture Overview](./docs/architecture.md)
- [UI Development Guide](./docs/ui.md)
- [Docker Setup](./DOCKER.md)
- [Infrastructure & Deployment](./docs/infra.md)
- [Restructure Guide](./RESTRUCTURE_COMPLETE.md)

## 🚢 Deploy

See deployment documentation for hosting options.

## 🌐 Custom Domain on AWS Route 53 (gsdta.com)

If your domain is registered/hosted in AWS Route 53 (e.g., `gsdta.com`), you can point it to your Cloud Run service.

Recommended pattern: use a subdomain like `app.gsdta.com` for the app. Keep the root (`gsdta.com`) free to redirect or host a landing page.

### Steps

1) Prerequisites
   - Cloud Run service deployed (from CI or manual). Note its region and service name.
   - Route 53 public hosted zone for `gsdta.com`.

2) Verify domain ownership in Google

```cmd
REM Replace with your domain
gcloud domains verify gsdta.com
```

Alternatively, verify via the Google Search Console UI. You’ll be asked to add a TXT record in Route 53; add it and wait until Google shows the domain as verified.

3) Create a domain mapping in Cloud Run for a subdomain (e.g., `app.gsdta.com`)

Note: Regional domain mappings may require the `beta` track depending on your gcloud version. If needed, install/update beta:

```cmd
gcloud components update
gcloud components install beta
```

Then create the mapping (regional):

```cmd
gcloud beta run domain-mappings create ^
  --service gsdta-web ^
  --domain app.gsdta.com ^
  --region us-central1
```

4) Add DNS records in Route 53
   - The previous command outputs the DNS records (typically a CNAME) to add for `app.gsdta.com`.
   - In the hosted zone for `gsdta.com`, create the records exactly as shown.
   - Save changes. DNS propagation may take a while.

5) Wait for HTTPS certificate provisioning

```cmd
gcloud beta run domain-mappings describe --domain app.gsdta.com --region us-central1
```

Proceed once the certificate status is Active. Then visit: `https://app.gsdta.com`

For a detailed, Windows-friendly walkthrough (cmd and PowerShell) with troubleshooting, see [docs/custom-domain.md](./docs/custom-domain.md).

6) Optional: redirect apex root (`gsdta.com`) → `https://app.gsdta.com`
   - Easiest: create a small redirect using an S3 static website + Route 53, or use your registrar’s URL forwarding.
   - Avoid pointing the apex directly unless you follow Google’s guidance for apex mappings. Using a subdomain is simpler.

7) Optional: CORS settings (only if exposing API directly)
   - In this single-container setup, the UI proxies API calls internally, so CORS isn’t needed.
   - If you expose the API separately, set `CORS_ALLOWED_ORIGINS=https://app.gsdta.com` on the API.

## 🏗️ Architecture

- **UI**: Next.js 14+ with App Router, React Server Components
- **API**: Go with Chi router, PostgreSQL/in-memory storage
- **Deployment**: Single Docker image running both services
    - Next.js serves on port 3000 (public)
    - Go API runs on port 8080 (internal)
    - Next.js proxies `/api/*` to internal Go API

## 🔧 Environment Variables

### API (.env in api/)

```env
APP_ENV=development
PORT=8080
LOG_LEVEL=debug
CORS_ALLOWED_ORIGINS=http://localhost:3000
SEED_ON_START=true
MIGRATE_ON_START=false
DATABASE_URL=postgres://user:pass@host:5432/gsdta?sslmode=disable
```

### UI (.env.local in ui/)

```env
NEXT_PUBLIC_USE_MSW=false
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_BASE_URL=http://localhost:8080/v1
```

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make changes in `api/` or `ui/` directories
3. Run tests: `test.bat`
4. Run linting: `npm run lint` (UI) and `scripts\lint.bat` (API)
5. Create a pull request

The CI pipeline will automatically:

- Build and test the API
- Build and test the UI
- Build the unified Docker image

## 📝 License

See [LICENSE](./LICENSE) for details.

## 🔗 API Endpoints

- `GET /healthz` - Health check
- `GET /v1/version` - API version info
- `GET /v1/students` - List students
- `GET /v1/classes` - List classes
- `POST /v1/enrollments` - Create enrollment
- See [API docs](./api/README.md) for full endpoint list

## 💡 Tips

- Use `dev.bat` scripts for quick local development
- API uses in-memory storage by default (fast, but data resets)
- Set `DATABASE_URL` to use PostgreSQL for persistent storage
- The monorepo builds API **first**, then UI in Docker
- Both services run in a single container for production deployment
