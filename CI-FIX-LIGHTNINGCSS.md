# CI Fix: Lightning CSS Native Binary Issue

## Problem
UI build in GitHub Actions failed with error:
```
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

This occurred during the Playwright E2E test phase when the webServer tried to build the Next.js UI.

## Root Cause
1. **Optional Dependencies**: The `lightningcss` package relies on platform-specific optional dependencies (e.g., `lightningcss-linux-x64-gnu`) that contain native `.node` binaries.
2. **Workspace Context**: Next.js detected multiple lockfiles in the workspace and warned about workspace root inference, which affected module resolution.
3. **Binary Installation**: In the Playwright container (Linux x64), `npm ci` may not have properly installed all optional dependencies needed for the specific architecture.

## Solution

### 1. Next.js Configuration (`ui/next.config.ts`)
Added `outputFileTracingRoot` to properly set the workspace root and silence warnings:
```typescript
const nextConfig: NextConfig = {
    output: resolvedOutput,
    outputFileTracingRoot: __dirname,  // NEW: Explicitly set tracing root
    images: {unoptimized: true},
    // ...
};
```

### 2. Playwright Configuration (`ui/playwright.config.ts`)
Updated webServer to pass Firebase emulator environment variables through to the build process:
```typescript
env: {
    NEXT_PUBLIC_USE_MSW: "false",
    NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE || "mock",
    NEXT_PUBLIC_API_BASE_URL: "/api",
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "",
    NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "",
}
```

### 3. CI Workflow (`.github/workflows/ci.yml`)
Added explicit installation of the platform-specific lightningcss binary after `npm ci`:
```yaml
- name: Install dependencies
  run: |
    npm ci
    # Explicitly install lightningcss binary for the container's architecture
    ARCH=$(node -p "process.arch")
    PLATFORM=$(node -p "process.platform")
    if [ "$PLATFORM" = "linux" ]; then
      LIBC=$(node -p "require('detect-libc').familySync()")
      if [ "$LIBC" = "musl" ]; then
        BINARY="lightningcss-${PLATFORM}-${ARCH}-musl"
      elif [ "$ARCH" = "arm" ]; then
        BINARY="lightningcss-${PLATFORM}-${ARCH}-gnueabihf"
      else
        BINARY="lightningcss-${PLATFORM}-${ARCH}-gnu"
      fi
      echo "📦 Installing ${BINARY} for ${PLATFORM}/${ARCH}..."
      npm install --no-save "${BINARY}@$(node -p "require('./node_modules/lightningcss/package.json').version")"
    fi
```

This script:
- Detects the platform architecture (x64, arm64, etc.)
- Determines the libc variant (glibc vs musl)
- Installs the matching `lightningcss-*` optional dependency package
- Uses `--no-save` to avoid modifying package.json/package-lock.json

### 4. Verification Step
Added a step to verify lightningcss installation before running tests:
```yaml
- name: Verify lightningcss installation
  run: |
    echo "🔍 Checking for lightningcss binary..."
    echo "Working directory: $(pwd)"
    ls -la node_modules/lightningcss/node/ || echo "⚠️ lightningcss/node directory not found"
    find node_modules -name "lightningcss*.node" -ls || echo "⚠️ No .node files found"
    echo "Platform info: $(uname -m), Node arch: $(node -p 'process.arch')"
```

## How lightningcss Resolution Works
From `node_modules/lightningcss/node/index.js`:
```javascript
try {
  module.exports = require(`lightningcss-${parts.join('-')}`);  // Try optional dep package
} catch (err) {
  module.exports = require(`../lightningcss.${parts.join('-')}.node`);  // Fallback to .node file
}
```

The fix ensures the first `require()` succeeds by explicitly installing the optional dependency package.

## Testing
To verify locally in the Playwright container:
```bash
cd ui
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.56.1-jammy /bin/bash -c "
  npm ci && 
  npm install --no-save lightningcss-linux-x64-gnu@1.30.2 &&
  npm run build
"
```

## Related Issues
- Next.js workspace detection warnings (resolved with `outputFileTracingRoot`)
- Optional dependencies not being installed in containers (resolved with explicit install)
- Playwright webServer environment variable propagation (resolved with env passthrough)

