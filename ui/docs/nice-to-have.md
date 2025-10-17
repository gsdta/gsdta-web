# Nice-to-have improvements (Dark mode, Linting, UX)

This document lists small, low-risk improvements that would further polish the site. Each item includes what, why, and how (with file pointers).

## 1) Lint/build polish

- Remove the last ESLint test warning
  - What: In `src/__tests__/register.page.test.tsx`, the `(_args)` parameter of the fetch mock is unused.
  - Why: Keep CI noise-free and make pre-commit checks green.
  - How: Either remove the parameter or prefix it with `/* _args */` or add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above that line.

- Standardize Node scripts lint rules
  - What: Ensure Node scripts explicitly allow CommonJS `require()`.
  - Why: Avoid false-positive lint errors without weakening rules globally.
  - How: Add `/* eslint-env node */` and `/* eslint-disable @typescript-eslint/no-require-imports */` at the top of scripts that intentionally use CJS (for example, `scripts/convert-calendar.js`).

- Pre-commit hygiene (optional)
  - What: Run `lint`, `typecheck`, and fast tests on staged files.
  - Why: Catch issues before they get pushed.
  - How: Expand `lint-staged` in `package.json` or add a Husky hook that runs `npm run lint && npm run typecheck`.

## 2) Dark mode polish

- Semantic color tokens
  - What: Introduce semantic tokens (surface, surface-elevated, text, text-muted, border, primary, accent) mapped to CSS variables in `globals.css` with light/dark values.
  - Why: Reduces hard-coded `bg-white`/`text-gray-*` and makes theme updates safer.
  - How: Define in `:root` and the dark media query; in components prefer classes like `bg-[var(--surface)]`, `text-[var(--text)]`, `border-[color:var(--border)]` using Tailwind v4 arbitrary values.

- Unify borders/shadows in dark
  - What: Replace mixed `border-gray-200/800` with a single `--border` token; tune shadows to be softer in dark (`shadow-sm` + low ring opacity).
  - Why: Consistent visual language; avoid halos.

- Gradients and overlays
  - What: Ensure gradients (like the hero) have dark equivalents and card overlays use subtle alpha (e.g., `bg-white/5` in dark).
  - Why: Maintain depth without glare or muddy tones.

- Contrast audit
  - What: Verify all text/background combinations meet WCAG AA (4.5:1) in both themes.
  - How: Use Axe (see Testing below) and manually check key panels (Header, Footer, Hero, tiles, forms).

- Assets in dark mode
  - What: Ensure logos/images have transparent backgrounds or a subtle container (ring/background) in dark so they don’t “float” awkwardly.
  - How: Prefer PNG/SVG with transparency and a subtle wrapper in dark (`ring-white/10`, `bg-white/5`).

## 3) Theme toggle (optional)

- What: Add a user-facing theme switch (light / dark / system) in the header.
- Why: Let users override OS preference and avoid FOUC.
- How:
  - Persist preference in a cookie and localStorage.
  - On the server, read the cookie to set an initial class or CSS variables to avoid flash.
  - On the client, sync to localStorage and update the DOM class.

## 4) Testing improvements

- Visual regression (light + dark)
  - What: Playwright screenshots for key pages/components in both themes.
  - How: Use two contexts—one with `prefers-color-scheme: light`, one with `dark`. Take snapshots of Home, Register, Documents.

- Accessibility checks
  - What: Integrate `@axe-core/playwright` or run `axe` in a test step to catch contrast and landmark issues.
  - How: Add a basic a11y scan per top-level route.

- Unit tests for theme toggle
  - What: Verify the cookie/localStorage interaction and initial SSR theme to prevent flashes.
  - Why: Avoid regressions that re-introduce flicker.

## 5) Documentation / DX

- Theming guide
  - What: Short guide on using semantic tokens and when to prefer `bg-[var(--surface)]` vs Tailwind palette.
  - Why: Keep contributors aligned; reduce regressions.

- Component checklist
  - What: Add a checklist in `docs/` (or PR template) to ensure new components:
    - Work in light/dark
    - Pass Axe basic checks
    - Avoid hardcoded `#fff`/`#000` and rely on tokens

## 6) CI suggestions

- GitHub Actions (optional)
  - What: Add a workflow that runs `npm ci`, `lint`, `typecheck`, `test`, and `next build` on PRs.
  - Why: Confidence before merging.

- Lighthouse CI (optional)
  - What: Run Lighthouse in CI for Home/Register (light & dark).
  - Why: Track performance and accessibility over time.

## 7) Minor UI refinements

- Inputs and selects
  - What: Ensure all inputs have dark variants: background `gray-950`, border `gray-700`, text `gray-100`, and focus ring uses brand color.

- Status banners
  - What: Use translucent dark backgrounds for success/error (e.g., `bg-green-900/30`) for parity with light.

- Spacing and container width
  - What: Confirm `max-w-6xl` works well on common viewports for both themes; adjust if hero feels cramped.

