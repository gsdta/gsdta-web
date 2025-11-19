# Phase 2: Firebase Client Integration - Complete! ✅

## What Was Done

### 1. Updated UI Firebase Client (`ui/src/lib/firebase/client.ts`)
**Added emulator support:**
- ✅ Import `connectAuthEmulator` from `firebase/auth`
- ✅ Import `connectFirestoreEmulator` and `Firestore` from `firebase/firestore`
- ✅ Added `getFirebaseDb()` function to access Firestore
- ✅ Automatic connection to Auth emulator when `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` is set
- ✅ Automatic connection to Firestore emulator when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` is set
- ✅ Console logging for debugging emulator connections
- ✅ One-time connection to prevent duplicate emulator initialization

**Key Features:**
- Works in both production (real Firebase) and local (emulators)
- Automatically detects emulator environment variables
- No code changes needed to switch between modes
- Backwards compatible with existing code

### 2. Updated API Firebase Admin (`api/src/lib/firebaseAdmin.ts`)
**Added emulator detection and support:**
- ✅ Detects emulator mode via `FIRESTORE_EMULATOR_HOST` or `FIREBASE_AUTH_EMULATOR_HOST`
- ✅ In emulator mode: Initializes without credentials (Firebase Admin SDK auto-connects)
- ✅ In production mode: Uses Application Default Credentials or service account
- ✅ Updated default project ID to `demo-gsdta` for emulator mode
- ✅ Console logging for debugging and transparency
- ✅ Graceful fallback to production if emulator env vars not set

**Key Features:**
- Zero configuration needed for emulator mode
- Automatic credential handling (none needed for emulators)
- Clear logging to show which mode is active
- Production-ready with proper credential handling

### 3. Verification Tools
- ✅ Created `test-phase2.sh` - Automated testing script
- ✅ Verifies environment setup
- ✅ Starts emulators and tests build process

## How It Works

### Local Development with Emulators

When you set the environment variables in `.env.local`:

**UI (`ui/.env.local`):**
```bash
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8889
```

**API (`api/.env.local`):**
```bash
FIRESTORE_EMULATOR_HOST=localhost:8889
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

The Firebase SDKs automatically connect to emulators instead of production:

1. **UI**: `getFirebaseAuth()` connects to Auth emulator at localhost:9099
2. **UI**: `getFirebaseDb()` connects to Firestore emulator at localhost:8889
3. **API**: Firebase Admin SDK auto-detects emulator env vars and connects

### Production Deployment

When emulator env vars are NOT set (production):

1. **UI**: Firebase client SDK connects to real Firebase
2. **API**: Firebase Admin SDK uses Application Default Credentials or service account

**No code changes needed!** Same code works in both environments.

## Testing Phase 2

### Quick Test
```bash
# Copy environment files if not already done
cp ui/.env.local.emulator ui/.env.local
cp api/.env.local.emulator api/.env.local

# Run automated test
./test-phase2.sh
```

### Manual Test

**Terminal 1 - Start Emulators:**
```bash
firebase emulators:start --project demo-gsdta
```

**Terminal 2 - Start API:**
```bash
cd api
npm run dev
```

You should see:
```
[Firebase Admin] Connecting to emulators (project: demo-gsdta)
  - Auth Emulator: localhost:9099
  - Firestore Emulator: localhost:8889
```

**Terminal 3 - Start UI:**
```bash
cd ui
npm run dev
```

Open browser console at http://localhost:3000 and look for:
```
[Firebase] Connected to Auth emulator: http://localhost:9099
[Firebase] Connected to Firestore emulator: localhost:8889
```

## Verification Checklist

- [x] UI Firebase client imports Firestore modules
- [x] UI connects to Auth emulator when env var set
- [x] UI connects to Firestore emulator when env var set
- [x] API detects emulator mode from env vars
- [x] API logs emulator connection details
- [x] API works without credentials in emulator mode
- [x] Code is backwards compatible with production
- [x] TypeScript compilation passes
- [x] No breaking changes to existing code

## What Changed

### Files Modified

1. **`ui/src/lib/firebase/client.ts`**
   - Added Firestore imports
   - Added `getFirebaseDb()` function
   - Added emulator connection logic
   - Added debug logging

2. **`api/src/lib/firebaseAdmin.ts`**
   - Added emulator detection logic
   - Added conditional initialization (emulator vs production)
   - Updated default project ID for emulators
   - Added debug logging

### Files Created

3. **`test-phase2.sh`**
   - Automated Phase 2 verification script
   - Starts emulators and tests build

## Environment Variables Reference

### UI Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | `demo-key` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `localhost` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | `demo-gsdta` | Project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | `demo-app` | App ID |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | No | `localhost:9099` | Auth emulator (local only) |
| `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` | No | `localhost:8889` | Firestore emulator (local only) |

### API Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | Yes | `demo-gsdta` | Project ID |
| `FIRESTORE_EMULATOR_HOST` | No | `localhost:8889` | Firestore emulator (local only) |
| `FIREBASE_AUTH_EMULATOR_HOST` | No | `localhost:9099` | Auth emulator (local only) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Production only | `/path/to/key.json` | Service account key |

## Troubleshooting

### Issue: "Cannot find module 'firebase/firestore'"
**Solution:** The `firebase` package (v10+) includes Firestore. Make sure you have `firebase@10.14.1` or later:
```bash
cd ui && npm list firebase
```

### Issue: "Auth emulator not connecting"
**Solution:** Check that:
1. Emulators are running: `curl http://localhost:9099`
2. Environment variable is set: `echo $NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`
3. Browser console shows connection message

### Issue: "API can't connect to emulator"
**Solution:** Check that:
1. Emulators are running: `curl http://localhost:8889`
2. Environment variables are set in `api/.env.local`
3. API logs show emulator connection message

### Issue: "Production credentials not working"
**Solution:** In production, you need:
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to service account JSON, OR
- Application Default Credentials (automatic on GCP)

## Code Examples

### Using Firestore in UI Components

```typescript
import { getFirebaseDb } from '@/lib/firebase/client';
import { collection, getDocs } from 'firebase/firestore';

async function fetchData() {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Using Firestore in API

```typescript
import { adminDb } from '@/lib/firebaseAdmin';

async function getUsers() {
  const snapshot = await adminDb().collection('users').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

## What's Next

Phase 2 is complete! The Firebase clients now support emulators. Next steps:

1. **Phase 3**: Create seed scripts for test data
   - Seed users (admin, teacher, parent)
   - Seed invites
   - Seed sample student data

2. **Phase 4**: Update CI/CD pipelines
   - GitHub Actions with emulators
   - Automated testing

3. **Phase 5**: Deprecate mock mode
   - Remove MSW handlers
   - Remove mock auth code
   - Simplify codebase

## Success Metrics

- ✅ UI connects to emulators automatically
- ✅ API connects to emulators automatically  
- ✅ No code changes needed to switch environments
- ✅ Production mode still works
- ✅ TypeScript compilation passes
- ✅ Backwards compatible

---

**Phase 2 Status**: ✅ **COMPLETE**

**Ready for Phase 3**: Yes - Firebase clients are emulator-ready, time to seed test data!
