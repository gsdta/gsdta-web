# Restructuring Complete ✅

This document summarizes the monorepo restructuring completed on October 15, 2025.

## What Changed

The repository has been restructured from a UI-only repository to a monorepo containing both UI and API:

### Before

```
gsdta-web/
├── src/           # Next.js source
├── public/        # Static assets
├── tests/         # E2E tests
├── package.json   # UI dependencies
└── ...            # UI config files
```

### After

```
gsdta-web/
├── ui/            # Next.js application (all UI code moved here)
│   ├── src/
│   ├── public/
│   ├── tests/
│   ├── package.json
│   └── ...
├── api/           # Go backend API (integrated from separate repo)
│   ├── cmd/       # Application entrypoints
│   ├── internal/  # Internal packages (config, http, store, etc.)
│   ├── scripts/   # Build/dev/test scripts (Windows .bat files)
│   ├── go.mod     # Go dependencies
│   └── gsdta.sql  # Database schema
├── docs/          # Project documentation
├── .github/       # CI/CD workflows (unified for both API + UI)
└── Docker files   # Single-image deployment configs (builds API first)
```

## Files Updated

### Docker Configuration

- ✅ **Dockerfile** - Complete rewrite with multi-stage build:
    - **Stage 1**: Builds Go API first with version metadata injection
    - **Stage 2**: Installs UI dependencies
    - **Stage 3**: Builds UI with Next.js standalone output
    - **Stage 4**: Runtime image with both API and UI
    - Includes proper versioning via build args (VERSION, COMMIT, BUILDTIME)

- ✅ **docker-compose.yml** - Enhanced configuration:
    - Added API environment variables (APP_ENV, LOG_LEVEL, CORS_ALLOWED_ORIGINS, etc.)
    - Added version build args for proper tagging
    - Enhanced dev profile with Go tooling in api-dev container
    - Configured proper CORS and backend URLs for both modes

- ✅ **entrypoint.sh** - No changes needed (still works with new structure)

### CI/CD

- ✅ **.github/workflows/ci.yml** - Completely restructured:
    - **API-first approach**: API builds, tests, and lints before UI
    - Go setup with proper caching (go.sum)
    - API linting with golangci-lint installation
    - API tests with race detection and coverage
    - API binary build with version metadata
    - UI steps run after API validation
    - Unified Docker build with version args
    - Both Node and Go properly configured with caching

### Build Configuration

- ✅ **.dockerignore** - Unified exclusions:
    - API-specific patterns (bin/, *.exe, e2e/, seeds.sql)
    - UI-specific patterns (node_modules, .next/, test-results/)
    - Common exclusions (docs/, .github/, *.md)

- ✅ **.gitignore** - Enhanced with Go patterns:
    - Go binaries (*.exe, *.dll, *.so, *.dylib)
    - Test artifacts (*.test, *.out, coverage.out)
    - API build directory (api/bin/)
    - Preserves UI patterns from before

### Helper Scripts (New)

- ✅ **dev.bat** - Unified development script:
    - `dev.bat api` - Start API only
    - `dev.bat ui` - Start UI only
    - `dev.bat both` - Start both in Docker dev mode

- ✅ **build.bat** - Unified build script:
    - Builds both API and UI
    - Can build individually with `build.bat api` or `build.bat ui`

- ✅ **test.bat** - Unified test runner:
    - Runs all tests (API + UI)
    - Can test individually with `test.bat api` or `test.bat ui`

### Documentation

- ✅ **README.md** - Complete rewrite for monorepo:
    - Clear structure overview
    - Quick start for all development modes
    - Comprehensive build, test, and deploy instructions
    - Environment variable documentation
    - API endpoint reference
    - Tips and best practices

- ✅ **DOCKER.md** - Enhanced Docker documentation:
    - Detailed build process explanation (4-stage multi-stage build)
    - API-first build order documented
    - Comprehensive environment variable guide
    - Storage modes explained (in-memory vs PostgreSQL)
    - Extensive troubleshooting section
    - Production deployment guide

## API Integration Details

The API was copied from a separate repository and fully integrated:

### API Structure

- **Language**: Go 1.21+
- **Router**: Chi v5
- **Storage**: Dual-mode (in-memory + PostgreSQL)
- **Logging**: Zerolog with structured logging
- **Version Info**: Build-time metadata injection via ldflags

### API Features Integrated

- Health check endpoint (`/healthz`)
- Version endpoint (`/v1/version`)
- Student management
- Class management
- Enrollment operations
- In-memory storage with dev data seeding
- PostgreSQL support with migrations
- CORS middleware
- Request ID tracking
- Real IP resolution
- Panic recovery

### Build Order (Critical)

The monorepo **always builds API first**, then UI:

