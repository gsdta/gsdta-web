# Production Readiness Checklist

**Date**: November 19, 2024  
**Changes**: Local development with Firebase Emulators (Phases 1-4)  
**Status**: ✅ PRODUCTION SAFE - No action required

---

## Summary

All changes made for local development parity are **backwards compatible** and **do not affect production**. No new GitHub secrets or environment variables are required.

---

## Changes Made

### 1. Firebase Configuration (`firebase.json`)
**Change**: Added `"host": "0.0.0.0"` to emulator configurations

```json
{
  "emulators": {
    "auth": {
      "port": 9099,
      "host": "0.0.0.0"  // NEW
    },
    "firestore": {
      "port": 8889,
      "host": "0.0.0.0"  // NEW
    },
    "ui": {
      "port": 4445,
      "host": "0.0.0.0"  // NEW
    }
  }
}
```

**Impact on Production**: ✅ **NONE**
- Emulators section only used in local development and CI
- Production never starts emulators
- Existing production behavior unchanged

---

### 2. UI Configuration (`ui/next.config.ts`)
**Change**: Made API proxy URL configurable

**Before:**
```typescript
destination: 'http://localhost:8080/api/:path*',
```

**After:**
```typescript
const apiProxyUrl = process.env.API_PROXY_URL || 'http://localhost:8080';
destination: `${apiProxyUrl}/api/:path*`,
```

**Impact on Production**: ✅ **SAFE**
- Falls back to `http://localhost:8080` (original behavior)
- Production Dockerfile doesn't set `API_PROXY_URL`
- In production, UI and API run in same container, so localhost works
- **No breaking changes**

---

### 3. UI Development Dockerfile (`ui/Dockerfile.dev`)
**Change**: Copy scripts directory before npm ci

```dockerfile
COPY scripts ./scripts
RUN npm ci
```

**Impact on Production**: ✅ **NONE**
- `Dockerfile.dev` only used for local development
- Production uses root `Dockerfile` (unchanged)
- No impact on production builds

---

### 4. Docker Compose (`docker-compose.local.yml`)
**Change**: Complete local development stack

**Impact on Production**: ✅ **NONE**
- File only used for local development
- Not referenced in CI/CD workflows
- Production doesn't use Docker Compose

---

### 5. Client Firebase Integration (`ui/src/lib/firebase/client.ts`)
**Change**: Added emulator auto-detection

```typescript
const authEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
if (authEmulatorHost) {
  connectAuthEmulator(authInstance, `http://${authEmulatorHost}`);
}
```

**Impact on Production**: ✅ **SAFE**
- Only connects to emulator if `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` is set
- Production build doesn't set this variable
- Production connects to real Firebase (existing behavior)
- **No breaking changes**

---

### 6. API Firebase Integration (`api/src/lib/firebaseAdmin.ts`)
**Change**: Added emulator auto-detection

```typescript
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (firestoreHost && authHost) {
  // Use emulators
} else {
  // Use production Firebase (existing behavior)
}
```

**Impact on Production**: ✅ **SAFE**
- Only uses emulators if both env vars are set
- Production doesn't set these variables
- Production uses real Firebase (existing behavior)
- **No breaking changes**

---

## CI/CD Analysis

### CI Workflow (`.github/workflows/ci.yml`)
**Changes**: Added emulator setup and seeding

**Impact**: ✅ **IMPROVED TESTING**
- Tests now run against Firebase emulators (production-like)
- No cloud Firebase costs
- Better test coverage
- No production environment affected

### Deploy Workflow (`.github/workflows/deploy.yml`)
**Changes**: Added pre-deployment emulator validation

**Impact**: ✅ **IMPROVED SAFETY**
- Quick validation before deployment
- Catches Firebase integration issues early
- No changes to actual deployment logic
- Existing secrets still used

---

## Environment Variables

### Production (No Changes Required)

**Existing GitHub Secrets** (already configured):
- ✅ `GCP_SA_KEY` - Service account for Cloud Run
- ✅ `FIREBASE_API_KEY` - Firebase public API key
- ✅ `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- ✅ `FIREBASE_PROJECT_ID` - Firebase project ID
- ✅ `FIREBASE_APP_ID` - Firebase app ID

**Build Args** (existing, unchanged):
- ✅ `NEXT_PUBLIC_AUTH_MODE=firebase`
- ✅ `NEXT_PUBLIC_API_BASE_URL=/api`
- ✅ `NEXT_PUBLIC_USE_MSW=false`
- ✅ `NEXT_PUBLIC_FIREBASE_*` (from secrets)

### Local Development (New)

