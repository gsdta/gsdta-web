# Test Verification Instructions

Since PowerShell 6+ is not available on this system, here are manual commands to run all tests.

## Prerequisites

Ensure you have Node.js and npm installed:
```cmd
node --version
npm --version
```

## API Unit Tests

### Method 1: Using batch file
```cmd
cd C:\projects\gsdta\gsdta-web
run-api-tests.bat
```

### Method 2: Direct command
```cmd
cd C:\projects\gsdta\gsdta-web\api
npm test
```

**Expected Output:**
- ✅ 15 tests passing in roleInvites.test.ts
- ✅ 9 tests passing in firestoreUsers.test.ts
- **Total: 24 tests passing**

## UI Unit Tests

### Method 1: Using batch file
```cmd
cd C:\projects\gsdta\gsdta-web
run-ui-tests.bat
```

### Method 2: Direct command
```cmd
cd C:\projects\gsdta\gsdta-web\ui
npm test -- --passWithNoTests
```

**Expected Output:**
- ✅ 10 tests passing in TeacherInviteForm.test.tsx
- ✅ 8 tests passing in invite-accept.page.test.tsx
- ✅ (existing) tests passing in register.page.test.tsx
- **Total: 18+ tests passing**

## API E2E Tests (Cucumber)

**Note:** Requires the API server to be running.

### Step 1: Start API server (in one terminal)
```cmd
cd C:\projects\gsdta\gsdta-web\api
npm run dev
```

### Step 2: Run E2E tests (in another terminal)
```cmd
cd C:\projects\gsdta\gsdta-web\api
npm run test:cucumber
```

**Or run both with one command:**
```cmd
cd C:\projects\gsdta\gsdta-web\api
npm run test:e2e
```

**Expected Output:**
- ✅ health.feature scenarios passing
- ✅ echo.feature scenarios passing
- ✅ teacher-invites.feature scenarios passing (3 scenarios)
- **Total: Multiple scenarios passing**

## UI E2E Tests (Playwright)

**Note:** Requires the UI server to be running.

### Install Playwright browsers (first time only)
```cmd
cd C:\projects\gsdta\gsdta-web\ui
npm run pw:install
```

### Run E2E tests
```cmd
cd C:\projects\gsdta\gsdta-web\ui
npm run test:e2e
```

**Or run in headed mode to see the browser:**
```cmd
cd C:\projects\gsdta\gsdta-web\ui
npm run test:e2e:headed
```

**Expected Output:**
- ✅ Static page tests passing
- ✅ teacher-invites.spec.ts scenarios passing (3 tests)
- **Total: Multiple tests passing**

## Quick Test Summary

Run all tests with these commands:

```cmd
REM API Unit Tests
cd C:\projects\gsdta\gsdta-web\api && npm test

REM UI Unit Tests  
cd C:\projects\gsdta\gsdta-web\ui && npm test

REM API E2E (requires server)
cd C:\projects\gsdta\gsdta-web\api && npm run test:e2e

REM UI E2E (requires server)
cd C:\projects\gsdta\gsdta-web\ui && npm run test:e2e
```

## Troubleshooting

### If tests fail:

1. **Module not found errors:**
   ```cmd
   npm install
   ```

2. **TypeScript errors:**
   ```cmd
   npm run typecheck
   ```

3. **Firebase/Firestore errors:**
   - Ensure Firebase admin SDK is properly configured
   - Check environment variables
   - Use test mode: `set ALLOW_TEST_INVITES=1`

4. **Port already in use:**
   - Change port in package.json or kill process using the port

### Test Files Created/Modified

**API Tests:**
- ✅ `api/src/lib/__tests__/roleInvites.test.ts` (existing, 15 tests)
- ✅ `api/src/lib/__tests__/firestoreUsers.test.ts` (enhanced, 9 tests)
- ✅ `api/tests/e2e/features/teacher-invites.feature` (NEW, 3 scenarios)

**UI Tests:**
- ✅ `ui/src/__tests__/TeacherInviteForm.test.tsx` (NEW, 10 tests)
- ✅ `ui/src/__tests__/invite-accept.page.test.tsx` (NEW, 8 tests)
- ✅ `ui/tests/e2e/teacher-invites.spec.ts` (NEW, 3 tests)

## Expected Test Results Summary

| Test Suite | Location | Count | Status |
|------------|----------|-------|--------|
| API roleInvites | api/src/lib/__tests__ | 15 | ✅ Should Pass |
| API firestoreUsers | api/src/lib/__tests__ | 9 | ✅ Should Pass |
| API E2E teacher-invites | api/tests/e2e/features | 3 | ✅ Should Pass |
| UI TeacherInviteForm | ui/src/__tests__ | 10 | ✅ Should Pass |
| UI invite-accept page | ui/src/__tests__ | 8 | ✅ Should Pass |
| UI E2E teacher-invites | ui/tests/e2e | 3 | ✅ Should Pass |
| **TOTAL** | | **48+** | **✅ Expected** |

## Verification Checklist

- [ ] API unit tests pass (24 tests)
- [ ] UI unit tests pass (18+ tests)
- [ ] API E2E tests pass (3+ scenarios)
- [ ] UI E2E tests pass (3+ tests)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] All implementations working as documented

## Next Steps After Verification

If all tests pass:
1. Commit the changes
2. Create pull request
3. Run CI/CD pipeline
4. Deploy to staging environment
5. Perform manual testing
6. Deploy to production

If tests fail:
1. Check error messages
2. Review test logs
3. Fix issues
4. Re-run tests
5. Update documentation if needed
