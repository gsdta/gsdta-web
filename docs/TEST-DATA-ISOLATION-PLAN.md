# Test Data Isolation Strategy - Implementation Plan

## Problem Statement

API Cucumber tests and Playwright E2E tests both rely on Firestore emulators, causing data conflicts:
- Different seeding strategies (minimal vs full)
- Playwright tests hardcode seeded data references (e.g., "Arun Kumar", "Meera Krishnan")
- Tests are not isolated - they depend on external seed state

## User Requirements

- **Execution**: Test suites run separately (different CI jobs)
- **Priority**: Full test isolation - each test creates and cleans up its own data
- **Scope**: Full refactor acceptable for both test suites

---

## Recommended Strategy

**Use existing API endpoints as admin** to create test data, with per-test cleanup via tracked IDs.

### Why This Approach?

| Approach | Pros | Cons |
|----------|------|------|
| **API endpoints (recommended)** | Tests real APIs, no new infra, E2E authentic | Slightly slower than direct DB |
| Direct Firestore Admin SDK | Fast | Bypasses API validation, complex setup in Playwright |
| Test-only API endpoints | Flexible | Security risk, duplicates existing admin APIs |

---

## Implementation Phases

### Phase 1: Playwright Test Data Infrastructure

**Create test data factory that uses existing API endpoints:**

#### 1.1 Create API Client Helper
**File:** `ui/tests/e2e/helpers/apiClient.ts`

```typescript
export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  async loginAsAdmin(): Promise<void> { /* Get Firebase token */ }
  async post(path: string, data: object): Promise<Response>
  async delete(path: string): Promise<Response>
  async get(path: string): Promise<Response>
}
```

#### 1.2 Create Test Data Factory
**File:** `ui/tests/e2e/helpers/testData.ts`

```typescript
export class TestDataFactory {
  private createdEntities: { type: string; id: string }[] = [];
  private apiClient: ApiClient;
  private workerId: string; // For parallel test isolation

  async createGrade(data?: Partial<Grade>): Promise<Grade>
  async createClass(gradeId: string, data?: Partial<Class>): Promise<Class>
  async createStudent(data: StudentInput): Promise<Student>
  async cleanup(): Promise<void> // Deletes all tracked entities via API
}
```

#### 1.3 Create Playwright Fixture
**File:** `ui/tests/e2e/fixtures/testData.fixture.ts`

```typescript
import { test as base } from '@playwright/test';
import { TestDataFactory } from '../helpers/testData';

export const test = base.extend<{ testData: TestDataFactory }>({
  testData: async ({ page }, use, testInfo) => {
    const factory = new TestDataFactory(testInfo.workerIndex.toString());
    await factory.initialize();
    await use(factory);
    await factory.cleanup(); // Auto-cleanup after each test
  },
});

export { expect } from '@playwright/test';
```

### Phase 2: Refactor Playwright Tests

**Example refactoring for `admin/students.spec.ts`:**

**Before (current - depends on seed):**
```typescript
test('AE2E-003: Admin sees all students', async ({ page }) => {
  await page.goto('/admin/students');
  await expect(page.getByText('Arun Kumar')).toBeVisible(); // Hardcoded!
});
```

**After (isolated):**
```typescript
test('AE2E-003: Admin sees all students', async ({ page, testData }) => {
  // Create test-specific data
  const grade = await testData.createGrade({ name: 'Test Grade' });
  const student = await testData.createStudent({
    firstName: 'Test',
    lastName: 'Student',
    gradeId: grade.id,
    status: 'active'
  });

  await page.goto('/admin/students');
  await expect(page.getByText('Test Student')).toBeVisible();
  // Cleanup automatic via fixture
});
```

### Phase 3: Standardize Cucumber Test Cleanup

The existing pattern in `enrollment.steps.ts` is excellent. Extend it to all step files.

#### 3.1 Create Centralized Tracker
**File:** `api/tests/e2e/support/testDataTracker.ts`

```typescript
class TestDataTracker {
  private data: Record<string, string[]> = {};

  track(collection: string, id: string): void
  async cleanup(): Promise<void> // Batch delete all tracked
  reset(): void
}

export const testDataTracker = new TestDataTracker();
```

#### 3.2 Update Hooks
**File:** `api/tests/e2e/support/hooks.ts` (modify)

```typescript
import { testDataTracker } from './testDataTracker';

After(async function () {
  await testDataTracker.cleanup();
  testDataTracker.reset();
});
```

#### 3.3 Update Step Files

| File | Current State | Changes Needed |
|------|--------------|----------------|
| `enrollment.steps.ts` | Has tracking ✓ | Migrate to centralized tracker |
| `student.steps.ts` | No tracking ✗ | Add tracking |
| `hero-content.steps.ts` | No tracking ✗ | Add tracking |

### Phase 4: Simplify Seed Scripts

#### 4.1 Create Minimal Seed
**File:** `scripts/seed-test-users.js`

Only seeds what's absolutely required:
- Auth users (admin, teacher, parent)
- User profiles in Firestore

Does NOT create: grades, classes, students, hero content, invites

