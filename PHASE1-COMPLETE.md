# Phase 1: Firebase Emulator Setup - Complete! ✅

## What Was Done

### 1. Firebase Configuration
- ✅ Updated `firebase.json` to include Auth emulator (port 9099)
- ✅ Firestore emulator already configured (port 8889)
- ✅ Emulator UI configured (port 4445)

### 2. Docker Setup
- ✅ Created `docker-compose.local.yml` for containerized local stack
- ✅ Created `ui/Dockerfile.dev` for UI development
- ✅ Created `api/Dockerfile.dev` for API development
- ✅ Configured health checks and service dependencies

### 3. Environment Configuration
- ✅ Created `ui/.env.local.emulator` - Template for UI Firebase emulator config
- ✅ Created `api/.env.local.emulator` - Template for API Firebase emulator config
- ✅ Both templates use `demo-gsdta` project (no real Firebase credentials needed)

### 4. Developer Experience
- ✅ Created `start-dev-local.sh` - Interactive startup script
- ✅ Script offers two modes: local processes or Docker Compose

## Quick Start

### Option 1: Using the Startup Script (Recommended)
```bash
./start-dev-local.sh
```

Choose option 1 for local processes or option 2 for Docker.

### Option 2: Manual Docker Start
```bash
docker-compose -f docker-compose.local.yml up --build
```

### Option 3: Manual Local Processes

**Terminal 1 - Firebase Emulators:**
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Copy environment templates (first time only)
cp ui/.env.local.emulator ui/.env.local
cp api/.env.local.emulator api/.env.local

# Start emulators
firebase emulators:start --project demo-gsdta --import=./firebase-data --export-on-exit
```

**Terminal 2 - API:**
```bash
cd api
npm install
npm run dev
```

**Terminal 3 - UI:**
```bash
cd ui
npm install
npm run dev
```

## Accessing Services

Once running, access:
- **UI**: http://localhost:3000
- **API**: http://localhost:8080
- **Firebase Emulator UI**: http://localhost:4445

The Emulator UI lets you:
- View/edit Firestore documents
- Manage authentication users
- Inspect security rule evaluations
- Clear data between test runs

## What's Next

Phase 1 is complete! The infrastructure is ready. Next steps:

1. **Test the setup**: Start the emulators and verify they're running
2. **Phase 2**: Update Firebase client code to connect to emulators
3. **Phase 3**: Create seed scripts for test data
4. **Phase 4**: Update CI/CD to use emulators
5. **Phase 5**: Deprecate mock mode

## Troubleshooting

### Firebase CLI not found
```bash
npm install -g firebase-tools
```

### Port conflicts
If ports 3000, 4445, 8080, 8889, or 9099 are in use:
- Stop conflicting services, or
- Edit `firebase.json` and `docker-compose.local.yml` to use different ports

### Docker issues
```bash
# Clean up and rebuild
docker-compose -f docker-compose.local.yml down --volumes
docker-compose -f docker-compose.local.yml up --build
```

### Emulator data persists
Emulator data is preserved in `./firebase-data` directory. To reset:
```bash
rm -rf firebase-data
```

## Files Created/Modified

### Created:
- `docker-compose.local.yml` - Docker setup for local stack
- `ui/Dockerfile.dev` - UI development container
- `api/Dockerfile.dev` - API development container
- `ui/.env.local.emulator` - UI emulator environment template
- `api/.env.local.emulator` - API emulator environment template
- `start-dev-local.sh` - Interactive startup script
- `PHASE1-COMPLETE.md` - This file

### Modified:
- `firebase.json` - Added Auth emulator configuration

### Will be created automatically:
- `firebase-data/` - Emulator data persistence (gitignored)
- `ui/.env.local` - Copied from template on first run
- `api/.env.local` - Copied from template on first run
