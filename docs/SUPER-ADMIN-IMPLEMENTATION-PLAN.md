# Super Admin Implementation Plan

**Project**: GSDTA Web Application
**Feature**: Super Admin Role & Capabilities
**Scope**: Full implementation (All 7 phases)
**Created**: December 27, 2025

---

## Summary

Implement `super_admin` role with full administrative capabilities including admin management, audit logging, security monitoring, system configuration, and data recovery.

**Key Decisions**:
- First super_admin created via seed script
- Shared admin UI with extra "Super Admin" sidebar section
- Audit logging for new super-admin actions only (not retrofitting existing endpoints)

---

## Phase 1: Super Admin Role Infrastructure

**Complexity**: LOW-MEDIUM
**Goal**: Establish `super_admin` role without breaking existing admin functionality

### Files to Modify

| File | Changes |
|------|---------|
| `ui/src/lib/auth-types.ts` | Add `super_admin` to Role type |
| `api/src/lib/guard.ts` | Add role hierarchy (super_admin includes admin), add test user |
| `ui/src/components/Protected.tsx` | Handle super_admin routing |
| `persistence/firestore.rules` | Add `isSuperAdmin()` helper |
| `scripts/seed-emulator.js` | Add super_admin test user |
| `ui/src/app/select-role/page.tsx` | Add super_admin role config |

### Implementation Details

**1. Type Update** (`ui/src/lib/auth-types.ts`):
```typescript
export type Role = "super_admin" | "admin" | "teacher" | "parent";
```

**2. Guard Update** (`api/src/lib/guard.ts`):
```typescript
// super_admin implicitly has admin privileges
if (Array.isArray(requireRoles) && requireRoles.length > 0) {
  const userRoles = profile.roles || [];
  const hasRole = requireRoles.some((required) =>
    userRoles.includes(required) ||
    (required === 'admin' && userRoles.includes('super_admin'))
  );
  if (!hasRole) {
    throw new AuthError(403, 'auth/forbidden', 'Insufficient privileges');
  }
}
```

**3. Seed Script** (`scripts/seed-emulator.js`):
```javascript
{
  email: 'superadmin@test.com',
  password: 'superadmin123',
  displayName: 'Super Admin',
  roles: ['super_admin'],
  status: 'active'
}
```

---

## Phase 2: Admin Management

**Complexity**: MEDIUM
**Goal**: Enable super admins to promote/demote users to admin role

### New Files to Create

| File | Purpose |
|------|---------|
| `api/src/app/v1/super-admin/users/admins/route.ts` | List all admins |
| `api/src/app/v1/super-admin/users/[uid]/promote/route.ts` | Promote to admin |
| `api/src/app/v1/super-admin/users/[uid]/demote/route.ts` | Demote from admin |
| `api/src/lib/firestoreAdminManagement.ts` | Admin management functions |
| `ui/src/app/admin/super-admin/layout.tsx` | Super admin section layout |
| `ui/src/app/admin/super-admin/admins/page.tsx` | Admin list page |

### Files to Modify

| File | Changes |
|------|---------|
| `ui/src/app/admin/AdminLayoutClient.tsx` | Add "Super Admin" section to sidebar |

### API Endpoints

```
GET    /api/v1/super-admin/users/admins         - List all admins
POST   /api/v1/super-admin/users/:uid/promote   - Promote user to admin
POST   /api/v1/super-admin/users/:uid/demote    - Demote admin to user
```

### Firestore Collection

**Collection**: `adminPromotions`
```typescript
{
  id: string;
  targetUserId: string;
  targetUserEmail: string;
  action: 'promote' | 'demote';
  previousRoles: string[];
  newRoles: string[];
  reason?: string;
  performedBy: string;
  performedAt: Timestamp;
}
```

---

## Phase 3: Audit Logging System

**Complexity**: MEDIUM
**Goal**: Comprehensive audit trail for super-admin actions

### New Files to Create

| File | Purpose |
|------|---------|
| `api/src/lib/auditLog.ts` | Audit logging library |
| `api/src/app/v1/super-admin/audit-log/route.ts` | Query audit logs |
| `api/src/app/v1/super-admin/audit-log/export/route.ts` | Export audit logs |
| `ui/src/app/admin/super-admin/audit-log/page.tsx` | Audit log viewer |

