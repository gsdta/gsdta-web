# UI — Setup and Deployment Steps (Next.js on GCP)

This guide outlines how to build and deploy the GSDTA UI using Next.js as a primarily static site hosted on GCS with
Cloud CDN, aligned with the 2025 stack and Phase 1 requirements.

## 0) Scope

- Environments: dev and prod
- Domains: dev.gsdta.org (dev UI), www.gsdta.org (prod UI)
- Region: us-west2
- Auth: OIDC (Auth0/Keycloak/Google Identity Platform). See Appendix A for Firebase Auth path.

## 1) Prerequisites

- GCP projects: gsdta-dev, gsdta-prod with billing
- Required APIs enabled (see infra.md Section 2)
- OIDC provider configured with allowed redirect URIs:
    - https://dev.gsdta.org/callback
    - https://www.gsdta.org/callback
- GitHub repo connected for CI/CD via OIDC → GCP

## 2) App Configuration (Build-time)

- Environment variables (example):
    - NEXT_PUBLIC_API_BASE_URL=https://api.dev.gsdta.org (dev), https://api.gsdta.org (prod)
    - NEXT_PUBLIC_OIDC_ISSUER=https://<issuer>
    - NEXT_PUBLIC_OIDC_CLIENT_ID=<client-id>
    - Optional SEO: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_ANALYTICS_ID
- SEO basics: titles/meta, sitemap.xml, robots.txt per environment
- YouTube embeds: use playlist IDs from admin-configured data

## 3) Local Development

- Install Node.js LTS and pnpm/npm/yarn
- Install deps, run dev server, lint/typecheck/tests before commit
- Keep accessible and mobile-first UI; follow performance budgets

## 4) Build (Static Export)

- Configure Next.js for static export (`output: 'export'`) where applicable
- Build and export to /out
- Ensure asset paths are relative or set `assetPrefix` if needed for CDN

## 5) GCS + Cloud CDN (Per Env)

1. Create GCS bucket (uniform access, Public Access Prevention ON):
    - gsdta-web-dev-PROJECT_ID, gsdta-web-prod-PROJECT_ID
2. Create HTTPS Load Balancer with Backend Bucket pointing to the above; enable Cloud CDN
3. Managed SSL certs for dev.gsdta.org and www.gsdta.org
4. Grant the load balancer/edge SA read access to the bucket (via dedicated SA like sa-cdn-backend)
5. Set cache headers on static assets; HTML typically no-cache or short TTL

## 6) Deploy Steps

- Manual (MVP):
    - Build → sync /out to the env bucket → invalidate CDN
- CI/CD (recommended):
    - On merge to main:
        - Build and export
        - Sync to bucket (delete removed files)
        - Invalidate Cloud CDN cache
    - Use GitHub Actions OIDC to impersonate sa-deployer with minimal permissions

## 7) DNS and TLS

- Point A/AAAA records to the HTTPS Load Balancer IP
- Wait for managed certs to be ACTIVE; enforce HTTPS and HSTS

## 8) Auth Integration (OIDC)

- Use OIDC PKCE flow in the UI; store tokens in memory or httpOnly cookies (backend-assisted)
- Expected scopes: openid email profile (plus custom if needed)
- During login:
    - Redirect to provider
    - On callback, exchange code and persist session (avoid localStorage for long-lived tokens)
    - Attach bearer tokens when invoking API endpoints
- Role-based UI:
    - Admin/Teacher/Parent logic determined via ID token claims or userinfo endpoint

## 9) Feature Notes (Phase 1)

- Public pages: Home, About, Programs/Levels, Policies, Contact (SEO-friendly)
- Calendars: public school-level calendar (no PII); personal calendars for signed-in users
- YouTube: embedded playlists per level or class page
- Forms: enrollment, consent—submitted to API; store PII only server-side

## 10) Observability

- Cloud CDN and Load Balancer logs available in Cloud Logging
- Optional RUM or analytics (privacy-preserving)
- Uptime checks for the frontend endpoint; alert on downtime

## 11) Acceptance Checklist

- Site serves via CDN at dev.gsdta.org/www.gsdta.org with TLS
- Redirects/rewrites work (e.g., trailing slashes, 404/500 pages)
- CDN invalidations occur on each release
- Auth flows complete and tokens reach the API
- Core pages pass Lighthouse perf/A11y thresholds

---

## Appendix A — Firebase Auth Variant

If using Firebase Auth (per requirements path):

- Configure providers (Email/Google) and allowed domains in Firebase
- Use Firebase Web SDK for auth; obtain ID tokens and attach to API calls
- Map Firebase custom claims to roles (admin/teacher/parent) for UI gating
- Keep the hosting path on GCS+CDN (or use Firebase Hosting if preferred)
