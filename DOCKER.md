# Docker Setup for GSDTA Web

This app ships as a single Docker image that runs the Next.js application.

## Prerequisites

- Docker Desktop
- Docker Compose (included in Docker Desktop)

## Quick Start

### Production (Single Container)

Build and run the image:

```cmd
cd /d C:\projects\gsdta\gsdta-web
cd /d C:\projects\gsdta\gsdta-web
cd /d C:\projects\gsdta\gsdta-web
cd /d C:\projects\gsdta\gsdta-web
Or use the helper script:

```cmd
docker-helper.bat build
docker-helper.bat run
```
cd /d C:\projects\gsdta\gsdta-web
Or use the helper script:

```cmd
docker-helper.bat build
docker-helper.bat run
```
docker-compose up --build -d ui
Or use the helper script:

```cmd
docker-helper.bat build
docker-helper.bat run
```
```
Or use the helper script:

```cmd
docker-helper.bat build
docker-helper.bat run
```

Or use the helper script:

docker-helper.bat run-dev
docker-helper.bat build
docker-helper.bat run
```

Stop dev:

```cmd
docker-compose --profile dev down

Open http://localhost:3000

docker-helper.bat run-dev

- UI: http://localhost:3000/health


Stop dev:

```cmd
docker-compose --profile dev down
Stop and clean:

```cmd
docker-helper.bat run-dev
```

### Development (Hot Reload)

Stop dev:

```cmd
docker-compose --profile dev down

Run dev container with Next dev server (port 3001).

```cmd
docker-compose --profile dev up --build -d
```

Or use the helper script:

```cmd
```bash
```

- **UI**: http://localhost:3001
```

## Build Process

The Dockerfile uses a multi-stage build:

1. **Stage 1**: Install UI dependencies
    - Uses `node:20-alpine`
    - Runs `npm ci` in `ui/` folder

2. **Stage 2**: Build UI
    - Builds Next.js with standalone output

3. **Stage 3**: Production runtime
    - Copies Next.js standalone server
    - Runs as non-root user

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

- **`Dockerfile`** - Multi-stage build for production Next.js application
- **`Dockerfile.dev`** - Development image with hot reload
- **`docker-compose.yml`** - Defines:
    - `ui` (production service)
    - `ui-dev` (development profile)
Optional build arguments:

# Version metadata (optional)
### Runtime Environment (docker-compose.yml)

**Production (`ui` service):**


# MSW for testing (default: false)
NEXT_PUBLIC_USE_MSW=false
```yaml
# Next.js
### Runtime Environment
- PORT=3000
- NEXT_PUBLIC_API_BASE_URL=/api
- BACKEND_BASE_URL=http://localhost:8080/v1

- API_PORT=8080
- NEXT_PUBLIC_USE_MSW=false
- APP_ENV=development
- PORT=8080
**Development (`ui-dev` service):**
- CORS_ALLOWED_ORIGINS=http://localhost:3001
- SEED_ON_START=true  # Auto-seeds dev data in memory
Build the production image directly:
- NEXT_PUBLIC_USE_MSW=false
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
## Docker Commands

Build the production image:

```bash
  -e DATABASE_URL=postgres://user:pass@host:5432/gsdta?sslmode=disable ^
  -e MIGRATE_ON_START=true ^
  --name gsdta-web gsdta-web:latest
```

```bash
docker build \
  --build-arg VERSION=v1.0.0 \
  --build-arg COMMIT=$(git rev-parse --short HEAD) \
  --build-arg BUILDTIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \

Shell into running container:

Run the container:
docker exec -it gsdta-web sh
```bash

## Helper Scripts (Windows)

View logs:

```bash

### In-Memory (Default)

- Fast, no external dependencies
- Data resets on restart
```bash
- Perfect for development and testing
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
### Container not responding
- File watching may be slow on Windows; this is a known Docker limitation
Check logs:
```bash
docker logs -f gsdta-web-ui-1
```
## Production Deployment
Verify healthcheck:
```bash
docker inspect gsdta-web-ui-1
```
   ```cmd
### Build fails
   ```
Ensure dependencies are installed:
- `ui/package-lock.json` exists
   ```cmd
   docker push your-registry/gsdta-web:v1.0.0
   ```
