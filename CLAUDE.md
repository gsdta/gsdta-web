Must read:
Always read the instructions given under .github folder (.md files) and follow them strictly.
Go through the docs folder to understand project related documentation.

## Critical: Dependency Management

**ALWAYS keep package.json and package-lock.json in sync:**

1. After modifying any `package.json` (root, ui/, api/, or scripts/), run `npm install` to regenerate the lock file
2. Always commit `package-lock.json` changes together with `package.json` changes
3. Never manually edit `package-lock.json`
4. If you see lock file conflicts or issues, run `npm install` from the project root to regenerate

**Before committing dependency changes:**
```bash
# From project root
npm install
git add package.json package-lock.json
git add ui/package.json ui/package-lock.json
git add api/package.json api/package-lock.json
```

**Why this matters:** Docker builds use `npm ci` which requires lock files to match package.json exactly. Mismatches cause build failures in CI/CD.