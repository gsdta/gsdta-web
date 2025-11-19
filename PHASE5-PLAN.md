# Phase 5: Deprecate Mock Mode - Implementation Plan

## Overview

Phase 5 removes MSW (Mock Service Worker) and all mock-related code now that Firebase emulators provide full production parity for local development and CI/CD.

## Files to Remove

### MSW Files (ui/src/mocks/)
- `ui/src/mocks/browser.ts` - MSW browser setup
- `ui/src/mocks/handlers.ts` - MSW request handlers (16KB)
- `ui/src/mocks/server.ts` - MSW server setup
- **Action**: Delete entire `ui/src/mocks/` directory

### Dependencies
- `msw` package from `ui/package.json`
- **Action**: Remove from dependencies

## Files to Update

### 1. Environment Configuration

**ui/.env.example**
- Remove: `NEXT_PUBLIC_USE_MSW`
- Keep: Firebase configuration

**ui/.env.local.emulator**
- Remove: `NEXT_PUBLIC_USE_MSW=false`
- Already has Firebase emulator config

### 2. Components with MSW References

**ui/src/app/classes/page.tsx**
- Remove: MSW wait logic
- Remove: `window.__mswReady` checks
- Remove: `useMsw` variable

**ui/src/app/health/page.tsx**
- Remove: `NEXT_PUBLIC_USE_MSW` checks
- Remove: `window.__mswActive` checks
- Remove: MSW detection logic
- Simplify debug user logic (always use Firebase)

### 3. AuthProvider (if has mock logic)

**ui/src/components/AuthProvider.tsx**
- Check for mock authentication logic
- Remove if present
- Keep only Firebase auth

### 4. Protected Component

**ui/src/components/Protected.tsx**
- Remove: Mock mode detection
- Keep only Firebase mode

### 5. Test Files

**ui/src/app/signup/__tests__/page.test.tsx**
- Update: Remove mock mode setup
- Use emulator environment instead

**ui/src/components/__tests__/Protected.test.tsx**
- Update: Remove mock mode tests
- Focus on Firebase mode only

### 6. Other Pages with Auth Mode Checks

Files that check `NEXT_PUBLIC_AUTH_MODE`:
- `ui/src/app/signup/page.tsx`
- `ui/src/app/signin/page.tsx`
- `ui/src/app/logout/page.tsx`
- `ui/src/app/login/page.tsx`
- `ui/src/components/Header.tsx`

**Action**: 
- Keep Firebase mode
- Remove mock mode branches
- Update to always use Firebase (will use emulators in dev)

## Environment Variable Cleanup

### Remove from all documentation:
- `NEXT_PUBLIC_USE_MSW`

### Update .env files:
- Remove MSW references
- Keep only Firebase config

## Documentation Updates

### Files to Update:
1. `ui/README.md` - Remove MSW mentions
2. `ui/.env.example` - Remove MSW config
3. `QUICKSTART-EMULATORS.md` - Already updated
4. Any remaining docs with mock mode references

## Verification Steps

1. ✅ Remove MSW dependency
2. ✅ Delete mocks directory
3. ✅ Update all files with MSW references
4. ✅ Remove mock auth logic
5. ✅ Update environment examples
6. ✅ Run typecheck (ensure no errors)
7. ✅ Run lint (ensure clean)
8. ✅ Test local dev (should work with emulators)
9. ✅ Update documentation

## Expected Benefits

- **Reduced complexity**: Single auth mode (Firebase)
- **Smaller bundle**: No MSW in production
- **Clearer code**: No conditional mock logic
- **Easier onboarding**: One development mode
- **Better testing**: Production-like environment only

## Backward Compatibility

**Breaking Changes**: None for production
- Production already uses Firebase mode
- Local dev switches from mock to emulators
- Developers will need to use emulators for local dev

**Migration for Developers**:
1. Pull latest code
2. Copy `.env.local.emulator` to `.env.local`
3. Run `./start-dev-local.sh`
4. Emulators + seeding handled automatically

## Implementation Order

1. **Document changes** (this file)
2. **Remove MSW files** (mocks directory)
3. **Update package.json** (remove MSW dependency)
4. **Clean up component code** (remove MSW checks)
5. **Update environment files** (remove MSW config)
6. **Update documentation** (remove MSW references)
7. **Verify** (typecheck, lint, test)
8. **Create Phase 5 completion docs**

## Success Criteria

- ✅ No MSW references in codebase
- ✅ No mock authentication logic
- ✅ TypeScript compiles cleanly
- ✅ Linter passes
- ✅ Local dev works with emulators
- ✅ CI/CD passes with emulators
- ✅ Documentation updated
- ✅ Smaller bundle size

---

**Ready to implement?** This will simplify the codebase significantly and make local development identical to production (via emulators).
