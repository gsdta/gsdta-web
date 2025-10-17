# Theme configuration (forced light by default, dark mode supported)

This document explains how the app’s theme works, how we force light mode by default, and how to switch between light, dark, or system preference without changing component code.

## TL;DR
- Default: Forced LIGHT theme.
- To respect system preference (light/dark): set `NEXT_PUBLIC_FORCE_THEME=null`.
- To force DARK: set `NEXT_PUBLIC_FORCE_THEME=dark`.

See “How to change it” for exact commands.

## How it works
- Config: `src/config/theme.ts`
  - Exports `FORCED_THEME: "light" | "dark" | null`.
  - Reads `process.env.NEXT_PUBLIC_FORCE_THEME`.
  - Defaults to `"light"` when unset.
  - Returns `null` for `NEXT_PUBLIC_FORCE_THEME=null|none` (respect OS preference).
- HTML wiring: `src/app/layout.tsx`
  - Sets attributes on `<html>` based on `FORCED_THEME`:
    - `class="dark"` when forced dark (activates Tailwind `dark:` variants).
    - `data-theme="light"|"dark"` when forced, omitted when respecting system.
  - Adds `<meta name="color-scheme" content="light dark" />` so native UI adapts to both.
- CSS variables and overrides: `src/app/globals.css`
  - Defines CSS variables for `--background` and `--foreground` in light and dark.
  - Applies OS preference in `@media (prefers-color-scheme: dark)`.
  - Forced overrides via HTML attribute:
    - `[data-theme="light"]` forces light variables.
    - `[data-theme="dark"]` forces dark variables.
- Tailwind dark strategy: `tailwind.config.ts`
  - `darkMode: "class"` means Tailwind’s `dark:` utilities apply when `.dark` is present on a parent (we set this on `<html>` when forced dark).

This setup lets us:
- Keep all `dark:` classes and dark CSS intact.
- Default the product to light.
- Switch globally via an environment variable without touching component code.

## How to change it (Windows Git Bash)

Run from the UI project directory: `/c/projects/gsdta/gsdta-web/ui`.

### 1) Force LIGHT (default)
No env var required (this is the default). To be explicit:

```bash
NEXT_PUBLIC_FORCE_THEME=light npm run dev
```

### 2) Respect system preference (light/dark)

```bash
NEXT_PUBLIC_FORCE_THEME=null npm run dev
```

To persist across runs (recommended):

```bash
echo "NEXT_PUBLIC_FORCE_THEME=null" >> .env.local
```

### 3) Force DARK

```bash
NEXT_PUBLIC_FORCE_THEME=dark npm run dev
```

### 4) Production build

```bash
# Example: respect system
NEXT_PUBLIC_FORCE_THEME=null npm run build
npm start
```

Or set the env in your hosting provider’s dashboard as a runtime env var.

## Notes
- Respecting system (`null`) means:
  - No explicit `.dark` class on `<html>`.
  - Colors come from `prefers-color-scheme` media query.
- Forcing dark adds `.dark` to `<html>` and sets `data-theme="dark"` so both Tailwind and CSS variables align.
- Components should prefer semantic variables or Tailwind tokens—avoid hardcoded `#fff/#000`.

## Troubleshooting
- “My `dark:` styles aren’t applying when respecting system”: `dark:` requires the `.dark` class; without forcing, dark mode comes from variables via `prefers-color-scheme`. Ensure your component also uses variables or suitable classes. If you need to test Tailwind `dark:` utilities specifically, force dark.
- “Scrollbars/inputs look off”: We advertise `color-scheme: light dark`; most browsers adapt native UI accordingly. Forced `data-theme` ensures our page variables align.

## Files to know
- `src/config/theme.ts` — env → `FORCED_THEME` mapping.
- `src/app/layout.tsx` — applies `class` and `data-theme` to `<html>`.
- `src/app/globals.css` — variables, system and forced overrides.
- `tailwind.config.ts` — `darkMode: "class"` for Tailwind’s `dark:` variants.

