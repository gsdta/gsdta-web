# CI/CD Workflows

This project uses GitHub Actions for continuous integration and delivery. The UI and API are validated separately and the UI job depends on the API job.

## Workflows
- CI (`.github/workflows/ci.yml`)
  - Triggers: push to `develop` (docs-only changes are ignored)
  - Jobs:
    - API (Node 20): `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`/`npm run test:e2e` (if configured)
    - UI (Node 20 or Playwright container): `npm ci`, `npm run lint`, `npm run typecheck`, `npm test --if-present`, `npm run e2e:ci`
  - Playwright runs Chromium and auto-starts local API and UI servers.

- Deploy (`.github/workflows/deploy.yml`)
  - Triggers: push to `main` and manual dispatch
  - Builds and pushes a Docker image and deploys to Cloud Run
  - Supports `auth_mode` (`firebase` or `mock`) and optional image tagging

## Caching
- npm cache for both `api/package-lock.json` and `ui/package-lock.json`
- If you don’t use the Playwright container, install Chromium with:

```bash
npx playwright install --with-deps chromium
```

## Secrets and Env
- For deploy, the workflow authenticates to Google Cloud using `secrets.GCP_SA_KEY`
- Firebase public config is only required when building with `auth_mode=firebase`

## Local parity
- The Playwright config spawns an API on port 8080 in test mode and a UI on port 3100.
- The UI proxies API requests through `/api`.

For full details of endpoints and features, see `docs/features.md` (see "API Surface (v1)" section) and `docs/features.md#api-surface-v1`.
