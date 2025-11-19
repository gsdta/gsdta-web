# 🚀 Firebase Emulator Quick Reference

## One-Command Start

```bash
./start-dev-local.sh
```

Choose option 1 (local) or 2 (Docker), then visit:
- http://localhost:3000 (UI)
- http://localhost:4445 (Emulator UI)

## Ports Used

| Service | Port | URL |
|---------|------|-----|
| UI | 3000 | http://localhost:3000 |
| API | 8080 | http://localhost:8080 |
| Emulator UI | 4445 | http://localhost:4445 |
| Firestore | 8889 | N/A (internal) |
| Auth | 9099 | N/A (internal) |

## Common Commands

### Seeding Data
```bash
# Seed emulators with test data
npm run seed

# Clear all data
npm run seed:clear

# Quick seed (checks if emulators running)
./seed.sh
```

### Docker Mode
```bash
# Start
docker-compose -f docker-compose.local.yml up

# Start with rebuild
docker-compose -f docker-compose.local.yml up --build

# Stop
docker-compose -f docker-compose.local.yml down

# Clean everything
docker-compose -f docker-compose.local.yml down --volumes
```

### Local Mode
```bash
# Start emulators
npm run emulators
# Or: firebase emulators:start --project demo-gsdta

# Seed data (in another terminal)
npm run seed

# Start API
npm run dev:api
# Or: cd api && npm run dev

# Start UI
npm run dev:ui
# Or: cd ui && npm run dev
```

## Test Credentials

After seeding, sign in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | admin123 |
| Teacher | teacher@test.com | teacher123 |
| Parent | parent@test.com | parent123 |

## Reset Data

```bash
# Clear all emulator data
rm -rf firebase-data/

# Then restart emulators
```

## Environment Files

### First Time Setup
```bash
# These are auto-created by start-dev-local.sh, or manually:
cp ui/.env.local.emulator ui/.env.local
cp api/.env.local.emulator api/.env.local
```

### Configuration
- `ui/.env.local` - UI environment (NEXT_PUBLIC_* vars)
- `api/.env.local` - API environment (FIRESTORE_EMULATOR_HOST, etc.)

## Verify Setup

```bash
./verify-phase1.sh
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase CLI not found | `npm install -g firebase-tools` |
| Port conflict | Stop other services or change ports in config |
| Docker not starting | `docker-compose down --volumes && docker-compose up --build` |
| Can't connect to emulator | Check firewall, ensure emulators started successfully |

## Next Steps

1. ✅ Phase 1 complete (infrastructure)
2. ✅ Phase 2 complete (Firebase client integration)
3. ✅ Phase 3 complete (seed scripts)
4. ✅ Phase 4 complete (CI/CD with emulators)
5. ⏭️ Phase 5: Deprecate mock mode

## Files Reference

| File | Purpose |
|------|---------|
| `PHASE1-SUMMARY.md` | Detailed Phase 1 summary |
| `PHASE1-COMPLETE.md` | Phase 1 guide with troubleshooting |
| `PHASE2-SUMMARY.md` | Detailed Phase 2 summary |
| `PHASE2-COMPLETE.md` | Phase 2 guide and verification |
| `PHASE3-SUMMARY.md` | Detailed Phase 3 summary |
| `PHASE3-COMPLETE.md` | Phase 3 guide with seed data reference |
| `PHASE4-SUMMARY.md` | Detailed Phase 4 summary |
| `PHASE4-COMPLETE.md` | Phase 4 CI/CD guide |
| `local-dev-prod-parity-plan.md` | Complete implementation plan |
| `start-dev-local.sh` | Interactive startup |
| `seed.sh` | Standalone seed script |
| `verify-phase1.sh` | Phase 1 verification |
| `verify-phase2.sh` | Phase 2 verification |
| `verify-phase3.sh` | Phase 3 verification |
| `verify-phase4.sh` | Phase 4 verification |
| `test-phase2.sh` | Phase 2 testing |

---

**Need help?** See `PHASE1-COMPLETE.md` for detailed instructions and troubleshooting.
