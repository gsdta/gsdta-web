# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Build Go API
# =============================================================================
FROM golang:1.21-alpine AS api-builder
WORKDIR /src

# Install tools for versioning and certs
RUN apk add --no-cache git ca-certificates tzdata

# Build arguments for versioning
ARG TARGETOS
ARG TARGETARCH
ARG VERSION=dev
ARG COMMIT=none
ARG BUILDTIME=unknown

# Copy API source and build
COPY api/ ./
RUN go mod download

# Build API with version info injected
ENV PKG=github.com/gsdta/api
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -ldflags "-s -w -X ${PKG}/internal/version.Version=${VERSION} -X ${PKG}/internal/version.Commit=${COMMIT} -X ${PKG}/internal/version.BuildTime=${BUILDTIME}" \
    -o /out/api ./cmd/api

# =============================================================================
# Stage 2: Install UI dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Common packages
RUN apk add --no-cache libc6-compat

COPY ui/package.json ui/package-lock.json* ./
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 3: Build UI
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY ui/ .

# Build-time configuration for API and MSW behavior
ARG NEXT_PUBLIC_USE_MSW=false
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG BACKEND_BASE_URL=http://localhost:8080

# Disable telemetry during build and force standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

# Propagate build args to env so Next picks them up at build time
ENV NEXT_PUBLIC_USE_MSW=${NEXT_PUBLIC_USE_MSW}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV BACKEND_BASE_URL=${BACKEND_BASE_URL}

RUN npm run build

# =============================================================================
# Stage 4: Production runtime image
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install tini for proper signal handling of multiple processes
RUN apk add --no-cache tini

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy the public folder (static assets)
COPY --from=builder /app/public ./public

# Prepare .next directory
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy Next.js standalone server and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Go API binary and schema
COPY --from=api-builder --chown=nextjs:nodejs /out/api /app/api
COPY --from=api-builder --chown=nextjs:nodejs /src/gsdta.sql /app/gsdta.sql

# Copy entrypoint script
COPY --chown=nextjs:nodejs entrypoint.sh /entrypoint.sh
# Normalize potential CRLF line endings on Windows checkouts
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# OCI labels
ARG VERSION=dev
ARG COMMIT=none
LABEL org.opencontainers.image.title="gsdta-web" \
      org.opencontainers.image.description="GSDTA Web Application (UI + API)" \
      org.opencontainers.image.source="https://github.com/gsdta/gsdta-web" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

USER nextjs

# Expose Next.js port publicly; API remains internal
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# API runtime env
ENV API_PORT=8080
# Ensure Next proxies to internal API by default at runtime
ENV BACKEND_BASE_URL=http://localhost:8080

# Run the application via tini to manage both processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/entrypoint.sh"]