1. **API Build** (Stage 1 in Dockerfile)
    - Downloads Go dependencies
    - Builds static binary with version info
    - Copies database schema

2. **UI Build** (Stages 2-3 in Dockerfile)
    - Installs npm dependencies
    - Builds Next.js with standalone output
    - Configures rewrites to API

3. **Runtime** (Stage 4 in Dockerfile)
    - Combines both binaries
    - Runs both via entrypoint.sh
    - Single container, two processes

### CI/CD Build Order

GitHub Actions also builds API first:

1. Setup Node + Go (parallel)
2. **API steps** (sequential):
    - Download dependencies
    - Lint with golangci-lint
    - Test with race detection
    - Build binary with version info
3. **UI steps** (sequential):
    - Install dependencies
    - Lint
    - Typecheck
    - Unit tests
    - Build
4. Docker build (combines both)

## How to Use

### Local Development

**API Development:**

```cmd
cd api
copy .env.example .env
scripts\dev.bat
# Access at http://localhost:8080
```

**UI Development:**

```cmd
cd ui
copy .env.example .env.local
npm install
npm run dev
# Access at http://localhost:3000
```

**Both (helper script):**

```cmd
dev.bat api      # API only
dev.bat ui       # UI only
dev.bat both     # Both in Docker
```

### Docker

**Production (single container with both UI and API):**

```cmd
# Using docker-compose
docker-compose up --build -d ui
# Access at http://localhost:3000

# Using helper script
docker.bat build
docker.bat run
```

**Development (separate containers with hot reload):**

```cmd
# Using docker-compose
docker-compose --profile dev up --build -d
# UI at http://localhost:3001
# API internal at api-dev:8080

# Using helper script
docker.bat run-dev
```

### Testing

**All tests:**

```cmd
test.bat
```

**Individual:**

```cmd
test.bat api     # API only
test.bat ui      # UI only
```

### CI/CD

The GitHub Actions workflow now:

1. Sets up Node.js with cache for `ui/package-lock.json`
2. Sets up Go with cache for `api/go.sum`
3. **Runs API pipeline first**:
    - Downloads Go modules
    - Lints with golangci-lint
    - Runs tests with race detection and coverage
    - Builds API binary with version metadata
4. **Runs UI pipeline**:
    - Installs dependencies in `./ui`
    - Lints, typechecks, and tests
    - Builds Next.js
5. Builds unified Docker image with both API and UI
6. (Optional) Deploys to GCP Cloud Run

## Benefits

1. **Single Repository** - Both UI and API in one place for easier development
2. **Single Docker Image** - Deploy one container running both services
3. **API-First Build** - Ensures backend is validated before frontend
4. **Simplified Deployment** - One build, one deploy
5. **Better DX** - All code in one repo, shared documentation
6. **Unified CI/CD** - One pipeline tests and builds everything
7. **Proper Versioning** - Build metadata injected into both API and Docker image
8. **Flexible Development** - Run API/UI separately or together in Docker

## Notes

- The UI proxies `/api/*` requests to the internal Go API
- Both services run in a single container for production
- Development mode uses separate containers for hot reloading
- All paths have been updated in configs and docs
- CI/CD pipeline validates both UI and API builds
- **API always builds first** in both Docker and CI/CD
- The API has its own Dockerfile in `api/` but it's not used (unified root Dockerfile used instead)

## Next Steps

1. ✅ Structure reorganized
2. ✅ Docker configs updated (API-first multi-stage build)
3. ✅ CI/CD pipeline updated (API builds/tests before UI)
4. ✅ Documentation updated
5. ✅ Helper scripts created (dev.bat, build.bat, test.bat)
6. ✅ Unified .dockerignore and .gitignore
7. 🔲 Test local development workflow
8. 🔲 Test Docker builds (production and dev)
9. 🔲 Test CI/CD pipeline
10. 🔲 Update any environment-specific configs

## API Environment Variables

The API supports these environment variables:

```env
APP_ENV=development              # development | staging | production
PORT=8080                        # API port
LOG_LEVEL=debug                  # debug | info | warn | error
CORS_ALLOWED_ORIGINS=*           # Comma-separated origins or *
SHUTDOWN_TIMEOUT=10s             # Graceful shutdown timeout
SEED_ON_START=true               # Auto-seed dev data (in-memory only)
MIGRATE_ON_START=false           # Auto-apply schema (requires DATABASE_URL)
DATABASE_URL=                    # PostgreSQL connection string (optional)
```

## Rollback (if needed)

If you need to rollback, the old structure can be restored by:

1. Moving `ui/*` back to root
2. Removing `api/` folder
3. Reverting Docker and CI configs from git history

However, the new unified structure is recommended for easier management of both UI and API.

## API Credits

The API was originally developed in a separate repository and has been integrated into this monorepo with proper build
order and configuration management.
