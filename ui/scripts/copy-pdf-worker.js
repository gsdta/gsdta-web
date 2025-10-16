// Tiny wrapper to keep this file lint-clean while delegating to the ESM script.
// This avoids CommonJS require() which is forbidden by the linter.
(async () => {
  await import('./copy-pdf-worker.mjs');
})();

