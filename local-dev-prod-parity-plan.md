# Local Development & Production Parity Plan

**Goal:** Enable full feature parity between local development and production environments to allow comprehensive testing of sign-in, authentication, and all cloud-dependent features locally.

## Current State Analysis

### Environment Modes
The project currently operates in two distinct modes:

1. **Mock Mode** (Default Local)
   - `NEXT_PUBLIC_AUTH_MODE=mock`
   - `NEXT_PUBLIC_USE_MSW=true`
   - Mock Service Worker (MSW) handles auth endpoints
   - Simplified role-based authentication (parent/teacher/admin)
   - No Firebase dependency
   - Limited feature testing capability

2. **Firebase Mode** (Production)
   - `NEXT_PUBLIC_AUTH_MODE=firebase`
   - `NEXT_PUBLIC_USE_MSW=false`
   - Full Firebase Authentication
   - Firebase Admin SDK for token verification
   - Firestore for user data and persistence
   - Email verification workflows
   - Google OAuth sign-in

### Key Gaps Identified

#### Authentication
- Mock mode cannot test real Firebase auth flows
- Email verification not testable locally
- Google OAuth sign-in disabled in mock mode
- Token expiration and refresh logic untestable
- Multi-factor authentication (if added) cannot be tested

#### Backend Services
- API relies on Firebase Admin SDK for token verification
- Firestore database operations require cloud connection
- Security rules cannot be tested locally
- Composite indexes not validated in development

#### Feature Parity
- Sign-in/sign-up flows differ between local and production
- Protected routes behave differently
- Invite acceptance workflow (teacher invites) uses real Firestore
- User profile management relies on cloud persistence

## Proposed Solution: Firebase Emulator Suite

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Local Development                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │   UI:3000    │────────▶│  API:8080    │            │
│  │  (Next.js)   │         │  (Next.js)   │            │
│  └──────────────┘         └──────┬───────┘            │
│         │                         │                     │
│         │                         │                     │
│         ▼                         ▼                     │
│  ┌──────────────────────────────────────────┐         │
│  │     Firebase Emulator Suite              │         │
│  ├──────────────────────────────────────────┤         │
│  │  • Auth Emulator      (9099)             │         │
│  │  • Firestore Emulator (8889)             │         │
│  │  • Emulator UI        (4445)             │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Benefits
1. **100% Feature Parity**: Test all production features locally
2. **Offline Development**: No internet required after initial setup
3. **Fast Iteration**: Reset emulator data instantly
4. **Security Rules Testing**: Validate Firestore rules locally
5. **Cost Savings**: No cloud resource consumption during development
6. **Consistent Testing**: Same authentication flows as production

## Implementation Plan

### Phase 1: Firebase Emulator Setup

#### 1.1 Install Firebase CLI & Configure Emulators
```bash
npm install -g firebase-tools
firebase init emulators
```

Select:
- ✅ Authentication Emulator
- ✅ Firestore Emulator
- ✅ Emulator UI

Update `firebase.json`:
```json
{
  "firestore": {
    "rules": "persistence/firestore.rules",
    "indexes": "persistence/firestore.indexes.json"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8889
    },
    "ui": {
      "enabled": true,
      "port": 4445
    }
  }
}
```

#### 1.2 Create Docker Compose for Local Stack
Create `docker-compose.local.yml`:
```yaml
version: '3.8'

services:
  # Firebase Emulators
  firebase-emulators:
    image: andreysenov/firebase-tools:latest
    ports:
      - "4445:4445"  # Emulator UI
      - "9099:9099"  # Auth Emulator
      - "8889:8889"  # Firestore Emulator
    volumes:
      - ./firebase.json:/home/node/firebase.json:ro
      - ./persistence:/home/node/persistence:ro
      - firebase-data:/home/node/.firebase
    command: firebase emulators:start --project demo-gsdta --import /home/node/.firebase --export-on-exit
    environment:
      - FIRESTORE_EMULATOR_HOST=0.0.0.0:8889
      - FIREBASE_AUTH_EMULATOR_HOST=0.0.0.0:9099

  # UI (Development)
  ui-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./ui:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_AUTH_MODE=firebase
      - NEXT_PUBLIC_USE_MSW=false
      - NEXT_PUBLIC_API_BASE_URL=/api
      - NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
      - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
      - NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gsdta
      - NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
      - FIRESTORE_EMULATOR_HOST=firebase-emulators:8889
      - FIREBASE_AUTH_EMULATOR_HOST=firebase-emulators:9099
    depends_on:
      - firebase-emulators
      - api-dev

  # API (Development)
  api-dev:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./api:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - FIRESTORE_EMULATOR_HOST=firebase-emulators:8889
      - FIREBASE_AUTH_EMULATOR_HOST=firebase-emulators:9099
      - FIREBASE_PROJECT_ID=demo-gsdta
      - GCLOUD_PROJECT=demo-gsdta
    depends_on:
      - firebase-emulators

volumes:
  firebase-data:
```

