# RBAC Testing Guide

## Running Tests

### API Tests

**Unit Tests (All libraries):**
```bash
cd api
npm test
```

This runs all unit tests in `src/**/__tests__/*.test.ts`:
- `roleInvites.test.ts` - 15 tests
- `firestoreUsers.test.ts` - 9 tests

**E2E Tests (Cucumber):**
```bash
cd api
npm run test:e2e
```

This starts the server and runs all `.feature` files:
- `health.feature` - Health check endpoint
- `echo.feature` - Echo endpoint  
- `me.feature` - User profile endpoint
- `teacher-invites.feature` - Invite endpoints (NEW)
- `parent-signup.feature` - Parent signup (deferred - needs auth)

**Just Cucumber (server already running):**
```bash
cd api
npm run test:cucumber
```

### UI Tests

**Unit Tests (Jest):**
```bash
cd ui
npm test
```

This runs all tests in `src/__tests__/*.test.tsx`:
- `register.page.test.tsx` - Registration multi-step form
- `TeacherInviteForm.test.tsx` - Admin invite form (NEW)
- `invite-accept.page.test.tsx` - Teacher invite acceptance (NEW)

**E2E Tests (Playwright):**
```bash
cd ui
npm run test:e2e
```

This runs all `.spec.ts` files in `tests/e2e/`:
- Static page tests (home, about, calendar, etc.)
- Dynamic page tests
- `teacher-invites.spec.ts` - Invite flow (NEW)

**E2E in headed mode (see browser):**
```bash
cd ui
npm run test:e2e:headed
```

## Test Coverage by Feature

### 01-04: Auth & Parent Signup
- ✅ API health check (e2e)
- ✅ Echo endpoint (e2e)
- ⏸️ Parent signup (deferred - needs auth token strategy)

### 05: Teacher Invites (COMPLETE)
- ✅ API unit tests (24 tests)
  - Token generation
  - Invite creation/retrieval
  - User role management
- ✅ API e2e tests (3 scenarios)
  - Verify valid invite
  - Invalid token handling
  - Missing token handling
- ✅ UI unit tests (18 tests)
  - Invite form component
  - Invite accept page
- ✅ UI e2e tests (3 tests)
  - Display valid invite
  - Error states
  
### 06-13: Future Features
- ⏳ Route guards
- ⏳ Middleware authorization
- ⏳ Security hardening

## Test Environment Setup

### API Test Mode

Set environment variable for test invite support:
```bash
# Unix/Mac
export ALLOW_TEST_INVITES=1

# Windows CMD
set ALLOW_TEST_INVITES=1

# Windows PowerShell
$env:ALLOW_TEST_INVITES=1
```

Tokens starting with `test-` will return mock data without Firestore.

### UI Test Mocks

UI tests use:
- Jest mocks for components and APIs
- MSW (Mock Service Worker) for API calls in some tests
- Playwright for E2E browser automation

### Firebase Test Project

E2E tests should use Firebase emulators or test project:
```bash
# Start emulators
firebase emulators:start
```

## Test Structure

### Unit Tests (API)
```
api/src/
  lib/
    __tests__/
      roleInvites.test.ts      # Library unit tests
      firestoreUsers.test.ts   # Library unit tests
```

Uses Node.js built-in test runner (`tsx --test`).

### E2E Tests (API)
```
api/tests/
  e2e/
    features/
      *.feature               # Cucumber scenarios
    steps/
      api.steps.ts           # Step definitions
```

Uses Cucumber.js with TypeScript support.

### Unit Tests (UI)
```
ui/src/
  __tests__/
    *.test.tsx               # Component/page unit tests
```

Uses Jest + React Testing Library.

### E2E Tests (UI)
```
ui/tests/
  e2e/
    static/
      *.spec.ts              # Static page tests
    dynamic/
      *.spec.ts              # Dynamic feature tests
    teacher-invites.spec.ts  # Invite flow tests
```

Uses Playwright.

## Common Test Patterns

### API Unit Test Pattern
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';

test('description', async () => {
  // Setup mocks
  // Call function
  // Assert results
});
```

### UI Unit Test Pattern
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('description', async () => {
  render(<Component />);
  // Interact with UI
  await userEvent.click(screen.getByRole('button'));
  // Assert outcomes
  expect(screen.getByText(/text/i)).toBeInTheDocument();
});
```

### Cucumber E2E Pattern
```gherkin
Scenario: Description
  Given setup condition
  When action is taken
  Then expected outcome
  And additional assertion
```

### Playwright E2E Pattern
```typescript
test('description', async ({ page }) => {
  await page.goto('/path');
  await page.click('button');
  await expect(page.locator('text')).toBeVisible();
});
```

## Debugging Tests

### API Unit Tests
```bash
# Run specific test file
npx tsx --test src/lib/__tests__/roleInvites.test.ts

# Run with Node debugger
node --inspect-brk node_modules/.bin/tsx --test src/lib/__tests__/roleInvites.test.ts
```

### UI Unit Tests
```bash
# Run specific test file
npm test -- TeacherInviteForm.test.tsx

# Run in watch mode
npm run test:watch

# Update snapshots
npm test -- -u
```

### E2E Tests
```bash
# API E2E with verbose output
npm run test:cucumber -- --fail-fast

# UI E2E in debug mode
npm run test:e2e:headed

# Run specific Playwright test
npx playwright test teacher-invites.spec.ts
```

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Pull requests
- Pushes to main branch

See `.github/workflows/` for CI configuration.

## Test Gaps & Future Work

**Known gaps:**
- ⏸️ Parent signup flow (needs auth token strategy)
- ⏸️ Full invite acceptance with real auth (complex E2E setup)
- ⏸️ Admin invite management UI (not yet implemented)
- ⏸️ Route guard enforcement (future)
- ⏸️ API authorization middleware (future)

**Nice to have:**
- Visual regression testing
- Load/performance testing
- Security penetration testing
- Accessibility (a11y) testing