### Firestore Collection

**Collection**: `auditLog`
```typescript
{
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;        // 'admin.promote', 'admin.demote', 'user.suspend'
  resource: string;      // 'user', 'config', etc.
  resourceId: string;
  details: {
    changes?: { field: string; oldValue: any; newValue: any }[];
    metadata?: Record<string, any>;
  };
  ipAddress?: string;
  timestamp: Timestamp;
  severity: 'info' | 'warning' | 'critical';
}
```

### Firestore Indexes

```json
{
  "collectionGroup": "auditLog",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

---

## Phase 4: Security Monitoring

**Complexity**: MEDIUM-HIGH
**Goal**: Monitor failed logins and suspicious activity

### New Files to Create

| File | Purpose |
|------|---------|
| `api/src/lib/securityEvents.ts` | Security event logging |
| `api/src/app/v1/super-admin/security/failed-logins/route.ts` | Failed login list |
| `api/src/app/v1/super-admin/security/events/route.ts` | Security events |
| `ui/src/app/admin/super-admin/security/page.tsx` | Security dashboard |

### Firestore Collection

**Collection**: `securityEvents`
```typescript
{
  id: string;
  type: 'login_failed' | 'rate_limit_exceeded' | 'unauthorized_access';
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Timestamp;
  resolved: boolean;
}
```

### Integration Points

- `api/src/lib/auth.ts` - Log failed authentication
- `api/src/lib/rateLimit.ts` - Log rate limit violations

---

## Phase 5: System Configuration

**Complexity**: HIGH
**Goal**: System-wide configuration management

### New Files to Create

| File | Purpose |
|------|---------|
| `api/src/lib/systemConfig.ts` | System config functions |
| `api/src/app/v1/super-admin/config/route.ts` | Get/update config |
| `api/src/app/v1/super-admin/config/maintenance/route.ts` | Maintenance mode |
| `ui/src/app/admin/super-admin/settings/page.tsx` | Settings page |
| `ui/src/app/admin/super-admin/settings/maintenance/page.tsx` | Maintenance mode UI |

### Firestore Collection

**Collection**: `systemConfig` (single document: `main`)
```typescript
{
  maintenance: {
    enabled: boolean;
    message?: { en: string; ta: string };
    startTime?: Timestamp;
    endTime?: Timestamp;
    allowedRoles?: string[];
  };
  rateLimits: {
    inviteCreation: number;
    loginAttempts: number;
    apiGeneral: number;
  };
  backupSchedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    retentionDays: number;
    lastBackupAt?: Timestamp;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}