#### 1.3 Create API Dockerfile for Development
Create `api/Dockerfile.dev`:
```dockerfile
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 8080
ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
```

### Phase 2: Environment Configuration

#### 2.1 Update `.env.local` Templates

Create `ui/.env.local.example`:
```bash
# Local Development with Firebase Emulators
NODE_ENV=development
NEXT_PUBLIC_AUTH_MODE=firebase
NEXT_PUBLIC_USE_MSW=false
NEXT_PUBLIC_API_BASE_URL=/api

# Firebase Emulator Config (demo project)
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gsdta
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app

# Emulator Hosts (client-side connection)
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8889

# Optional: Skip email verification for faster local testing
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
```

Create `api/.env.local.example`:
```bash
# Local Development with Firebase Emulators
NODE_ENV=development

# Firebase Admin SDK will auto-detect emulators via these env vars
FIRESTORE_EMULATOR_HOST=localhost:8889
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Project ID for emulator
FIREBASE_PROJECT_ID=demo-gsdta
GCLOUD_PROJECT=demo-gsdta

# Disable production credential requirements
GOOGLE_APPLICATION_CREDENTIALS=
```

#### 2.2 Update Firebase Client Configuration

Modify `ui/src/lib/firebase/client.ts`:
```typescript
"use client";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
      throw new Error("Firebase config env vars are missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local");
    }
    appInstance = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
    
    // Connect to emulator if configured
    const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost && !authInstance.config.emulator) {
      const [host, port] = emulatorHost.split(':');
      connectAuthEmulator(authInstance, `http://${host}:${port}`, { disableWarnings: true });
    }
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    dbInstance = getFirestore(app);
    
    // Connect to emulator if configured
    const emulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
    if (emulatorHost && !dbInstance._settings.host.includes('firestore.googleapis.com')) {
      const [host, port] = emulatorHost.split(':');
      connectFirestoreEmulator(dbInstance, host, parseInt(port, 10));
    }
  }
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();
```

#### 2.3 Update API Firebase Admin Configuration

Modify `api/src/lib/firebaseAdmin.ts`:
```typescript
import { getApps, initializeApp, type App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 
                            process.env.GCP_PROJECT || 
                            process.env.GOOGLE_CLOUD_PROJECT || 
                            'demo-gsdta';

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;
  
  if (getApps().length) {
    app = getApps()[0]!;
  } else {
    const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
    
    if (isEmulator) {
      // In emulator mode, initialize without credentials
      console.log(`[Firebase Admin] Connecting to emulators (project: ${DEFAULT_PROJECT_ID})`);
      app = initializeApp({ projectId: DEFAULT_PROJECT_ID });
    } else {
      // Production: require credentials
      const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!serviceAccount) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS required in production');
      }
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: DEFAULT_PROJECT_ID
      });
    }
  }
  return app;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
```

### Phase 3: Developer Experience Improvements

#### 3.1 Create NPM Scripts

Add to root `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:emulators\" \"npm run dev:api\" \"npm run dev:ui\"",
    "dev:emulators": "firebase emulators:start --import=./firebase-data --export-on-exit",
    "dev:api": "cd api && npm run dev",
    "dev:ui": "cd ui && npm run dev",
    "dev:docker": "docker-compose -f docker-compose.local.yml up",
    "dev:docker:build": "docker-compose -f docker-compose.local.yml up --build",
    "dev:reset": "rm -rf firebase-data && firebase emulators:start --import=./seed-data --export-on-exit=./firebase-data",
    "seed": "node scripts/seed-emulator.js"
  }
}
```

#### 3.2 Create Seed Script

Create `scripts/seed-emulator.js`:
```javascript
/**
 * Seed Firebase emulators with test data
 * Run: node scripts/seed-emulator.js
 */
