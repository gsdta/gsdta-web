# Phase 3: Developer Experience & Seed Scripts - Complete! ✅

## What Was Done

### 1. Created Comprehensive Seed Script
**File**: `scripts/seed-emulator.js`

**Features:**
- ✅ Seeds Firebase Auth with test users (admin, teachers, parents)
- ✅ Seeds Firestore user profiles with roles and metadata
- ✅ Seeds sample student records with parent associations
- ✅ Seeds teacher invite tokens (valid, expired, used)
- ✅ Supports clearing all data with `--clear` flag
- ✅ Idempotent - can run multiple times safely
- ✅ Detailed console output with emojis and formatting
- ✅ Error handling for individual operations

**Test Data Created:**

#### Users (5 total)
| Email | Password | Role | UID | Status |
|-------|----------|------|-----|--------|
| admin@test.com | admin123 | admin | admin-test-001 | active |
| teacher@test.com | teacher123 | teacher | teacher-test-001 | active |
| teacher2@test.com | teacher123 | teacher | teacher-test-002 | active |
| parent@test.com | parent123 | parent | parent-test-001 | active |
| parent2@test.com | parent123 | parent | parent-test-002 | active |

#### Students (3 total)
| Name | Parent | Grade | School |
|------|--------|-------|--------|
| Arun Kumar | parent-test-001 | 5th Grade | Lincoln Elementary |
| Priya Sharma | parent-test-001 | 7th Grade | Lincoln Elementary |
| Vikram Patel | parent-test-002 | 6th Grade | Washington Middle School |

#### Teacher Invites (3 total)
| Token | Email | Status | Expires |
|-------|-------|--------|---------|
| test-invite-valid-123 | newteacher@test.com | pending | 7 days |
| test-invite-expired-456 | expired@test.com | pending | expired |
| test-invite-used-789 | teacher2@test.com | accepted | 2 days |

### 2. Package Management
**File**: `scripts/package.json`

**Purpose:**
- Manages seed script dependencies independently
- Provides npm scripts: `npm run seed`, `npm run seed:clear`
- Includes `firebase-admin` for emulator operations

### 3. Root Package.json with Convenience Scripts
**File**: `package.json` (root)

**New Scripts:**
```json
{
  "seed": "cd scripts && npm run seed",
  "seed:clear": "cd scripts && npm run seed:clear",
  "emulators": "firebase emulators:start --project demo-gsdta --import=./firebase-data --export-on-exit",
  "emulators:reset": "rm -rf firebase-data && npm run emulators",
  "dev:ui": "cd ui && npm run dev",
  "dev:api": "cd api && npm run dev"
}
```

### 4. Standalone Seed Script
**File**: `seed.sh`

**Purpose:**
- Run seeding independently of other processes
- Checks if emulators are running before seeding
- Sets correct environment variables automatically
- User-friendly error messages

### 5. Enhanced Startup Script
**File**: `start-dev-local.sh` (updated)

**New Features:**
- Prompts to seed data on first run
- Prompts to reseed if data already exists
- Auto-seeds after emulators start (if no data)
- Better user experience with clear instructions

## Usage Guide

### Quick Seed (Emulators Must Be Running)

**Option 1: NPM Script (Recommended)**
```bash
npm run seed
```

**Option 2: Standalone Script**
```bash
./seed.sh
```

**Option 3: Direct Node**
```bash
cd scripts && node seed-emulator.js
```

### Clear and Reseed
```bash
npm run seed:clear
```

### Start Everything with Auto-Seeding
```bash
./start-dev-local.sh
# Choose option 1 (local processes)
# Script will prompt to seed data
```

### Full Workflow Example

**Terminal 1 - Start Emulators:**
```bash
npm run emulators
# Or: firebase emulators:start --project demo-gsdta
```

**Terminal 2 - Seed Data (wait ~5 seconds for emulators to be ready):**
```bash
npm run seed
```

Output:
```
🌱 Firebase Emulator Seed Script
================================
Project: demo-gsdta
Firestore: localhost:8889
Auth: localhost:9099

📝 Seeding authentication users...
  ✅ Created user: admin@test.com
  ✅ Created user: teacher@test.com
  ...

📝 Seeding user profiles in Firestore...
  ✅ Created profile: admin@test.com (admin)
  ...

📝 Seeding student records...
  ✅ Created student: Arun Kumar (Parent: parent-test-001)
  ...

📝 Seeding teacher invites...
  ✅ Created invite: newteacher@test.com 📧 (pending)
  ...

✅ Seeding complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Admin:    admin@test.com    / admin123
  Teacher:  teacher@test.com  / teacher123
  Teacher2: teacher2@test.com / teacher123
  Parent:   parent@test.com   / parent123
  Parent2:  parent2@test.com  / parent123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Invite Tokens:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Valid:   test-invite-valid-123
  Expired: test-invite-expired-456
  Used:    test-invite-used-789
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Access Emulator UI: http://localhost:4445
```

