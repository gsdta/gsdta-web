# Docker Setup for GSDTA Web (Monorepo: UI + API)

This app ships as a single Docker image that runs two processes:

- **Next.js server** on port 3000 (public)
- **Go API** on port 8080 (internal)

The build process **builds the API first**, then the UI. Next.js proxies browser requests from `/api/...` to the
internal Go API at `http://localhost:8080/v1/...`, avoiding CORS.

## Prerequisites

- Docker Desktop
- Docker Compose (included in Docker Desktop)

## Quick Start

### Production (Single Container)

Build and run the combined image:

```cmd
cd /d C:\projects\gsdta\gsdta-web
docker-compose up --build -d ui
```

Or use the helper script:

```cmd
docker.bat build
docker.bat run
```

Open http://localhost:3000

Health check endpoints:

- UI: http://localhost:3000/health
- API (proxied): http://localhost:3000/api/healthz → internally maps to `http://localhost:8080/v1/healthz`

Stop and clean:

```cmd
docker-compose down
```

### Development (Hot Reload for Both API + UI)

Run two containers: Next dev server (port 3001) and a Go API dev container with hot reload.

```cmd
docker-compose --profile dev up --build -d
```

Or use the helper script:

```cmd
docker.bat run-dev
```

- **UI**: http://localhost:3001
- **API**: internal at `api-dev:8080`

Stop dev:

```cmd
docker-compose --profile dev down
```

## Build Process

The Dockerfile uses a multi-stage build that **builds the API first**:

1. **Stage 1**: Build Go API binary with version metadata
    - Uses `golang:1.21-alpine`
    - Injects version info via ldflags
    - Creates static binary at `/out/api`
    - Copies `gsdta.sql` for migrations

2. **Stage 2**: Install UI dependencies
    - Uses `node:20-alpine`
    - Runs `npm ci` in `ui/` folder

3. **Stage 3**: Build UI
    - Builds Next.js with standalone output
    - Configured to proxy `/api` to internal Go API

4. **Stage 4**: Production runtime
    - Copies API binary and schema
    - Copies Next.js standalone server
    - Uses `tini` for proper process management
    - Runs both processes via `entrypoint.sh`

## How It Works

- `ui/next.config.ts` defines a rewrite from `/api/:path*` → `${BACKEND_BASE_URL}/:path*`
- In the single-image build, `BACKEND_BASE_URL` is set to `http://localhost:8080/v1`
- Browser request to `/api/students` → Next.js proxies to `http://localhost:8080/v1/students` inside the container
- The image runs both processes using `tini` and `entrypoint.sh` for supervision

## Files

- `Dockerfile` – Multi-stage build (API first, then UI); final image runs both
- `entrypoint.sh` – Starts Go API and Next.js, forwards signals, exits if either dies
- `docker-compose.yml` – Defines:
    - `ui` (production-like, single container)
    - `ui-dev` and `api-dev` (development profile)
- `ui/` – Next.js frontend application
- `api/` – Go API with full CRUD operations

## Environment Variables

### Build-Time Arguments

These are baked into the Docker image:

```dockerfile
# UI configuration
NEXT_PUBLIC_USE_MSW=false
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_BASE_URL=http://localhost:8080/v1

# Version metadata (optional)
VERSION=dev
COMMIT=none
BUILDTIME=unknown
```

### Runtime Environment (docker-compose.yml)

**Production (`ui` service):**

```yaml
# Next.js
- NODE_ENV=production
- PORT=3000
- NEXT_PUBLIC_API_BASE_URL=/api
- BACKEND_BASE_URL=http://localhost:8080/v1

# API
- API_PORT=8080
- APP_ENV=production
- LOG_LEVEL=info
- CORS_ALLOWED_ORIGINS=*
- SEED_ON_START=false
- MIGRATE_ON_START=false

# Optional: PostgreSQL
# - DATABASE_URL=postgres://user:pass@host:5432/gsdta?sslmode=disable
```

**Development (`api-dev` + `ui-dev` services):**

