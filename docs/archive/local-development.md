# Local Development Guide

**Complete guide to running GSDTA Web locally with Firebase Emulators**

---

## Quick Start (TL;DR)

```bash
# One command to start everything
./start-dev-local.sh
```

Choose option 1 for local processes, then:
- Visit **http://localhost:3000** (UI)
- Visit **http://localhost:4445** (Firebase Emulator UI)
- Sign in with **teacher@test.com** / **teacher123**

---

## Prerequisites

### Required
- **Node.js 20+** - `node --version` (you have v25.2.0 ✅)
- **npm** - `npm --version`
- **Firebase CLI** - Install using one of these methods:
  
  **Option 1 (Recommended):**
  ```bash
  sudo npm install -g firebase-tools
  ```
  
  **Option 2 (Homebrew - if you have it):**
  ```bash
  brew install firebase-cli
  ```
  
  **Option 3 (npm without sudo):**
  ```bash
  # Set up a local npm prefix
  mkdir -p ~/.npm-global
  npm config set prefix ~/.npm-global
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc  # or ~/.bashrc
  source ~/.zshrc  # or source ~/.bashrc
  
  # Now install without sudo
  npm install -g firebase-tools
  ```
  
  Verify installation:
  ```bash
  firebase --version
  ```
- **Java 11+ (OpenJDK 21 recommended)** - required for Firebase Emulators  
  macOS: `brew install openjdk@21`  
  SDKMAN: `curl -s "https://get.sdkman.io" | bash && sdk install java 21.0.4-tem`

### Optional
- **Docker** - For containerized development
- **Git** - For version control

---

## Environment Setup

### First Time Setup

1. **Copy environment templates**
   ```bash
   cp ui/.env.local.emulator ui/.env.local
   cp api/.env.local.emulator api/.env.local
   ```

2. **Install dependencies**
   ```bash
   # Install seed script dependencies
   cd scripts && npm install && cd ..
   
   # Install API dependencies
   cd api && npm install && cd ..
   
   # Install UI dependencies
   cd ui && npm install && cd ..
   ```

---

## Development Options

### Option 1: Using the Startup Script (Recommended)

The easiest way to get started:

```bash
./start-dev-local.sh
```

**What it does:**
- Checks for Firebase CLI
- Creates `.env.local` files if needed
- Prompts for development mode (local or Docker)
- Starts emulators
- Seeds test data
- Provides instructions for starting API and UI

**Follow the prompts:**
- Choose **Option 1** for local processes (3 terminals)
- Choose **Option 2** for Docker Compose (single terminal)

### Option 2: Manual Start (3 Terminals)

**Terminal 1: Firebase Emulators**
```bash
npm run emulators
# Or: firebase emulators:start --project demo-gsdta
```

Wait ~5 seconds for emulators to start, then:

**Terminal 2: Seed Test Data**
```bash
npm run seed
```

**Terminal 3: Start API**
```bash
npm run dev:api
# Or: cd api && npm run dev
```

**Terminal 4: Start UI**
```bash
npm run dev:ui
# Or: cd ui && npm run dev
```

### Option 3: Docker Compose

Single command for everything:

```bash
docker-compose -f docker-compose.local.yml up --build
```

**Stop:**
```bash
docker-compose -f docker-compose.local.yml down
```

---

## Access Points

Once everything is running:

| Service | URL | Purpose |
|---------|-----|---------|
| **UI** | http://localhost:3000 | Main application |
| **API** | http://localhost:8080 | API endpoints |
| **Emulator UI** | http://localhost:4445 | View Firebase data |
| **Auth Emulator** | localhost:9099 | Authentication (internal) |
| **Firestore Emulator** | localhost:8889 | Database (internal) |

---

## Test Credentials

After seeding, use these credentials to sign in:

| Role | Email | Password | What You'll See |
|------|-------|----------|-----------------|
| **Admin** | admin@test.com | admin123 | Full admin dashboard |
| **Teacher** | teacher@test.com | teacher123 | Teacher features |
| **Teacher 2** | teacher2@test.com | teacher123 | Another teacher account |
| **Parent** | parent@test.com | parent123 | 2 students (Arun, Priya) |
| **Parent 2** | parent2@test.com | parent123 | 1 student (Vikram) |

### Test Invite Tokens

| Token | Status | Use Case |
|-------|--------|----------|
| `test-invite-valid-123` | Valid (7 days) | Test invite acceptance |
| `test-invite-expired-456` | Expired | Test expired invite error |
| `test-invite-used-789` | Already accepted | Test used invite error |

---

## Firebase Emulator UI

Visit **http://localhost:4445** to:

### Authentication Tab
- View all 5 test users
- Check custom claims (roles)
- See email verification status

### Firestore Tab
- Browse collections:
  - `users` (5 documents)
  - `students` (3 documents)
  - `invites` (3 documents)
- Inspect document fields
- View timestamps

### Logs Tab
- See emulator activity
- Debug security rule evaluations

---

## Common Commands

### Seeding

```bash
# Seed test data
npm run seed

# Clear all data and reseed
npm run seed:clear
npm run seed

# Standalone seed script
./seed.sh
```

### Emulators

```bash
# Start emulators
npm run emulators

# Reset emulator data and restart
npm run emulators:reset
```

### Development Servers

```bash
# Start UI dev server
npm run dev:ui

# Start API dev server
npm run dev:api
```

### Building

```bash
# Build UI
npm run build:ui

# Build API
npm run build:api
```

### Linting

```bash
# Lint UI
npm run lint:ui

# Lint API
npm run lint:api
```

### Type Checking