## 8) SEO optional enhancements

- Page-specific Open Graph/Twitter images
  - What: Add unique social preview images per key page (Home, About, Donate, Team) and reference them in metadata.
  - Why: Improves share previews and CTR on social platforms.
  - How: Place images in `public/images/social/` (e.g., `home-og.png`, `about-og.png`). Update each route layout’s `openGraph.images` and `twitter.images`.
    - Files: `src/app/about/layout.tsx`, `src/app/donate/layout.tsx`, `src/app/team/layout.tsx`, `src/app/page.tsx` (Home metadata)

- Rich results via JSON-LD (Events, Breadcrumbs, Search)
  - Events (Calendar)
    - What: Add `schema.org/Event` for upcoming events/terms.
    - Why: Eligibility for event-rich results in search.
    - How: Generate a JSON-LD array from calendar data and inject a `<script type="application/ld+json">` on Calendar pages.
      - Files: `src/app/calendar/layout.tsx` or `src/app/calendar/page.tsx`, data in `src/data/calendar-*.json`
  - Breadcrumbs
    - What: Add `schema.org/BreadcrumbList` for deep pages.
    - Why: Helps Google understand site hierarchy; can render breadcrumb rich results.
    - How: Add a small helper to output breadcrumb JSON-LD and include on nested pages (e.g., class details under `/classes/[id]/`).
      - Files: `src/app/classes/[id]/page.tsx`
  - Site Search (optional)
    - What: Add `WebSite` JSON-LD with `SearchAction` if a site search is available.
    - Why: Enables sitelinks search box in Google results.
    - How: After adding a `/search` route, include a `SearchAction` in the site-level JSON-LD.
      - Files: `src/app/head.tsx` (extend existing Organization JSON-LD or add a separate WebSite JSON-LD)

- hreflang alternates (if adopting i18n routing)
  - What: Add `alternates.languages` to metadata for `/en` and `/ta` routes.
  - Why: Helps search engines serve the right locale; avoids duplicate content.
  - How: When/if moving from cookie-based i18n to route-based i18n, set per-page `alternates.languages`.
    - Files: route `layout.tsx` files (e.g., `src/app/about/layout.tsx`) once `/en` and `/ta` are introduced

- Organization JSON-LD: social profiles
  - What: Add `sameAs` links (Facebook, YouTube, etc.).
  - Why: Increases entity confidence and brand presence.
  - How: Update the `orgLd` object to include `sameAs`.
    - Files: `src/app/head.tsx`

- Sitemap tuning
  - What: Include dynamic routes (e.g., class detail pages) if meant to be public, and keep lastModified up to date.
  - Why: Helps discovery and freshness signals.
  - How: Expand the routes in `sitemap.ts` (or generate from data/API at build time). Exclude protected routes.
    - Files: `src/app/sitemap.ts`

- Robots fine-tuning
  - What: Ensure utility/auth pages are `noindex` and disallowed in `robots.txt`; confirm error pages aren’t indexed.
  - Why: Prevents thin/irrelevant pages from being indexed.
  - How: Continue using per-route `robots` metadata and `robots.txt` disallows.
    - Files: `src/app/robots.ts`, route `layout.tsx` for `/dashboard/`, `/login/`, `/logout/`, `/students/`, `/classes/`, `/health/`

- Favicons and PWA meta (optional)
  - What: Provide a full set of icons and related meta (`mask-icon`, `theme-color`, `manifest`).
  - Why: Better installability and platform integration.
  - How: Use the existing scripts to generate icons, add a web manifest, and reference in metadata.
    - Files: `public/` for icons/manifest, `src/app/head.tsx` for `<link>`/`<meta>`

### Quick SEO file pointers

- Global metadata defaults: `src/app/layout.tsx`
- Global head entries & Organization JSON-LD: `src/app/head.tsx`
- SEO routes: `src/app/robots.ts`, `src/app/sitemap.ts`
- Team Person JSON-LD: `src/app/team/page.tsx`
- Per-route metadata examples: `src/app/{about,contact,donate,documents,calendar,enrollment,textbooks,team}/layout.tsx`

## Quick references (files touched recently)

- Global theme setup: `src/app/globals.css`
- Document head/meta + viewport colors: `src/app/layout.tsx`
- Components tuned for dark mode: `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/home/HeroThirukkural.tsx`, `src/components/home/HomeCarousel.tsx`, `src/components/home/StatTiles.tsx`, `src/components/ThirukkuralDisplay.tsx`, `src/components/LanguageSwitcher.tsx`
- Register page dark styles & typing fixes: `src/app/register/page.tsx`
- Node script lint header: `scripts/convert-calendar.js`
- Test fixes (typed fetch mock): `src/__tests__/register.page.test.tsx`

## Example commands

```bash
# Lint, typecheck, test, build
npm run lint
npm run typecheck
npm test
npm run build
```

If you want me to tackle any of the above now, I can start with the zero-warning lint cleanup and migrating any remaining page-level themeColor to viewport.