#### 4.2 Update CI to Use Minimal Seed

Both test suites use the same minimal seed:
```yaml
- name: Seed test users
  run: node scripts/seed-test-users.js
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `ui/tests/e2e/helpers/apiClient.ts` | Authenticated API client for test data |
| `ui/tests/e2e/helpers/testData.ts` | Test data factory with tracking |
| `ui/tests/e2e/fixtures/testData.fixture.ts` | Playwright fixture for auto-cleanup |
| `api/tests/e2e/support/testDataTracker.ts` | Centralized data tracking for Cucumber |
| `scripts/seed-test-users.js` | Minimal seed (users only) |

## Files to Modify

| File | Changes |
|------|---------|
| `ui/tests/e2e/admin/students.spec.ts` | Use testData fixture, remove hardcoded refs |
| `ui/tests/e2e/admin/class-roster.spec.ts` | Use testData fixture |
| `ui/tests/e2e/admin/classes.spec.ts` | Use testData fixture |
| `ui/tests/e2e/admin/grades.spec.ts` | Use testData fixture |
| `ui/tests/e2e/parent/dashboard.spec.ts` | Use testData fixture |
| `ui/tests/e2e/parent/students.spec.ts` | Use testData fixture |
| `api/tests/e2e/support/hooks.ts` | Import centralized tracker |
| `api/tests/e2e/steps/student.steps.ts` | Add tracking |
| `api/tests/e2e/steps/hero-content.steps.ts` | Add tracking |
| `.github/workflows/e2e.yml` | Use minimal seed |
| `.github/workflows/cucumber.yml` | Use minimal seed |

---

## Parallel Execution Strategy

Playwright runs with 4 workers. To prevent collisions:

1. **Worker-prefixed IDs**: Each entity created includes worker index
   ```typescript
   const id = `w${workerIndex}-student-${uuid()}`;
   ```

2. **Test-specific assertions**: Tests only assert on data they created
   ```typescript
   // Instead of: await expect(page.getByText('Arun Kumar'))
   await expect(page.getByText(student.firstName + ' ' + student.lastName))
   ```

3. **Per-test cleanup**: Each test cleans only its tracked entities

---

## Implementation Order

1. **Phase 1**: Create Playwright test data infrastructure (helpers + fixture)
2. **Phase 2**: Refactor one Playwright test file as proof of concept (`admin/students.spec.ts`)
3. **Phase 3**: Standardize Cucumber cleanup pattern
4. **Phase 4**: Refactor remaining Playwright test files
5. **Phase 5**: Create minimal seed script and update CI

---

## Implementation Progress

### Completed
- [x] `ui/tests/e2e/helpers/apiClient.ts` - API client for test data creation
- [x] `ui/tests/e2e/helpers/testData.ts` - Test data factory with cleanup (includes `assignTeacherToClass` method)
- [x] `ui/tests/e2e/fixtures/testData.fixture.ts` - Playwright fixture for auto-cleanup
- [x] `api/tests/e2e/support/testDataTracker.ts` - Centralized tracker for Cucumber
- [x] `scripts/seed-test-users.js` - Minimal seed script (users only)
- [x] Updated `api/tests/e2e/support/hooks.ts` - Integrated centralized cleanup
- [x] Updated `api/tests/e2e/steps/enrollment.steps.ts` - Uses testDataTracker
- [x] Updated `api/tests/e2e/steps/student.steps.ts` - Uses testDataTracker
- [x] Updated `api/tests/e2e/steps/hero-content.steps.ts` - Uses testDataTracker
- [x] Refactored `ui/tests/e2e/admin/students.spec.ts` - Uses testData fixture
- [x] Refactored `ui/tests/e2e/admin/class-roster.spec.ts` - Uses testData fixture
- [x] Refactored `ui/tests/e2e/admin/classes.spec.ts` - Uses testData fixture
- [x] Refactored `ui/tests/e2e/admin/grades.spec.ts` - Uses testData fixture
- [x] Refactored `ui/tests/e2e/admin/teacher-assignments.spec.ts` - Uses testData fixture
- [x] Refactored `ui/tests/e2e/parent/students.spec.ts` - Uses testData fixture
- [x] Updated `.github/workflows/e2e.yml` - Uses `npm run seed:minimal`
- [x] Updated `.github/workflows/main.yml` - Uses `npm run seed:minimal`

### Remaining
- [ ] Run full E2E test suite to verify all tests pass
- [ ] Run API Cucumber tests to verify cleanup works

---

## Success Criteria

- [x] Infrastructure for test isolation created
- [x] Cucumber tests automatically clean up after each scenario
- [x] Each Playwright test can run independently in any order
- [x] No test depends on data created by another test
- [x] CI pipelines use minimal seed (users only)
- [ ] All existing tests pass after refactoring (needs verification)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Tests slower with per-test setup | Use batch operations, cache auth tokens |
| Cleanup failures leave orphan data | Add emulator reset in CI as safety net |
| Breaking tests during refactor | Refactor one file at a time, run suite after each |
| API endpoints may not exist for all data types | Create missing endpoints or use direct Firestore for edge cases |