```bash
# Typecheck UI
npm run typecheck:ui

# Typecheck API
npm run typecheck:api
```

---

## Troubleshooting

### Issue: Firebase CLI not found

```bash
npm install -g firebase-tools
```

### Issue: Port conflicts

If ports 3000, 4445, 8080, 8889, or 9099 are in use:

```bash
# Find what's using a port
lsof -i :3000
lsof -i :4445

# Kill the process or stop other services
```

### Issue: Emulators not starting

```bash
# Check Firebase CLI version
firebase --version

# Try with verbose output
firebase emulators:start --project demo-gsdta --debug
```

### Issue: "Cannot find module" errors

```bash
# Reinstall dependencies
cd ui && rm -rf node_modules && npm install
cd ../api && rm -rf node_modules && npm install
cd ../scripts && rm -rf node_modules && npm install
```

### Issue: Old emulator data causing issues

```bash
# Clear emulator data
rm -rf firebase-data/

# Restart emulators and reseed
npm run emulators &
sleep 5
npm run seed
```

### Issue: Environment variables not working

```bash
# Verify .env.local files exist
ls -la ui/.env.local
ls -la api/.env.local

# If missing, copy from templates
cp ui/.env.local.emulator ui/.env.local
cp api/.env.local.emulator api/.env.local
```

---

## Development Workflow

### Daily Development

1. **Start emulators** (keeps data from previous session)
   ```bash
   npm run emulators &
   ```

2. **Start API and UI**
   ```bash
   npm run dev:api &
   npm run dev:ui
   ```

3. **Develop** - Changes hot-reload automatically

4. **Stop** - Ctrl+C in each terminal

### Testing New Features

1. **Reset data** if needed
   ```bash
   npm run seed:clear
   npm run seed
   ```

2. **Test** your feature

3. **View data** in Emulator UI
   - http://localhost:4445

### Before Committing

```bash
# Run lint
npm run lint:ui
npm run lint:api

# Run typecheck
npm run typecheck:ui
npm run typecheck:api

# Run tests
cd ui && npm test
cd ../api && npm test
```

---

## Data Management

### Seed Data

Test data is automatically created with:
- 5 users (various roles)
- 3 students (with parent associations)
- 3 teacher invites (different states)

**Location:** `scripts/seed-emulator.js`

### Data Persistence

Emulator data persists in `firebase-data/` directory:
- Survives emulator restarts
- Gitignored (not committed)
- Can be reset with `rm -rf firebase-data/`

### Custom Test Data

Edit `scripts/seed-emulator.js` to add:
- More users
- More students
- More invites
- Custom data structures

Then re-run:
```bash
npm run seed
```

---

## Environment Variables Reference

### UI (.env.local)

```bash
# Development mode
NODE_ENV=development
NEXT_PUBLIC_AUTH_MODE=firebase
NEXT_PUBLIC_USE_MSW=false
NEXT_PUBLIC_API_BASE_URL=/api

# Firebase config (demo project for emulators)
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gsdta
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app

# Emulator hosts
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8889

# Optional
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### API (.env.local)

```bash
# Development mode
NODE_ENV=development

# Emulator hosts (Firebase Admin SDK auto-detects these)
FIRESTORE_EMULATOR_HOST=localhost:8889
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Project ID
FIREBASE_PROJECT_ID=demo-gsdta
GCLOUD_PROJECT=demo-gsdta
```

---

## Production vs Local Differences

| Aspect | Local (Emulators) | Production |
|--------|-------------------|------------|
| **Auth** | Emulated (localhost:9099) | Real Firebase |
| **Database** | Emulated (localhost:8889) | Real Firestore |
| **Credentials** | None needed | Service account / ADC |
| **Data** | Persists in `firebase-data/` | Cloud Firestore |
| **Cost** | Free | Pay per usage |
| **Network** | Offline capable | Internet required |

**Key Point:** Local development is 100% production-like thanks to emulators!

---

## Additional Resources

### Documentation
- **Quick Start**: `QUICKSTART-EMULATORS.md`
- **Project Review**: `PROJECT-REVIEW.md`
- **Phase Guides**: `PHASE1-COMPLETE.md`, `PHASE2-COMPLETE.md`, etc.

### Verification Scripts
```bash
# Verify setup
./verify-phase1.sh  # Infrastructure
./verify-phase2.sh  # Client integration
./verify-phase3.sh  # Seed scripts
./verify-phase4.sh  # CI/CD
```

### Firebase Resources
- [Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Emulator UI Guide](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)

---

## FAQ

**Q: Do I need real Firebase credentials?**  
A: No! Emulators don't need credentials. Just use the demo project.

**Q: Will emulator data affect production?**  
A: No! Emulators are completely isolated from production.

**Q: Can I work offline?**  
A: Yes! Emulators work completely offline.

**Q: How do I reset everything?**  
A: `rm -rf firebase-data/ && npm run emulators && npm run seed`

**Q: Where are the test credentials?**  
A: See "Test Credentials" section above or run `npm run seed` to see them printed.

**Q: How do I add more test users?**  
A: Edit `scripts/seed-emulator.js` and add to the `TEST_USERS` array.

**Q: Can I use Docker instead of local processes?**  
A: Yes! Run `docker-compose -f docker-compose.local.yml up --build`

---

## Getting Help

- **Check logs**: Browser console, terminal output, Emulator UI logs
- **Verify setup**: Run verification scripts
- **Review docs**: See `docs/` folder
- **Check issues**: GitHub Issues for known problems

---

**Need help?** See [QUICKSTART-EMULATORS.md](../QUICKSTART-EMULATORS.md) for a quick reference guide.