**Environment Variables** (only for local dev):
- `FIRESTORE_EMULATOR_HOST=localhost:8889`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
- `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8889`
- `API_PROXY_URL=http://api-dev:8080` (Docker only)

**These are NOT in production** - only in `.env.local.emulator` templates

---

## Production Build Verification

### Dockerfile (Root)
**No changes made to production Dockerfile**

Build process remains:
1. Install UI dependencies
2. Install API dependencies
3. Build UI with Firebase secrets from GCP Secret Manager
4. Build API
5. Create runtime image with both UI and API
6. Use supervisor to run both on ports 3000 and 8080

**All existing build args still work** ✅

### Production Runtime
- UI runs on port 3000
- API runs on port 8080
- UI proxies `/api/*` to `localhost:8080` (existing behavior)
- Both connect to real Firebase (no emulator vars)
- Cloud Run serves on configured port

**No changes to production runtime** ✅

---

## Testing Production Locally

You can test the production build locally:

```bash
# Build production image (same as CI/CD)
docker build \
  --build-arg NEXT_PUBLIC_AUTH_MODE=firebase \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  --build-arg NEXT_PUBLIC_USE_MSW=false \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=your-key \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id \
  -t gsdta-web:test .

# Run production container
docker run -p 8080:8080 \
  -e FIREBASE_PROJECT_ID=your-project \
  -e GCLOUD_PROJECT=your-project \
  gsdta-web:test

# Test
curl http://localhost:8080/api/health
```

**Expected**: Same behavior as before changes

---

## Migration Path for Team

### For Developers

**Before** (mock mode):
```bash
cd ui && npm run dev
cd api && npm run dev
# Limited testing, mock auth
```

**After** (emulator mode):
```bash
./start-dev-local.sh
# Full Firebase auth, real database, production-like
```

**Impact**: Better DX, no production changes

### For CI/CD

**Before**: Tests with mocks  
**After**: Tests with emulators (production-like)  
**Impact**: Better test quality, no production changes

### For Production

**Before**: Real Firebase, Cloud Run  
**After**: Real Firebase, Cloud Run (no changes)  
**Impact**: None - continues working exactly as before

---

## Rollback Plan

If any issues arise (unlikely):

### Quick Rollback
```bash
# Revert the two code changes
git revert <commit-hash>  # ui/next.config.ts change
git revert <commit-hash>  # firebase client/API changes
```

### Files to revert:
1. `ui/next.config.ts` - Remove API_PROXY_URL logic
2. `ui/src/lib/firebase/client.ts` - Remove emulator detection
3. `api/src/lib/firebaseAdmin.ts` - Remove emulator detection

**Note**: Rollback is very low risk since changes are backwards compatible

---

## Verification Checklist

Before merging to main:

- [x] All changes are backwards compatible
- [x] Production Dockerfile unchanged
- [x] No new GitHub secrets required
- [x] Existing secrets still work
- [x] API_PROXY_URL falls back to localhost
- [x] Firebase client connects to real Firebase when no emulator vars
- [x] CI tests pass with emulators
- [x] Local development works with emulators
- [x] No breaking changes to API endpoints
- [x] No breaking changes to UI routes

---

## Deployment Instructions

### Standard Deployment (No Special Steps)

```bash
# 1. Merge to main
git checkout main
git merge develop
git push origin main

# 2. GitHub Actions will automatically:
#    - Run emulator validation
#    - Build with existing Firebase secrets
#    - Deploy to Cloud Run
#    - No configuration changes needed

# 3. Verify deployment
curl https://your-domain.com/api/health
```

**No manual steps required** - existing CI/CD pipeline handles everything

---

## Summary

### What Changed
- ✅ Local development now uses Firebase emulators
- ✅ CI/CD uses emulators for testing
- ✅ Better production parity in development
- ✅ More reliable tests

### What Didn't Change
- ✅ Production configuration
- ✅ Production secrets
- ✅ Production runtime behavior
- ✅ Deployment process
- ✅ API contracts
- ✅ UI functionality

### Action Required
- ✅ **NONE** - All changes are backwards compatible
- ✅ No new GitHub secrets needed
- ✅ No production configuration changes
- ✅ Deploy as usual

---

## Contact

If issues arise after deployment:
1. Check Cloud Run logs
2. Verify Firebase connection (should be same as before)
3. Check that API_PROXY_URL is NOT set in Cloud Run (should use localhost)
4. Confirm no emulator env vars in production

**Expected result**: Production continues to work exactly as before these changes.

---

**Status**: ✅ **READY FOR PRODUCTION**

**Confidence Level**: HIGH - All changes are additive and backwards compatible.
