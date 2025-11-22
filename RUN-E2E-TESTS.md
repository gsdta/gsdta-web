# Running E2E Tests Locally

This guide explains how to run the Playwright end-to-end tests locally.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- All dependencies installed (`npm ci` in root, `ui/`, and `api/` directories)

## Quick Start

Use the provided script to run all steps automatically:

```bash
./run-e2e-tests.sh
```

## Manual Steps

If you prefer to run the steps manually:

### 1. Start Firebase Emulators

Start only the Firebase emulators (Auth and Firestore):

```bash
docker-compose -f docker-compose.local.yml up -d firebase-emulators
```

Wait for the emulators to be ready (usually 10-15 seconds). You can check if they're ready:

```bash
curl -s http://localhost:4445 > /dev/null && echo "✅ Emulators ready" || echo "❌ Not ready"
```

### 2. Seed Test Data

Seed the Firebase emulators with test data:

```bash
npm run seed
```

This creates test users, profiles, students, and teacher invites in the emulators.

### 3. Install Platform-Specific Dependencies (if needed)

The lightningcss native module needs to match your platform:

**macOS ARM64:**
```bash
cd ui && npm install --no-save lightningcss-darwin-arm64
```

**macOS x64:**
```bash
cd ui && npm install --no-save lightningcss-darwin-x64
```

**Linux x64:**
```bash
cd ui && npm install --no-save lightningcss-linux-x64-gnu
```

**Note:** This step is only needed if you get a "Cannot find module" error for lightningcss.

### 4. Run E2E Tests

Run the Playwright tests:

```bash
cd ui && npm run test:e2e
```

The Playwright configuration will:
- Start the API server on port 8080 (with test mode enabled)
- Build and start the UI server on port 3100
- Run all e2e tests
- Shut down the servers after tests complete

### 5. Cleanup

After tests complete, stop the Firebase emulators:

```bash
docker-compose -f docker-compose.local.yml down
```

## Test Output

- **Test Results**: Displayed in the terminal
- **HTML Report**: Run `cd ui && npx playwright show-report` to view detailed results
- **Screenshots**: Failed tests save screenshots to `ui/test-results/`
- **Traces**: Failed tests save traces that can be viewed with `npx playwright show-trace <path>`

## Running Specific Tests

Run tests for a specific file:

```bash
cd ui && npm run test:e2e -- tests/e2e/static/home.en.spec.ts
```

Run tests matching a pattern:

```bash
cd ui && npm run test:e2e -- --grep "signup"
```

Run in headed mode (see browser):

```bash
cd ui && npm run test:e2e:headed
```

## Debugging Tests

### View test in browser with Playwright Inspector

```bash
cd ui && npx playwright test --debug
```

### Check emulator data

Access the Firebase Emulator UI at http://localhost:4445 to inspect:
- Authentication users
- Firestore collections
- Test data

## Troubleshooting

### Tests fail with "Cannot find module lightningcss"

Install the platform-specific lightningcss module (see step 3 above).

### Tests fail with connection errors

Ensure Firebase emulators are running:
```bash
docker ps | grep firebase
```

Check emulator health:
```bash
curl http://localhost:4445
curl http://localhost:9099
curl http://localhost:8889
```

### Port already in use

If ports 8080 or 3100 are in use, stop other services:
```bash
# Find process using port
lsof -ti:8080 -ti:3100

# Kill if needed
kill $(lsof -ti:8080 -ti:3100)
```

### Build fails during test setup

Make sure all dependencies are installed:
```bash
npm ci
cd ui && npm ci
cd ../api && npm ci
cd ../scripts && npm ci
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) follows the same pattern:
1. Starts Firebase emulators
2. Seeds test data
3. Runs Playwright tests (which start API and UI servers)

The local setup mirrors the CI environment to ensure consistent test results.

## Test Data

The seed script creates:

**Users:**
- admin@test.com / admin123 (admin)
- teacher@test.com / teacher123 (teacher)
- parent@test.com / parent123 (parent)

**Test Invite Tokens:**
- Valid: `test-invite-valid-123`
- Expired: `test-invite-expired-456`
- Used: `test-invite-used-789`

See `scripts/seed-emulator.js` for complete test data setup.