```yaml
# API dev container
- APP_ENV=development
- PORT=8080
- LOG_LEVEL=debug
- CORS_ALLOWED_ORIGINS=http://localhost:3001
- SEED_ON_START=true  # Auto-seeds dev data in memory

# UI dev container
- NODE_ENV=development
- BACKEND_BASE_URL=http://api-dev:8080/v1
```

## Manual Docker Commands

Build the production image directly:

```cmd
cd /d C:\projects\gsdta\gsdta-web
docker build -t gsdta-web:latest .
```

Build with version metadata:

```cmd
docker build ^
  --build-arg VERSION=v1.0.0 ^
  --build-arg COMMIT=%git rev-parse --short HEAD% ^
  --build-arg BUILDTIME=%date% ^
  -t gsdta-web:latest .
```

Run it:

```cmd
docker run -d -p 3000:3000 --name gsdta-web gsdta-web:latest
```

Run with PostgreSQL:

```cmd
docker run -d -p 3000:3000 ^
  -e DATABASE_URL=postgres://user:pass@host:5432/gsdta?sslmode=disable ^
  -e MIGRATE_ON_START=true ^
  --name gsdta-web gsdta-web:latest
```

Logs:

```cmd
docker logs -f gsdta-web
```

Shell into running container:

```cmd
docker exec -it gsdta-web sh
```

## Helper Scripts (Windows)

```cmd
docker.bat build      # Build production image
docker.bat run        # Run production container
docker.bat run-dev    # Run development containers
docker.bat stop       # Stop all containers
docker.bat logs       # View logs
docker.bat clean      # Stop and remove containers
```

## API Storage Modes

The API supports two storage modes:

### In-Memory (Default)

- Fast, no external dependencies
- Data resets on restart
- Auto-seeds dev data when `SEED_ON_START=true`
- Perfect for development and testing

### PostgreSQL

- Persistent storage
- Set `DATABASE_URL` environment variable
- Optionally set `MIGRATE_ON_START=true` to auto-apply schema
- Example: `postgres://user:pass@host:5432/gsdta?sslmode=disable`

## Troubleshooting

### Container starts but both services don't respond

- Check logs: `docker logs -f gsdta-web-ui-1`
- Verify healthcheck: `docker inspect gsdta-web-ui-1 | findstr health`
- The container runs two processes; both must start successfully

### API proxy not working (404 on /api/*)

- Verify Next.js rewrite config in `ui/next.config.ts`
- Check `BACKEND_BASE_URL` is set correctly
- In container, API should be at `localhost:8080`
- Test API directly: `docker exec gsdta-web-ui-1 wget -O- localhost:8080/v1/healthz`

### Build fails on API stage

- Ensure `api/go.mod` and `api/go.sum` are present
- Run `go mod tidy` in `api/` folder locally
- Check Go version matches Dockerfile (1.21+)

### Build fails on UI stage

- Ensure `ui/package-lock.json` exists
- Run `npm install` in `ui/` folder locally
- Check Node version matches Dockerfile (20+)

### Line ending issues with entrypoint.sh

- The Dockerfile normalizes CRLF → LF automatically
- If issues persist, ensure git config: `git config core.autocrlf input`
- Or add to `.gitattributes`: `*.sh text eol=lf`

### Hot reload not working in dev mode

- Ensure volumes are mounted correctly in `docker-compose.yml`
- On Windows, Docker Desktop must have access to the drive
- File watching may be slow on Windows; this is a known Docker limitation

## Production Deployment

For production deployment (e.g., Cloud Run, ECS, Kubernetes):

1. Build with version tags:
   ```cmd
   docker build --build-arg VERSION=v1.0.0 -t gsdta-web:v1.0.0 .
   ```

2. Tag for registry:
   ```cmd
   docker tag gsdta-web:v1.0.0 your-registry/gsdta-web:v1.0.0
   ```

3. Push to registry:
   ```cmd
   docker push your-registry/gsdta-web:v1.0.0
   ```

4. Deploy with environment variables for your database and any external services.

See [docs/infra.md](./docs/infra.md) for detailed deployment instructions.
