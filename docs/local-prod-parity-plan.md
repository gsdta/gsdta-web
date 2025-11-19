# Local–Production Parity Plan

## Goals
- Ensure every workflow that runs in production (real auth, role-based permissions, invites, data mutations) can be executed locally end-to-end.
- Provide a single entry point (`docker compose up`) that mirrors the production container (UI + API) while still enabling hot reload for day-to-day dev.
- Minimize `.env` drift between packages; define one source of truth for shared secrets and Firebase config.
- Make QA sign-off possible from the local stack by documenting parity checks and automated smoke tests.

## Current Gaps
1. **Auth differences** – Local UI defaults to `NEXT_PUBLIC_AUTH_MODE=mock` + MSW; API may skip Firebase checks entirely. Production uses real Firebase + Firestore users.
2. **Secrets management** – Firebase Admin credentials live outside repo; no documented way to load them locally besides ad‑hoc `.env` tweaks.
3. **Runtime shape** – Dev scripts run separate Next.js servers (3000 UI, 8080 API) with hot reload, but production bundles both in a single Docker image supervised together.
4. **Cloud dependencies** – No emulators configured; Firestore/Firebase interactions are disabled or mocked, so flows like invites/sign-in cannot be validated.
5. **Docs** – `docs/docker.md` and package READMEs do not explain how to reach production parity or what features are intentionally mocked.

## Proposed Approach
### Option A – **Docker-first parity stack (recommended)**
- Extend `docker-compose.yml` with a `local-prod` profile that builds the same image as Cloud Run (from `Dockerfile`) but feeds local env vars + secrets via `.env.local.prod`.
- Run Firebase Auth + Firestore emulators via official Firebase CLI sidecars; mount seed scripts to prime data.
- Provide a make/np script (`scripts/start-local-prod.sh`) that orchestrates compose + emulators + env validation.

### Option B – **Hybrid dev + emulator bridge**
- Keep `npm run dev` servers for UI and API (hot reload) but wire both to emulators by default, and gate mock mode behind explicit `NEXT_PUBLIC_AUTH_MODE=mock`.
- Provide a helper script that injects prod-like env vars and launches emulators.

### Option C – **Real cloud services locally**
- Require engineers to use real Firebase project credentials (staging). Simplest for parity but riskier (shared data, billing). Only viable if strict IAM + dataset isolation exists.

**Recommendation:** Start with Option A: Dockerized parity with emulators. Engineers can still run hot-reload dev (existing scripts) when iterating on UI/API code.

## Detailed Action Plan
1. **Discovery & Alignment**
   - Catalog all env vars used in `ui/` and `api/` (`NEXT_PUBLIC_*`, Firebase Admin keys, rate limits, etc.).
   - Document which are build-time vs runtime and whether they differ between dev/prod.
   - Update `docs/features.md` or a new appendix with auth/data requirements per feature.

2. **Auth & Data Strategy**
   - Add Firebase emulator config (`firebase.json`, `firestore.rules`, `firestore.indexes.json` already exist under `persistence/`).
   - Create `scripts/start-emulators.sh` to boot Auth, Firestore, Functions (if needed) and expose ports.
   - For the API (`api/lib/firebaseAdmin.ts`), add detection to use emulator host/port when `FIREBASE_EMULATOR_HOST` is present.
   - For UI, switch default `.env.local` to `NEXT_PUBLIC_AUTH_MODE=firebase` when emulator creds are available; fall back to mock only with explicit flag.

3. **Docker Compose Enhancements**
   - Introduce a new service `local-stack` referencing the production `Dockerfile`, loading env vars from `.env.local.prod.example` (includes Firebase emulator endpoints).
   - Add sidecar services for `firebase-emulator` (Auth + Firestore) and optional `seed` job that populates baseline users/roles via `api/scripts/seed.ts` (create if missing).
   - Ensure port mappings expose UI (3000), API (8080), emulator UI (4000+).

4. **Hot Reload Path**
   - Keep `ui-dev` profile (from `Dockerfile.dev`) but modify to proxy `/api/*` toward the running API in compose (rather than mock). Provide docs for concurrently running `npm run dev` + `docker compose up api-dev` (if necessary, add a lightweight API dev service for hot reload).

5. **Secrets & Configuration**
   - Create `.env.compose` (gitignored) with local secrets, plus `.env.compose.example` committed.
   - Document how to obtain Firebase Admin credentials (service account JSON) and reference them via bind mount or Docker secret for both the API in compose and local dev scripts.

6. **Verification & Tooling**
   - Add CI job (optional) that runs the parity compose stack in GitHub Actions (using services + Firebase emulator image) and executes smoke tests (`run-api-tests.bat`/Playwright) to ensure parity scripts stay green.
   - Update `docs/docker.md`, `README.md`, and package READMEs with new commands.
   - Provide a parity checklist (`docs/local-prod-parity-plan.md#verification`) describing how QA can certify features locally before sign-off.

7. **Documentation & Training**
   - Expand this plan into actionable guides (`docs/local-prod-parity.md`) once implementation begins.
   - Record Loom/notes on how to switch between mock and prod-equivalent modes.

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Firebase emulators diverge from prod behavior | Medium | Schedule periodic validation against staging project; add integration tests that hit live Firebase in non-destructive ways. |
| Secrets leakage via `.env` | High | Store sensitive files outside repo; instruct use of `scripts/setup-secrets.ps1/.sh` to pull from secure store (1Password, GCP Secret Manager). |
| Developer friction (long startup, Docker resource usage) | Medium | Provide tiered workflows: full parity via compose, lightweight mock mode for UI-only work. |
| Data drift between emulator runs | Low | Add deterministic seed script and optional `firebase emulators:exec` wrapper to reset state per session. |
| CI instability when adding emulators | Medium | Gate parity compose job behind nightly workflow initially; optimize emulator startup with cached configs. |

## Open Questions
1. Do we have a dedicated staging Firebase project whose service account can be safely shared for local dev?
2. Should invites/emails be simulated locally (SMTP dev server) or no-op? If needed, add Mailhog container.
3. Are there non-Firebase dependencies (e.g., third-party APIs) that also need emulation/mocking for parity?
4. Should the parity compose flow seed sample student/teacher data automatically, and if so, from what source of truth?
5. How do we want to integrate parity checks into PR CI—blocking or informational only?

