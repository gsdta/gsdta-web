export type ForcedTheme = "light" | "dark" | null;

/**
 * If set to "light" or "dark", the app forces that theme regardless of OS preference.
 * If set to null, the app respects the system preference.
 *
 * You can override via env: NEXT_PUBLIC_FORCE_THEME=light|dark|null
 * Default (when env is unset) is "light" as requested.
 */
export const FORCED_THEME: ForcedTheme = (() => {
  const env = (process.env.NEXT_PUBLIC_FORCE_THEME || "").toLowerCase();
  if (env === "light" || env === "dark") return env as ForcedTheme;
  if (env === "null" || env === "none") return null; // respect system
  if (env === "") return "light"; // default: force light
  return "light"; // safe default
})();
