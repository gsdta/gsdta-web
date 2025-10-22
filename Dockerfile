# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Install UI dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Common packages
RUN apk add --no-cache libc6-compat

COPY ui/package.json ui/package-lock.json* ./
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build UI
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
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
# Stage 3: Production runtime image
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy the public folder (static assets)
COPY --from=builder /app/public ./public

# Prepare .next directory
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy Next.js standalone server and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# OCI labels
ARG VERSION=dev
ARG COMMIT=none
LABEL org.opencontainers.image.title="gsdta-web" \
      org.opencontainers.image.description="GSDTA Web Application" \
      org.opencontainers.image.source="https://github.com/gsdta/gsdta-web" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"

USER nextjs

# Expose Next.js port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run the Next.js application
CMD ["node", "server.js"]
