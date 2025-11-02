# Running Tests - Quick Start Guide

## ⚠️ System Limitation

PowerShell 6+ is not available on this system, so tests must be run using Windows Command Prompt (cmd.exe) or batch files.

## 🚀 Quick Start

### Step 1: Verify Setup
```cmd
check-test-setup.bat
```

This will:
- Check Node.js and npm are installed
- Install dependencies if needed
- Verify all test files exist

### Step 2: Run API Unit Tests
```cmd
run-api-tests.bat
```

**Expected:** 24 tests passing (15 + 9)

### Step 3: Run UI Unit Tests
```cmd
run-ui-tests.bat
```

**Expected:** 18+ tests passing (10 + 8 + existing)

## 📝 Manual Test Commands

If batch files don't work, use these commands directly:

### API Unit Tests
```cmd
cd C:\projects\gsdta\gsdta-web\api
npm test
```

### UI Unit Tests
```cmd
cd C:\projects\gsdta\gsdta-web\ui
npm test
```

### API E2E Tests (requires running server)
```cmd
REM Terminal 1 - Start server
cd C:\projects\gsdta\gsdta-web\api
npm run dev

REM Terminal 2 - Run tests
cd C:\projects\gsdta\gsdta-web\api
set ALLOW_TEST_INVITES=1
npm run test:cucumber
```

### UI E2E Tests (requires running server)
```cmd
cd C:\projects\gsdta\gsdta-web\ui
npm run test:e2e
```

## ✅ What Tests Were Added

### API Tests (24 total)

**File: `api/src/lib/__tests__/roleInvites.test.ts`**
- ✅ generateToken: URL-safe format
- ✅ generateToken: uniqueness
- ✅ createRoleInvite: basic creation
- ✅ createRoleInvite: email normalization
- ✅ createRoleInvite: default expiration
- ✅ getInviteByToken: find invite
- ✅ getInviteByToken: not found
- ✅ markInviteAccepted: update status
- ✅ isInviteUsable: pending non-expired
- ✅ isInviteUsable: null invite
- ✅ isInviteUsable: accepted invite
- ✅ isInviteUsable: revoked invite
- ✅ isInviteUsable: expired invite
- ✅ isInviteUsable: status checks
- ✅ isInviteUsable: expiration checks

**File: `api/src/lib/__tests__/firestoreUsers.test.ts`**
- ✅ createUserProfile: default roles
- ✅ createUserProfile: custom roles
- ✅ createUserProfile: parent role default
- ✅ ensureUserHasRole: new user
- ✅ ensureUserHasRole: existing user add role
- ✅ ensureUserHasRole: no duplicates
- ✅ ensureUserHasRole: reactivate suspended
- ✅ getUserProfile: not found
- ✅ getUserProfile: found

**File: `api/tests/e2e/features/teacher-invites.feature`**
- ✅ Verify valid pending invite
- ✅ Invalid token returns 404
- ✅ Missing token returns 400

### UI Tests (18+ total)

**File: `ui/src/__tests__/TeacherInviteForm.test.tsx`**
- ✅ Render form inputs
- ✅ Default expiration 72h
- ✅ Submit disabled when empty
- ✅ Submit enabled with email
- ✅ Create invite successfully
- ✅ API parameters correct
- ✅ Display error on failure
- ✅ Error when not authenticated
- ✅ Loading state
- ✅ Copy to clipboard

**File: `ui/src/__tests__/invite-accept.page.test.tsx`**
- ✅ Error when token missing
- ✅ Verify token on mount
- ✅ Error for invalid token
- ✅ Show accept button
- ✅ Prompt Google sign-in for mismatch
- ✅ Accept and redirect success
- ✅ Display accept failure error
- ✅ Check authentication

**File: `ui/tests/e2e/teacher-invites.spec.ts`**
- ✅ Display invite details
- ✅ Show error for invalid token
- ✅ Show error when missing token

## 🔍 Verifying Test Results

### Success Indicators

**API Unit Tests:**
```
✓ generateToken: should generate a URL-safe base64 token (0.5ms)
✓ generateToken: should generate unique tokens (0.2ms)
✓ createRoleInvite: should create a pending invite with token (2.1ms)
...
tests 24
pass 24
```

**UI Unit Tests:**
```
 PASS  src/__tests__/TeacherInviteForm.test.tsx
 PASS  src/__tests__/invite-accept.page.test.tsx
 
Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
```

**API E2E Tests:**
```
3 scenarios (3 passed)
9 steps (9 passed)
```

**UI E2E Tests:**
```
3 passed (5s)
```

## 🐛 Troubleshooting

### Issue: "Cannot find module"
**Solution:**
```cmd
cd api
npm install

cd ..\ui
npm install
```

### Issue: "Port 8080 already in use"
**Solution:**
```cmd
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

### Issue: Tests timeout
**Solution:**
- Increase timeout in package.json
- Check network connectivity
- Ensure Firebase credentials are set

### Issue: "tsx is not recognized"
**Solution:**
```cmd
cd api
npm install --save-dev tsx
```

### Issue: Jest tests fail in UI
**Solution:**
```cmd
cd ui
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

## 📊 Test Coverage Summary

| Component | Tests | Status |
|-----------|-------|--------|
| API roleInvites lib | 15 | ✅ Ready |
| API firestoreUsers lib | 9 | ✅ Ready |
| API E2E invites | 3 | ✅ Ready |
| UI TeacherInviteForm | 10 | ✅ Ready |
| UI invite-accept page | 8 | ✅ Ready |
| UI E2E invites | 3 | ✅ Ready |
| **TOTAL** | **48+** | **✅ Complete** |

## 📋 Test Execution Checklist

- [ ] Run `check-test-setup.bat` - verify environment
- [ ] Run `run-api-tests.bat` - should pass 24 tests
- [ ] Run `run-ui-tests.bat` - should pass 18+ tests
- [ ] Check for TypeScript errors: `cd api && npm run typecheck`
- [ ] Check for linting errors: `cd api && npm run lint`
- [ ] Optionally run E2E tests (requires server setup)
- [ ] Review test output for any warnings
- [ ] Document any test failures
- [ ] All green? Ready to commit! ✅

## 🎯 Next Steps After Tests Pass

1. **Commit changes:**
   ```cmd
   git add .
   git commit -m "feat: implement teacher invites with comprehensive tests"
   ```

2. **Push to repository:**
   ```cmd
   git push origin <branch-name>
   ```

3. **Create Pull Request**

4. **Run CI/CD pipeline**

5. **Deploy to staging**

6. **Manual testing**

7. **Deploy to production**

## 📞 Support

If tests fail or you need help:
1. Check the error messages carefully
2. Review the test file for expected behavior
3. Check the implementation matches test expectations
4. Verify environment variables are set
5. Ensure dependencies are installed

See `TEST-VERIFICATION.md` for more detailed instructions.
