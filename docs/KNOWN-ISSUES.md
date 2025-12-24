# Known Issues

**Last Updated**: December 24, 2025

This document tracks known issues, workarounds, and lessons learned from production incidents.

---

## Critical: firebase-admin Bundling in Next.js Standalone Builds

**Severity**: Critical
**Date Discovered**: December 24, 2025
**Status**: Workaround in place (reverted to commit `28e3348`)

### Problem Description

After adding new API routes to the codebase, production deployments started failing with 500 errors on authenticated endpoints. The error in Cloud Run logs showed:

```
Error: Cannot find package 'firebase-admin' imported from /app/api/.next/standalone/api/.next/server/app/v1/me/route.js
```

### Affected Endpoints

All endpoints that use `firebase-admin` for authentication or Firestore access:
- `/api/v1/me`
- `/api/v1/flash-news` (removed)
- Any admin routes requiring authentication

### Root Cause Analysis

The Next.js standalone build (`output: 'standalone'` in `next.config.ts`) creates a minimal deployment bundle. When certain conditions are met, the bundler fails to include `firebase-admin` in the output.

**Suspected triggers** (not definitively confirmed):
1. Adding new API route files after a stable commit
2. Creating shared modules that import `firebase-admin` indirectly
3. Circular dependencies involving Firebase imports
4. Changes to route structure that affect tree-shaking

### What Was Reverted

The following features added after commit `28e3348` were removed:

| Feature | Routes | Notes |
|---------|--------|-------|
| Flash News | `/api/v1/flash-news/`, `/api/v1/admin/flash-news/` | Announcement marquee system |
| Teacher Attendance | `teacher/classes/[id]/attendance/` | Class attendance marking |
| Admin Class Students | `admin/classes/[id]/students/[studentId]/` | Student management within classes |
| Shared CORS Module | `api/src/lib/cors.ts` | Centralized CORS handling |

### What Was Tried (Did NOT Work)

1. **serverExternalPackages config**
   ```typescript
   // next.config.ts
   serverExternalPackages: ['firebase-admin']
   ```
   Result: Did not resolve the bundling issue

2. **Copying node_modules to standalone output**
   ```dockerfile
   COPY --from=builder /app/api/node_modules ./api/node_modules
   ```
   Result: Increased image size but did not fix the error

3. **Removing just the new routes**
   Result: Issue persisted - something else was affected

4. **Resetting package-lock.json**
   Result: Broke `npm ci` due to version mismatches

### Solution That Worked

Complete reset to commit `28e3348` (last known working state):
```bash
git checkout 28e3348 -- api/
```

Then updated only the CORS configuration to include `app.gsdta.com` in allowed origins.

---

## Guidelines for Future Development

### Before Adding New API Routes

1. **Test standalone build locally**
   ```bash
   cd api
   npm run build
   # Check that .next/standalone exists and has correct structure
   ls -la .next/standalone/
   ```

2. **Test in Docker locally**
   ```bash
   docker build -t test-build .
   docker run -p 3000:3000 test-build
   # Test the endpoints
   curl http://localhost:3000/api/v1/health
   ```

3. **Deploy incrementally**
   - Add one route at a time
   - Deploy and verify before adding more
   - If issues occur, you know exactly which route caused it

### Route File Best Practices

1. **Keep CORS inline** - Don't create shared CORS modules:
   ```typescript
   // GOOD: Inline CORS in each route
   function corsHeaders(origin: string | null) {
     // ... implementation
   }

   // BAD: Importing from shared module
   import { corsHeaders } from '@/lib/cors';
   ```

2. **Import firebase-admin directly** in routes that need it:
   ```typescript
   // GOOD: Direct import
   import { adminDb } from '@/lib/firebaseAdmin';

   // CAREFUL: Indirect imports through helper modules
   import { someHelper } from '@/lib/helpers'; // if this imports firebase-admin
   ```

3. **Keep route files self-contained** - Each route should work independently

### If Issues Recur

1. Check Cloud Run logs for the exact error
2. Compare current routes with commit `28e3348`
3. Identify what changed since last working deployment
4. Consider reverting to `28e3348` and re-adding changes one at a time

---

## Other Known Issues

### CORS for app.gsdta.com

**Status**: Resolved in commit `28e3348` revert

When deploying to `app.gsdta.com`, ensure all API routes include it in the allowed origins:

```typescript
const prodAllowed = new Set<string>([
  'https://gsdta.com',
  'https://www.gsdta.com',
  'https://app.gsdta.com',  // Don't forget this!
]);
```

---

## Incident Timeline (December 24, 2025)

| Time | Event |
|------|-------|
| Initial | Flash News and other features deployed to production |
| +1hr | 500 errors reported on `/api/v1/me` and `/api/v1/flash-news` |
| +2hr | Attempted serverExternalPackages fix - did not work |
| +3hr | Attempted removing new routes - did not work |
| +4hr | Reset to commit `28e3348` |
| +5hr | Verified working, synced develop and main branches |

### Lessons Learned

1. **Deploy incrementally** - Don't batch multiple route additions
2. **Test standalone builds** before pushing to main
3. **Keep working commits tagged** - We could quickly identify `28e3348` as the last working state
4. **Document the issue** - This file exists so we don't repeat the same mistakes

---

## Related Documentation

- [FEATURES.md](./FEATURES.md) - Lists reverted features with warnings
- [PROJECT-STATUS.md](./PROJECT-STATUS.md) - Overall project status with rollback notes
- [GRADES-CLASSES-IMPLEMENTATION.md](./GRADES-CLASSES-IMPLEMENTATION.md) - Implementation plan with cautions
