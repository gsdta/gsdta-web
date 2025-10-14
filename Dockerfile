# Use the official Node.js 20 image as the base image
FROM node:20-alpine AS base

# Common packages
RUN apk add --no-cache libc6-compat

# Install all dependencies (including dev) ignoring scripts for safe CI/Husky
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build and force standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

RUN npm run build

# Production runtime image
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

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run the application
CMD ["node", "server.js"]