const admin = require('firebase-admin');

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8889';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'demo-gsdta' });
const auth = admin.auth();
const db = admin.firestore();

async function seedUsers() {
  console.log('Seeding users...');
  
  const users = [
    { email: 'admin@test.com', password: 'admin123', role: 'admin', name: 'Test Admin' },
    { email: 'teacher@test.com', password: 'teacher123', role: 'teacher', name: 'Test Teacher' },
    { email: 'parent@test.com', password: 'parent123', role: 'parent', name: 'Test Parent' },
  ];

  for (const userData of users) {
    try {
      // Create auth user
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
        emailVerified: true,
      });

      // Set custom claims for role
      await auth.setCustomUserClaims(userRecord.uid, { roles: [userData.role] });

      // Create Firestore profile
      await db.collection('users').doc(userRecord.uid).set({
        email: userData.email,
        name: userData.name,
        roles: [userData.role],
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        emailVerified: true,
      });

      console.log(`✓ Created ${userData.role}: ${userData.email}`);
    } catch (error) {
      console.log(`  User ${userData.email} may already exist`);
    }
  }
}

async function seedInvites() {
  console.log('Seeding teacher invites...');
  
  const invite = {
    token: 'test-invite-123',
    email: 'newteacher@test.com',
    role: 'teacher',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  };

  await db.collection('invites').doc(invite.token).set(invite);
  console.log('✓ Created test invite token: test-invite-123');
}

async function main() {
  console.log('\n🌱 Seeding Firebase emulators...\n');
  await seedUsers();
  await seedInvites();
  console.log('\n✅ Seeding complete!\n');
  console.log('Test credentials:');
  console.log('  Admin:   admin@test.com / admin123');
  console.log('  Teacher: teacher@test.com / teacher123');
  console.log('  Parent:  parent@test.com / parent123\n');
  process.exit(0);
}

main().catch(console.error);
```

#### 3.3 Create Quick Start Guide

Create `docs/local-development.md`:
```markdown
# Local Development Guide

## Prerequisites
- Node.js 20+
- Docker (optional, for containerized stack)
- Firebase CLI: `npm install -g firebase-tools`

## Quick Start (Recommended)

### Option 1: Docker Compose (Easiest)
```bash
# Build and start entire stack
npm run dev:docker:build

# Access:
# - UI: http://localhost:3000
# - API: http://localhost:8080
# - Emulator UI: http://localhost:4445
```

### Option 2: Local Processes
```bash
# Terminal 1: Start Firebase emulators
npm run dev:emulators

# Terminal 2: Start API
cd api && npm install && npm run dev

# Terminal 3: Start UI
cd ui && npm install && npm run dev

# Terminal 4: Seed test data (first time only)
npm run seed
```

## Test Accounts
After seeding:
- **Admin**: admin@test.com / admin123
- **Teacher**: teacher@test.com / teacher123
- **Parent**: parent@test.com / parent123

## Resetting Data
```bash
# Clear all emulator data and reseed
npm run dev:reset
npm run seed
```

## Emulator UI
Access the Firebase Emulator UI at http://localhost:4445 to:
- View/edit Firestore data
- Manage auth users
- Inspect security rule evaluations
- Clear data between test runs

## Testing Production Features Locally
All production features now work locally:
- ✅ Sign-in with email/password
- ✅ Google OAuth (emulated)
- ✅ Email verification flows
- ✅ Token expiration/refresh
- ✅ Firestore security rules
- ✅ Teacher invite workflows
- ✅ User profile management
```

### Phase 4: CI/CD Updates

#### 4.1 Update GitHub Actions

Modify `.github/workflows/ci.yml`:
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Firebase CLI
        run: npm install -g firebase-tools
      
      - name: Start Firebase Emulators
        run: |
          firebase emulators:start --project demo-gsdta --import ./seed-data &
          sleep 10
      
      - name: Install UI dependencies
        working-directory: ui
        run: npm ci
      
      - name: Install API dependencies
        working-directory: api
        run: npm ci
      
      - name: Run API tests
        working-directory: api
        run: npm test
        env:
          FIRESTORE_EMULATOR_HOST: localhost:8889
          FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
      
      - name: Run UI tests
        working-directory: ui
        run: npm test
        env:
          NEXT_PUBLIC_AUTH_MODE: firebase
          NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
      
      - name: Run E2E tests
        working-directory: ui
        run: npm run test:e2e
```