**Terminal 3 - Start API:**
```bash
npm run dev:api
# Or: cd api && npm run dev
```

**Terminal 4 - Start UI:**
```bash
npm run dev:ui
# Or: cd ui && npm run dev
```

**Now Test:**
1. Visit http://localhost:3000
2. Sign in with any test credential (e.g., `teacher@test.com` / `teacher123`)
3. Browse to http://localhost:4445 to view seeded data in Emulator UI

## Testing Features

### Sign In Flow
```bash
# 1. Start emulators + seed
npm run emulators &
sleep 5 && npm run seed

# 2. Start services
npm run dev:api &
npm run dev:ui &

# 3. Visit http://localhost:3000/signin
# 4. Sign in with teacher@test.com / teacher123
# 5. Should see authenticated dashboard
```

### Teacher Invite Flow
```bash
# With valid invite token
# Visit: http://localhost:3000/invite/accept?token=test-invite-valid-123
# Should show invite acceptance form

# With expired token
# Visit: http://localhost:3000/invite/accept?token=test-invite-expired-456
# Should show expired error

# With used token
# Visit: http://localhost:3000/invite/accept?token=test-invite-used-789
# Should show already used error
```

### Student Management
```bash
# Sign in as parent@test.com / parent123
# Should see 2 students: Arun Kumar, Priya Sharma

# Sign in as parent2@test.com / parent123
# Should see 1 student: Vikram Patel
```

## Emulator UI Exploration

Visit **http://localhost:4445** to:

1. **Authentication Tab:**
   - View all 5 test users
   - Check custom claims (roles)
   - Verify email addresses

2. **Firestore Tab:**
   - Browse `users` collection (5 documents)
   - Browse `students` collection (3 documents)
   - Browse `invites` collection (3 documents)
   - Inspect document fields and timestamps

3. **Functions Tab** (if using Cloud Functions):
   - View function logs

## Advanced Usage

### Clear All Data and Reseed
```bash
# Clear everything
npm run seed:clear

# Reseed from scratch
npm run seed
```

### Modify Seed Data
Edit `scripts/seed-emulator.js`:

```javascript
// Add more users
const TEST_USERS = [
  // ... existing users
  {
    uid: 'parent-test-003',
    email: 'parent3@test.com',
    password: 'parent123',
    displayName: 'Jane Doe',
    roles: ['parent'],
    status: 'active'
  }
];

// Add more students
const SAMPLE_STUDENTS = [
  // ... existing students
  {
    id: 'student-004',
    name: 'New Student',
    parentId: 'parent-test-003',
    // ... other fields
  }
];
```

Then reseed:
```bash
npm run seed
```

### Seed from CI/CD or Scripts
```javascript
const { main } = require('./scripts/seed-emulator.js');

// In your test setup
await main();
```

## Troubleshooting

### Issue: "Cannot find module 'firebase-admin'"
**Solution:**
```bash
cd scripts && npm install
```

### Issue: Seeding fails with connection error
**Solution:** Ensure emulators are running:
```bash
curl http://localhost:4445
# Should return HTML (emulator UI)
```

### Issue: Users already exist errors
**Solution:** This is normal - script is idempotent. It updates existing users.

To start fresh:
```bash
npm run seed:clear
npm run seed
```

### Issue: Emulator data persists after restart
**Solution:** This is by design (data persistence). To reset:
```bash
rm -rf firebase-data
npm run emulators
npm run seed
```

## Files Created/Modified

### Created:
- `scripts/seed-emulator.js` - Main seed script (350+ lines)
- `scripts/package.json` - Seed script dependencies
- `seed.sh` - Standalone seeding script
- `package.json` - Root package with convenience scripts
- `PHASE3-COMPLETE.md` - This documentation

### Modified:
- `start-dev-local.sh` - Added seeding prompts and automation

## Integration with Existing Codebase

The seed script works with:
- ✅ Existing Firestore collections (`users`, `students`, `invites`)
- ✅ Existing auth flow (AuthProvider, Firebase client)
- ✅ Existing API endpoints (`/api/v1/me`, `/api/v1/invites`, etc.)
- ✅ Existing UI pages (sign-in, dashboard, students list, etc.)

## What's Next

Phase 3 is complete! Developer experience is greatly improved. Next steps:

1. **Phase 4**: Update CI/CD pipelines
   - GitHub Actions with emulators
   - Automated testing with seeded data
   - E2E tests against emulators

2. **Phase 5**: Deprecate mock mode
   - Remove MSW handlers
   - Remove mock auth code
   - Simplify AuthProvider
   - Update documentation

## Success Metrics

- ✅ Seed script creates all test data
- ✅ Data persists between emulator restarts
- ✅ Idempotent seeding (can run multiple times)
- ✅ Clear, formatted console output
- ✅ Test credentials documented
- ✅ Convenient npm scripts
- ✅ Integration with existing code
- ✅ Manual testing verified

---

**Phase 3 Status**: ✅ **COMPLETE**

**Ready for Phase 4**: Yes - Local development environment is production-like!
