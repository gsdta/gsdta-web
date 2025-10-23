# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Install UI dependencies
# =============================================================================
FROM node:20-alpine AS ui-deps
WORKDIR /app

# Common packages
RUN apk add --no-cache libc6-compat

COPY ui/package.json ui/package-lock.json* ./
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Install API dependencies
# =============================================================================
FROM node:20-alpine AS api-deps
WORKDIR /app

# Common packages
RUN apk add --no-cache libc6-compat

COPY api/package.json api/package-lock.json* ./
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 3: Build UI
# =============================================================================
FROM node:20-alpine AS ui-builder
WORKDIR /app

COPY --from=ui-deps /app/node_modules ./node_modules
COPY ui/ .

# Build-time configuration for MSW behavior
ARG NEXT_PUBLIC_USE_MSW=false

# Disable telemetry during build and force standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

# Propagate build args to env so Next picks them up at build time
ENV NEXT_PUBLIC_USE_MSW=${NEXT_PUBLIC_USE_MSW}

RUN npm run build

# =============================================================================
# Stage 4: Build API
# =============================================================================
FROM node:20-alpine AS api-builder
WORKDIR /app

COPY --from=api-deps /app/node_modules ./node_modules
COPY api/ .

# Disable telemetry during build and force standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

RUN npm run build

# =============================================================================
# Stage 5: Production runtime image
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Install supervisor to run both UI and API
RUN apk add --no-cache supervisor

# Copy UI files
COPY --from=ui-builder /app/public ./ui/public
RUN mkdir -p ui/.next && chown nextjs:nodejs ui/.next
COPY --from=ui-builder --chown=nextjs:nodejs /app/.next/standalone ./ui/
COPY --from=ui-builder --chown=nextjs:nodejs /app/.next/static ./ui/.next/static

# Copy API files
RUN mkdir -p api/.next && chown nextjs:nodejs api/.next
COPY --from=api-builder --chown=nextjs:nodejs /app/.next/standalone ./api/
COPY --from=api-builder --chown=nextjs:nodejs /app/.next/static ./api/.next/static

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d \
  && sh -c 'cat > /etc/supervisor/conf.d/supervisord.conf << "EOF"\n[supervisord]\nnodaemon=true\nuser=root\nlogfile=/dev/null\nlogfile_maxbytes=0\n\n[program:ui]\ncommand=node server.js\ndirectory=/app/ui\nuser=nextjs\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\nenvironment=PORT="3000",HOSTNAME="0.0.0.0"\n\n[program:api]\ncommand=node server.js\ndirectory=/app/api\nuser=nextjs\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\nenvironment=PORT="3001",HOSTNAME="0.0.0.0"\nEOF'

# OCI labels
ARG VERSION=dev
ARG COMMIT=none
LABEL org.opencontainers.image.title="gsdta-web" \
      org.opencontainers.image.description="GSDTA Web Application with API" \
      org.opencontainers.image.source="https://github.com/gsdta/gsdta-web" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

# Expose both UI and API ports
EXPOSE 3000 3001

# Run supervisor to manage both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
