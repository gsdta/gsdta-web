GSDTA UI (Next.js)

Local development

- Copy `.env.example` to `.env.local` and set values
- Install deps: `npm i` (or `pnpm i`)
- Start dev server: `npm run dev` then open http://localhost:3000

Build (static out)

- `npm run build` → produces `out/` (Next.js 15 static export via `output: 'export'`)

E2E tests (Playwright)

- First time: `npm run pw:install`
- Run E2E (headless): `npm run test:e2e`
- Run E2E (headed): `npm run test:e2e:headed`

Project docs

- UI setup and deployment: `docs/ui.md`
- Architecture: `docs/architecture.md`
- API + DB (for backend/service): `docs/api-db.md`

Notes

- This app targets static export by default (GCS + Cloud CDN).
- Auth integrates via OIDC; for MVP see the Firebase alternative in the docs.
