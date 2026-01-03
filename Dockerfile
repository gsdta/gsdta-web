# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Install dependencies from workspace root
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Common packages
RUN apk add --no-cache libc6-compat

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/
COPY api/package.json ./api/
COPY scripts/package.json ./scripts/
COPY packages/shared-core/package.json ./packages/shared-core/
COPY packages/shared-firebase/package.json ./packages/shared-firebase/

# Copy shared packages source (needed for workspace resolution)
COPY packages/shared-core/ ./packages/shared-core/
COPY packages/shared-firebase/ ./packages/shared-firebase/

# Install all workspace dependencies at once
RUN pnpm install --frozen-lockfile --ignore-scripts

# Install platform-specific native binaries for Linux Alpine (musl)
RUN if [ "$(uname -m)" = "x86_64" ]; then \
      pnpm add -w --save-dev \
        lightningcss-linux-x64-musl \
        @tailwindcss/oxide-linux-x64-musl; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
      pnpm add -w --save-dev \
        lightningcss-linux-arm64-musl \
        @tailwindcss/oxide-linux-arm64-musl; \
    fi

# =============================================================================
# Stage 2: Build UI
# =============================================================================
FROM node:20-alpine AS ui-builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy node_modules from deps stage (hoisted at root)
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace config for resolution
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy shared packages (workspace dependencies)
COPY --from=deps /app/packages ./packages

# Copy UI source
COPY ui/ ./ui/

# Build-time configuration - these MUST be set at build time for NEXT_PUBLIC_ vars
ARG NEXT_PUBLIC_USE_MSW=false
ARG NEXT_PUBLIC_AUTH_MODE=mock
ARG NEXT_PUBLIC_API_BASE_URL=/api
# Firebase public config (baked into client)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

# Disable telemetry during build and force standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

# Propagate build args to env so Next picks them up at build time
ENV NEXT_PUBLIC_USE_MSW=${NEXT_PUBLIC_USE_MSW}
ENV NEXT_PUBLIC_AUTH_MODE=${NEXT_PUBLIC_AUTH_MODE}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}

# Validate presence of required Firebase config at build time (only in firebase mode)
RUN set -eu \
  && if [ "${NEXT_PUBLIC_AUTH_MODE}" = "firebase" ]; then \
       [ -n "${NEXT_PUBLIC_FIREBASE_API_KEY:-}" ] && \
       [ -n "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" ] && \
       [ -n "${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" ] && \
       [ -n "${NEXT_PUBLIC_FIREBASE_APP_ID:-}" ] || \
       (echo "ERROR: Missing one or more NEXT_PUBLIC_FIREBASE_* build args (auth mode: firebase). Aborting UI build." >&2; exit 1); \
     else \
       echo "Skipping Firebase config check (auth mode: ${NEXT_PUBLIC_AUTH_MODE})."; \
     fi

WORKDIR /app/ui

RUN pnpm build

# =============================================================================
# Stage 3: Build API
# =============================================================================
FROM node:20-alpine AS api-builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy node_modules from deps stage (hoisted at root)
COPY --from=deps /app/node_modules ./node_modules

# Copy API source
COPY api/ ./api/

# Disable telemetry during build and force standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone
# NODE_ENV=production required for API's next.config.ts to enable standalone output
ENV NODE_ENV=production

WORKDIR /app/api
RUN pnpm build

# =============================================================================
# Stage 4: Production runtime image
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Install supervisor to run both UI and API
RUN apk add --no-cache supervisor

# Copy UI standalone output (includes node_modules, packages/, and ui/ with server.js)
# With outputFileTracingRoot set to monorepo root, standalone contains the full workspace structure
COPY --from=ui-builder --chown=nextjs:nodejs /app/ui/.next/standalone ./
# Copy static files and public assets (not included in standalone output)
COPY --from=ui-builder --chown=nextjs:nodejs /app/ui/.next/static ./ui/.next/static
COPY --from=ui-builder /app/ui/public ./ui/public

# Copy API files
RUN mkdir -p api/.next && chown nextjs:nodejs api/.next
COPY --from=api-builder --chown=nextjs:nodejs /app/api/.next/standalone ./api/
COPY --from=api-builder --chown=nextjs:nodejs /app/api/.next/static ./api/.next/static
# Copy full api node_modules to ensure all transitive deps (like is-stream) are available
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./api/node_modules

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d \
  && cat > /etc/supervisor/conf.d/supervisord.conf <<'EOF'
[supervisord]
nodaemon=true
user=root
logfile=/dev/null
logfile_maxbytes=0

[program:ui]
command=node server.js
directory=/app/ui
user=nextjs
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=PORT="3000",HOSTNAME="0.0.0.0"

[program:api]
command=node server.js
directory=/app/api
user=nextjs
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=PORT="8080",HOSTNAME="0.0.0.0"
EOF

# OCI labels
ARG VERSION=dev
ARG COMMIT=none
LABEL org.opencontainers.image.title="gsdta-web" \
      org.opencontainers.image.description="GSDTA Web Application with API" \
      org.opencontainers.image.source="https://github.com/gsdta/gsdta-web" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

# Expose UI and API ports
EXPOSE 3000 8080

# Run supervisor to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