```

### Maintenance Mode Middleware

Update `api/src/middleware.ts` (or create if needed) to check maintenance mode.

---

## Phase 6: Emergency Actions & Data Recovery

**Complexity**: HIGH
**Goal**: Emergency suspension and data recovery

### New Files to Create

| File | Purpose |
|------|---------|
| `api/src/app/v1/super-admin/users/[uid]/emergency-suspend/route.ts` | Emergency suspend |
| `api/src/app/v1/super-admin/deleted-data/route.ts` | List deleted data |
| `api/src/app/v1/super-admin/deleted-data/[id]/restore/route.ts` | Restore data |
| `api/src/lib/dataRecovery.ts` | Recovery functions |
| `ui/src/app/admin/super-admin/recovery/page.tsx` | Recovery dashboard |

### Firestore Collection

**Collection**: `deletedData`
```typescript
{
  id: string;
  collection: string;      // 'users', 'students', etc.
  originalId: string;
  data: Record<string, any>;
  deletedAt: Timestamp;
  deletedBy: string;
  expiresAt: Timestamp;    // Auto-purge after 90 days
}
```

---

## Phase 7: System Data Export

**Complexity**: MEDIUM
**Goal**: Complete system data export for compliance

### New Files to Create

| File | Purpose |
|------|---------|
| `api/src/app/v1/super-admin/export/route.ts` | Initiate export |
| `api/src/app/v1/super-admin/export/[jobId]/route.ts` | Check status, download |
| `api/src/lib/dataExport.ts` | Export functions |
| `ui/src/app/admin/super-admin/export/page.tsx` | Export UI |

### Firestore Collection

**Collection**: `exportJobs`
```typescript
{
  id: string;
  type: 'full' | 'users' | 'students' | 'audit';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedBy: string;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
  downloadUrl?: string;
  expiresAt?: Timestamp;
  error?: string;
}
```

---

## UI Navigation Structure

Add to admin sidebar (`ui/src/app/admin/AdminLayoutClient.tsx`):

```
Super Admin (only visible to super_admin role)
├── Admin Users        → /admin/super-admin/admins
├── Audit Log          → /admin/super-admin/audit-log
├── Security           → /admin/super-admin/security
├── System Settings    → /admin/super-admin/settings
├── Data Recovery      → /admin/super-admin/recovery
└── Data Export        → /admin/super-admin/export
```

---

## New Firestore Collections Summary

| Collection | Purpose | Indexes Needed |
|------------|---------|----------------|
| `adminPromotions` | Track admin role changes | performedAt DESC |
| `auditLog` | All super-admin actions | userId+timestamp, action+timestamp |
| `securityEvents` | Failed logins, violations | type+timestamp, resolved+timestamp |
| `systemConfig` | System configuration | None (single doc) |
| `deletedData` | Soft-deleted records | collection+deletedAt, expiresAt |
| `exportJobs` | Export job tracking | status+requestedAt |

---

## Implementation Order

1. **Phase 1**: Role infrastructure (required for all other phases)
2. **Phase 2**: Admin management (core super-admin feature)
3. **Phase 3**: Audit logging (needed for compliance)
4. **Phase 4**: Security monitoring
5. **Phase 5**: System configuration
6. **Phase 6**: Emergency actions & recovery
7. **Phase 7**: Data export

---

## Testing Strategy

- Unit tests for guard.ts role hierarchy logic
- API integration tests for each super-admin endpoint
- E2E tests for promote/demote flow
- Seed script verification for super_admin user

---

## Critical Dependencies

1. Phase 1 must complete before any other phase
2. Phase 3 (audit logging) should integrate with Phases 2, 4, 5, 6
3. Firestore indexes must be deployed before querying audit logs

---

## Risk Mitigation

- **firebase-admin bundling**: Keep super-admin routes isolated, test standalone builds after each phase
- **Security**: All super-admin endpoints require `requireRoles: ['super_admin']`
- **Backward compatibility**: super_admin passes all existing admin checks via role hierarchy

---

## Testing Requirements

### Regression Testing
- Run `./run-all-tests.sh` after each phase to ensure no regressions
- All existing tests must pass before proceeding to next phase

### New Tests to Create

**Unit Tests (API)**:
- `api/src/lib/__tests__/guard.test.ts` - Test super_admin role hierarchy
- `api/src/lib/__tests__/auditLog.test.ts` - Test audit logging
- `api/src/lib/__tests__/firestoreAdminManagement.test.ts` - Test admin promotion/demotion

**Unit Tests (UI)**:
- `ui/src/components/__tests__/Protected.test.tsx` - Test super_admin routing
- `ui/src/app/admin/super-admin/__tests__/` - Component tests

**Cucumber Tests (API E2E)**:
- `api/e2e/features/super-admin-promote.feature` - Admin promotion flow
- `api/e2e/features/super-admin-demote.feature` - Admin demotion flow
- `api/e2e/features/super-admin-audit-log.feature` - Audit log queries
- `api/e2e/features/super-admin-security.feature` - Security events

**Playwright Tests (UI E2E)**:
- `ui/e2e/super-admin-admins.spec.ts` - Admin management UI
- `ui/e2e/super-admin-audit-log.spec.ts` - Audit log viewer
- `ui/e2e/super-admin-settings.spec.ts` - System settings

---

## Documentation Updates

After implementation, update:
- `docs/ROLES.md` - Mark super_admin features as implemented [x]
- `docs/FEATURES.md` - Add super admin section
- `docs/REQUIREMENTS.md` - Update with super admin capabilities
- `docs/FIRESTORE-COLLECTIONS.md` - Add new collections
- `persistence/firestore.indexes.json` - Add required indexes

---

## Git Workflow

1. **Create branch**: `git checkout -b feature/super-admin`
2. Implement each phase with commits
3. Run tests after each phase: `./run-all-tests.sh`
4. Update documentation
5. Create PR when complete
