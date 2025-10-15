# GSDTA API

[![CI](https://github.com/gsdta/api/actions/workflows/ci.yml/badge.svg)](https://github.com/gsdta/api/actions/workflows/ci.yml)

Phase 0 bootstrap for the Go API.

What you get

- Go module with basic layout:
    - cmd/api: entrypoint
    - internal/config: env config loader
    - internal/http: router + middleware
    - internal/version: build-time version info
- Endpoints:
    - GET /healthz -> 200 ok
    - GET /v1/version -> JSON: version, commit, buildTime, goVersion
- Middlewares: request ID, real IP, recovery, structured logging, CORS
- .env.example for local config
- Unit tests for health and version
- golangci-lint config and simple scripts

Prereqs

- Go 1.21+
- (optional) golangci-lint for linting

Quick start (Windows, cmd.exe)

1) Install Go: https://go.dev/dl/
2) From repo root (this folder):

```
copy .env.example .env
scripts\dev.bat
```

This starts the API on http://localhost:8080

Smoke test:

- http://localhost:8080/healthz
- http://localhost:8080/v1/version

Run tests

```
scripts\test.bat
```

Lint (if golangci-lint installed)

```
scripts\lint.bat
```

Build

```
scripts\build.bat
```

Docker (Linux container)

- Build image (with optional version metadata):

```
docker build -t gsdta-api:local .
:: optionally:
:: docker build --build-arg VERSION=0.1.0 --build-arg COMMIT=abc123 --build-arg BUILDTIME=2025-10-13T00:00:00Z -t gsdta-api:0.1.0 .
```

- Run container (in-memory store, maps port 8080):

```
docker run --rm -p 8080:8080 --name gsdta-api gsdta-api:local
```

- Run with .env file (Windows cmd.exe):

```
docker run --rm -p 8080:8080 --env-file .env --name gsdta-api gsdta-api:local
```

- Run against Postgres (and auto-migrate schema on start):

```
docker run --rm -p 8080:8080 ^
  -e DATABASE_URL=postgres://user:pass@host:5432/gsdta?sslmode=disable ^
  -e MIGRATE_ON_START=true ^
  --name gsdta-api gsdta-api:local
```

Then visit http://localhost:8080/healthz

Notes

- The container runs as non-root and exposes port 8080.
- The build is multi-stage and produces a minimal Linux image.
- The schema file gsdta.sql is included in the image so that MIGRATE_ON_START=true can apply it at startup when
  DATABASE_URL is set.
- On ARM Windows hosts, you can force amd64 build: `docker build --platform linux/amd64 -t gsdta-api:local .`

Environment

- APP_ENV: development | staging | production (default: development)
- PORT: e.g. 8080 (default: 8080)
- LOG_LEVEL: debug|info|warn|error (default: info)
- CORS_ALLOWED_ORIGINS: comma-separated list (default: http://localhost:3000)
- SHUTDOWN_TIMEOUT: e.g. 10s
- SEED_ON_START: true|false (default: true in development)
- DATABASE_URL: Postgres connection string; if set, Postgres store is used
- MIGRATE_ON_START: true|false; when true and DATABASE_URL is set, attempts to apply gsdta.sql

Makefile targets (optional if you have make)

- make dev
- make run
- make test
- make lint
- make build
- make docker
- make docker-run

Dev-only Impersonation Header

- For local development only, you can set X-Debug-User to simulate a principal:

```
X-Debug-User: <id>|<role1,role2>|<email>|<name>
```

Example:

```
X-Debug-User: u-admin|admin|admin@example.com|Admin User
```

Do not expose this header to untrusted clients in production.
