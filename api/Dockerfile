# syntax=docker/dockerfile:1

# Build stage
FROM golang:1.21-alpine AS build
WORKDIR /src

# Tools for versioning and certs (git optional, certs for HTTPS)
RUN apk add --no-cache git ca-certificates tzdata

# Enable BuildKit target variables
ARG TARGETOS
ARG TARGETARCH

# Version metadata (can be overridden at build time)
ARG VERSION=dev
ARG COMMIT=none
ARG BUILDTIME=unknown

# Go module deps first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Inject version info via -ldflags and build a static binary
ENV PKG=github.com/gsdta/api
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags "-s -w -X ${PKG}/internal/version.Version=${VERSION} -X ${PKG}/internal/version.Commit=${COMMIT} -X ${PKG}/internal/version.BuildTime=${BUILDTIME}" \
    -o /out/api ./cmd/api

# Runtime stage
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app

# OCI labels
ARG VERSION=dev
ARG COMMIT=none
LABEL org.opencontainers.image.title="gsdta-api" \
      org.opencontainers.image.description="GSDTA API service" \
      org.opencontainers.image.source="https://github.com/${GITHUB_REPOSITORY}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

# Copy binary
COPY --from=build /out/api /app/api

# Copy schema file so MIGRATE_ON_START=true works inside the container
COPY --from=build /src/gsdta.sql /app/gsdta.sql

# Safe runtime defaults (override via -e at runtime)
EXPOSE 8080
ENV PORT=8080 \
    APP_ENV=production \
    LOG_LEVEL=info \
    MIGRATE_ON_START=false \
    SEED_ON_START=false

USER nonroot:nonroot
ENTRYPOINT ["/app/api"]
