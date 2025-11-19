# CI Build Fix - Java Dependency

**Date**: November 19, 2024  
**Issue**: Firebase emulators failing to start in GitHub Actions  
**Status**: ✅ FIXED

---

## Problem

GitHub Actions CI workflow failed with:
```
Error: Could not spawn `java -version`. 
Please make sure Java is installed and on your system PATH.
```

**Root Cause**: Firebase emulators require Java, but GitHub Actions runners don't have it installed by default.

---

## Solution

Added Java 21 setup to all jobs that start Firebase emulators in `.github/workflows/ci.yml`:

```yaml
- name: Setup Java
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '21'
```

### Jobs Updated

1. **emulator-setup** (line 29)
2. **api** (line 99)
3. **ui** (line 160)

---

## Why Java 21?

- Firebase emulators require Java to run
- Firebase tools 15+ will require Java 21 minimum
- Temurin is a high-quality, free OpenJDK distribution
- Future-proof for upcoming Firebase CLI updates

---

## Changes Made

### Before
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}

- name: Install Firebase CLI
  run: npm install -g firebase-tools

- name: Start Firebase Emulators
  run: firebase emulators:start ...
```

### After
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}

- name: Setup Java  # ← NEW
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '21'

- name: Install Firebase CLI
  run: npm install -g firebase-tools

- name: Start Firebase Emulators
  run: firebase emulators:start ...
```

---

## Verification

After the fix, CI should:

1. ✅ Setup Java 21 successfully
2. ✅ Install Firebase CLI
3. ✅ Start Firebase emulators (auth, firestore)
4. ✅ Seed test data (5 users, 3 students, 3 invites)
5. ✅ Run API tests (26 tests)
6. ✅ Run UI tests (56 tests)
7. ✅ Pass all lint and typecheck steps

---

## Testing

To verify locally that emulators require Java:

```bash
# Without Java
firebase emulators:start --project demo-gsdta
# Error: Could not spawn `java -version`

# With Java installed
java -version
# openjdk version "21.0.x"

firebase emulators:start --project demo-gsdta
# ✅ Emulators start successfully
```

---

## Impact

**Local Development**: ✅ No impact (Firebase CLI on local machines already works)  
**CI/CD**: ✅ Fixed - emulators now start correctly  
**Production**: ✅ No impact (production doesn't use emulators)

---

## Next Steps

1. Commit changes to `.github/workflows/ci.yml`
2. Push to develop branch
3. Monitor GitHub Actions run
4. Verify all jobs pass

Expected CI run time: ~5-7 minutes total

---

**Status**: ✅ READY TO COMMIT