### Phase 5: Migration & Documentation

#### 5.1 Migration Checklist
- [ ] Install Firebase CLI globally
- [ ] Configure Firebase emulators
- [ ] Create Docker Compose configuration
- [ ] Update environment variable templates
- [ ] Modify Firebase client to support emulators
- [ ] Modify Firebase Admin to support emulators
- [ ] Create seed script
- [ ] Test all authentication flows
- [ ] Test Firestore operations
- [ ] Update CI/CD pipelines
- [ ] Document developer onboarding

#### 5.2 Update Existing Documentation
Files to update:
- `README.md` - Add emulator setup to quick start
- `ui/README.md` - Document emulator environment variables
- `api/README.md` - Document emulator environment variables
- `docs/testing.md` - Add emulator testing section

#### 5.3 Deprecate Mock Mode
Once emulator setup is stable:
1. Remove MSW handlers from `ui/src/mocks/`
2. Remove `NEXT_PUBLIC_USE_MSW` environment variable
3. Remove mock authentication logic from `AuthProvider.tsx`
4. Update tests to use emulators instead of mocks
5. Simplify build process (no more dual-mode support)

## Alternative Approaches Considered

### 1. Keep Mock Mode + Add Emulators (Rejected)
**Pros:** Backwards compatible, developers can choose
**Cons:** Increased complexity, two systems to maintain, testing confusion

### 2. Cloud Development Environment (Rejected)
**Pros:** True production parity
**Cons:** Requires internet, costs money, slower iteration, shared state issues

### 3. Separate Test Firebase Project (Rejected)
**Pros:** Real Firebase, isolated from production
**Cons:** Costs money, requires credentials management, slower, not offline-capable

## Success Metrics

### Developer Experience
- ✅ Single command to start full local stack
- ✅ No cloud credentials needed for local dev
- ✅ Works offline
- ✅ Data resets in < 5 seconds

### Feature Coverage
- ✅ 100% of auth flows testable locally
- ✅ All API endpoints work identically
- ✅ Firestore security rules enforceable
- ✅ Email verification workflows testable

### Team Velocity
- ✅ New developers onboarded in < 30 minutes
- ✅ Zero "works on my machine" issues
- ✅ CI/CD runs identical stack
- ✅ Bug reproduction rate improved

## Timeline Estimate

- **Phase 1** (Emulator Setup): 2-4 hours
- **Phase 2** (Environment Config): 2-3 hours
- **Phase 3** (Developer Experience): 3-4 hours
- **Phase 4** (CI/CD Updates): 1-2 hours
- **Phase 5** (Migration & Docs): 2-3 hours

**Total Estimated Time:** 10-16 hours

## Risks & Mitigation

### Risk: Emulator Behavioral Differences
**Mitigation:** Comprehensive E2E testing on both emulator and staging environment

### Risk: Team Onboarding Friction
**Mitigation:** Detailed documentation, Docker option for one-command setup

### Risk: CI/CD Pipeline Complexity
**Mitigation:** Use official Firebase GitHub Actions, test incrementally

### Risk: Performance Differences
**Mitigation:** Emulators are typically faster; document any known differences

## Next Steps

1. Review and approve this plan
2. Create GitHub issues for each phase
3. Set up emulator infrastructure (Phase 1)
4. Test with one developer before team rollout
5. Document learnings and update plan as needed
6. Roll out to full team
7. Update production deployment docs

## Questions for Discussion

1. Should we maintain mock mode as a fallback, or fully migrate?
2. Do we want to version-control seeded data, or generate dynamically?
3. Should Docker be required or optional for local development?
4. What's the timeline for deprecating MSW entirely?
5. Do we need staging environment in addition to local emulators?
