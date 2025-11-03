# Docker Usage

This app ships as a single Docker image that serves the Next.js UI and proxies to the API.

## Prerequisites
- Docker Desktop

## Build and Run (production-like)

```cmd
cd /d C:\projects\gsdta\gsdta-web
docker build -t gsdta-web:latest .
docker run -d -p 3000:3000 --name gsdta-web gsdta-web:latest
```

Open: http://localhost:3000

## Docker Compose

Production service:
```cmd
docker-compose up --build -d ui
```

Dev profile (hot reload UI on port 3001):
```cmd
docker-compose --profile dev up --build -d ui-dev
```

Stop/cleanup:
```cmd
docker-compose down
```

## Build metadata (optional)
Include version metadata in the image:
```cmd
docker build ^
  --build-arg VERSION=v1.0.0 ^
  --build-arg COMMIT=%COMMIT_SHA% ^
  --build-arg BUILDTIME=%DATE_ISO% ^
  -t gsdta-web:latest .
```

## Notes
- The UI is built with `NEXT_PUBLIC_API_BASE_URL=/api` so the container proxies API requests via Next.js rewrites.
- For cloud deployment (Cloud Run), see `docs/ci-cd.md` and `docs/gcp-deploy.md`.

