# Teacher Portal Implementation Plan

## Overview

Implement comprehensive Teacher Portal features for the GSDTA Tamil School Management System including Dashboard, Class Rosters, and Attendance Tracking.

---

## Phase 1: Backend Foundation

### 1.1 Create Attendance Types
**File:** `api/src/types/attendance.ts`

```typescript
interface AttendanceRecord {
  id: string;
  classId: string;
  className: string;
  date: string;                    // YYYY-MM-DD
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  arrivalTime?: string;            // For late arrivals
  notes?: string;
  recordedBy: string;              // Teacher UID
  recordedByName: string;
  recordedAt: Timestamp;
  lastEditedBy?: string;
  lastEditedAt?: Timestamp;
  status_doc: 'active' | 'deleted';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 1.2 Create Firestore Module
**File:** `api/src/lib/firestoreAttendance.ts`
- `createAttendanceRecords()` - Bulk create attendance
- `getAttendanceByClass()` - Get attendance for a class with date filters
- `updateAttendanceRecord()` - Update single record with edit history
- `getAttendanceSummary()` - Get summary stats

### 1.3 Create Teacher Guard Helper
**File:** `api/src/lib/teacherGuard.ts`
- `verifyTeacherAssignment(teacherUid, classId)` - Check if teacher is assigned to class
- Reuse across all teacher endpoints

### 1.4 Update Firestore Configuration
**Files to modify:**
- `persistence/firestore.indexes.json` - Add attendance indexes
- `persistence/firestore.rules` - Add attendance collection rules

---

## Phase 2: Teacher API Endpoints

### 2.1 Dashboard Endpoint
**File:** `api/src/app/v1/teacher/dashboard/route.ts`
- `GET /api/v1/teacher/dashboard`
- Returns: classes overview, stats, today's schedule, recent attendance

### 2.2 Classes Endpoints
**Files:**
- `api/src/app/v1/teacher/classes/route.ts`
  - `GET /api/v1/teacher/classes` - List assigned classes
- `api/src/app/v1/teacher/classes/[classId]/route.ts`
  - `GET /api/v1/teacher/classes/:classId` - Class details

### 2.3 Roster Endpoint
**File:** `api/src/app/v1/teacher/classes/[classId]/roster/route.ts`
- `GET /api/v1/teacher/classes/:classId/roster` - Students in class

### 2.4 Attendance Endpoints
**Files:**
- `api/src/app/v1/teacher/classes/[classId]/attendance/route.ts`
  - `POST` - Mark attendance (bulk create)
  - `GET` - Attendance history with date range
- `api/src/app/v1/teacher/classes/[classId]/attendance/[recordId]/route.ts`
  - `PUT` - Edit single attendance record

---

## Phase 3: Teacher Portal UI

### 3.1 Route Structure
```
/teacher
├── /                     - Dashboard
├── /classes              - List of assigned classes
│   └── /[classId]        - Class details
│       ├── /roster       - Student roster
│       └── /attendance   - Attendance history
│           └── /mark     - Mark attendance
```

### 3.2 Layout
**Files:**
- `ui/src/app/teacher/layout.tsx` - Modify existing
- `ui/src/app/teacher/TeacherLayoutClient.tsx` - New (based on AdminLayoutClient)

Navigation sections:
- Dashboard (Overview)
- Classes (My Classes)
- Attendance (Mark Today, History)

### 3.3 Pages to Create

| File | Purpose |
|------|---------|
| `ui/src/app/teacher/page.tsx` | Dashboard with stats, schedule, quick actions |
| `ui/src/app/teacher/classes/page.tsx` | Grid of assigned classes |
| `ui/src/app/teacher/classes/[classId]/page.tsx` | Class overview |
| `ui/src/app/teacher/classes/[classId]/roster/page.tsx` | Student list |
| `ui/src/app/teacher/classes/[classId]/attendance/page.tsx` | Attendance history |
| `ui/src/app/teacher/classes/[classId]/attendance/mark/page.tsx` | Mark attendance form |

### 3.4 Components to Create

| File | Purpose |
|------|---------|
| `ui/src/components/attendance/AttendanceForm.tsx` | Status toggles for students |
| `ui/src/components/attendance/AttendanceHistory.tsx` | History display with edit |
| `ui/src/components/attendance/AttendanceSummaryCard.tsx` | Stats card |

---

## Phase 4: Testing

### 4.1 Unit Tests (Jest)
**Files to create:**
- `api/src/lib/__tests__/firestoreAttendance.test.ts`
- `api/src/lib/__tests__/teacherGuard.test.ts`
- `ui/src/app/teacher/__tests__/page.test.tsx`
- `ui/src/app/teacher/classes/__tests__/page.test.tsx`
- `ui/src/app/teacher/classes/[classId]/__tests__/page.test.tsx`
- `ui/src/app/teacher/classes/[classId]/roster/__tests__/page.test.tsx`
- `ui/src/app/teacher/classes/[classId]/attendance/__tests__/page.test.tsx`
- `ui/src/app/teacher/classes/[classId]/attendance/mark/__tests__/page.test.tsx`
- `ui/src/components/attendance/__tests__/AttendanceForm.test.tsx`

**Run with:** `cd api && npm test` / `cd ui && npm test`

### 4.2 API Cucumber Tests (BDD)
**Feature files to create:**
- `api/tests/e2e/features/teacher-dashboard.feature`
- `api/tests/e2e/features/teacher-classes.feature`
- `api/tests/e2e/features/teacher-roster.feature`
- `api/tests/e2e/features/teacher-attendance.feature`

**Step definitions:**
- `api/tests/e2e/steps/teacher-dashboard.steps.ts`
- `api/tests/e2e/steps/teacher-classes.steps.ts`
- `api/tests/e2e/steps/teacher-roster.steps.ts`
- `api/tests/e2e/steps/teacher-attendance.steps.ts`

**Test scenarios:**
```gherkin
# teacher-dashboard.feature
Feature: Teacher Dashboard
  Scenario: Teacher views dashboard with assigned classes
  Scenario: Teacher sees today's schedule
  Scenario: Unauthorized user cannot access dashboard

# teacher-classes.feature
Feature: Teacher Classes
  Scenario: Teacher lists assigned classes
  Scenario: Teacher views class they are assigned to
  Scenario: Teacher cannot view class they are not assigned to

# teacher-roster.feature
Feature: Class Roster
  Scenario: Teacher views roster for assigned class
  Scenario: Teacher searches students in roster
  Scenario: Teacher cannot view roster for unassigned class

# teacher-attendance.feature
Feature: Attendance Tracking
  Scenario: Teacher marks attendance for class
  Scenario: Teacher views attendance history
  Scenario: Teacher edits attendance within 7 days
  Scenario: Teacher cannot edit attendance older than 7 days
  Scenario: Teacher cannot mark attendance for unassigned class
```

**Run with:** `./run-cucumber-tests.sh` or `cd api && npm run test:cucumber`

### 4.3 E2E Tests (Playwright)
**Test files to create:**
- `ui/tests/e2e/teacher-dashboard.spec.ts`
- `ui/tests/e2e/teacher-classes.spec.ts`
- `ui/tests/e2e/teacher-roster.spec.ts`
- `ui/tests/e2e/teacher-attendance.spec.ts`

**Test scenarios:**
```typescript
// teacher-dashboard.spec.ts
- Teacher can log in and see dashboard
- Dashboard shows assigned classes
- Dashboard shows today's schedule
- Quick action buttons work

// teacher-classes.spec.ts
- Teacher sees list of assigned classes
- Teacher can click to view class details
- Class details show correct information

// teacher-roster.spec.ts
- Teacher can view student roster
- Search functionality works
- Student cards display correctly on mobile

// teacher-attendance.spec.ts
- Teacher can mark attendance for today
- Status toggles work correctly
- Submit saves attendance
- History page shows past attendance
- Edit functionality works within time window
```

**Run with:** `./run-e2e-tests.sh` or `cd ui && npm run test:e2e`

### 4.4 Test Scripts (CI-compatible)
**Use existing scripts:**
- `./run-all-tests.sh` - Runs all tests (unit + cucumber + e2e)
- `./run-cucumber-tests.sh` - Runs API cucumber tests
- `./run-e2e-tests.sh` - Runs UI e2e tests

**Test data seeding:**
- Update `scripts/seed-emulator.js` to include:
  - Test teacher users with class assignments
  - Test classes with students
  - Sample attendance records

---

## Implementation Order (Feature by Feature with Tests)

### Step 1: Backend Foundation + Unit Tests
- Create `api/src/types/attendance.ts`
- Create `api/src/lib/firestoreAttendance.ts`
- Create `api/src/lib/teacherGuard.ts`
- Create `api/src/lib/__tests__/firestoreAttendance.test.ts`
- Create `api/src/lib/__tests__/teacherGuard.test.ts`
- Update `persistence/firestore.indexes.json`
- Update `persistence/firestore.rules`
- Update `scripts/seed-emulator.js` with teacher test data
- **Run:** `cd api && npm test`

### Step 2: Teacher Classes API + Cucumber Tests
- Create `api/src/app/v1/teacher/classes/route.ts`
- Create `api/src/app/v1/teacher/classes/[classId]/route.ts`
- Create `api/tests/e2e/features/teacher-classes.feature`
- Create `api/tests/e2e/steps/teacher-classes.steps.ts`
- **Run:** `./run-cucumber-tests.sh`

### Step 3: Teacher Roster API + Cucumber Tests
- Create `api/src/app/v1/teacher/classes/[classId]/roster/route.ts`
- Create `api/tests/e2e/features/teacher-roster.feature`
- Create `api/tests/e2e/steps/teacher-roster.steps.ts`
- **Run:** `./run-cucumber-tests.sh`

### Step 4: Teacher Dashboard API + Cucumber Tests
- Create `api/src/app/v1/teacher/dashboard/route.ts`
- Create `api/tests/e2e/features/teacher-dashboard.feature`
- Create `api/tests/e2e/steps/teacher-dashboard.steps.ts`
- **Run:** `./run-cucumber-tests.sh`

### Step 5: Attendance API + Cucumber Tests
- Create `api/src/app/v1/teacher/classes/[classId]/attendance/route.ts`
- Create `api/src/app/v1/teacher/classes/[classId]/attendance/[recordId]/route.ts`
- Create `api/tests/e2e/features/teacher-attendance.feature`
- Create `api/tests/e2e/steps/teacher-attendance.steps.ts`
- **Run:** `./run-cucumber-tests.sh`

### Step 6: UI Layout + Unit Tests
- Update `ui/src/app/teacher/layout.tsx`
- Create `ui/src/app/teacher/TeacherLayoutClient.tsx`
- Create `ui/src/app/teacher/__tests__/layout.test.tsx`
- **Run:** `cd ui && npm test`

### Step 7: Dashboard UI + Unit & E2E Tests
- Update `ui/src/app/teacher/page.tsx` (replace stub)
- Create `ui/src/app/teacher/__tests__/page.test.tsx`
- Create `ui/tests/e2e/teacher-dashboard.spec.ts`
- **Run:** `cd ui && npm test` then `./run-e2e-tests.sh`

### Step 8: Classes UI + Unit & E2E Tests
- Create `ui/src/app/teacher/classes/page.tsx`
- Create `ui/src/app/teacher/classes/[classId]/page.tsx`
- Create `ui/src/app/teacher/classes/__tests__/page.test.tsx`
- Create `ui/src/app/teacher/classes/[classId]/__tests__/page.test.tsx`
- Create `ui/tests/e2e/teacher-classes.spec.ts`
- **Run:** `cd ui && npm test` then `./run-e2e-tests.sh`

### Step 9: Roster UI + Unit & E2E Tests
- Create `ui/src/app/teacher/classes/[classId]/roster/page.tsx`
- Create `ui/src/app/teacher/classes/[classId]/roster/__tests__/page.test.tsx`
- Create `ui/tests/e2e/teacher-roster.spec.ts`
- **Run:** `cd ui && npm test` then `./run-e2e-tests.sh`

### Step 10: Attendance UI + Unit & E2E Tests
- Create `ui/src/components/attendance/AttendanceForm.tsx`
- Create `ui/src/components/attendance/AttendanceHistory.tsx`
- Create `ui/src/components/attendance/AttendanceSummaryCard.tsx`
- Create `ui/src/app/teacher/classes/[classId]/attendance/page.tsx`
- Create `ui/src/app/teacher/classes/[classId]/attendance/mark/page.tsx`
- Create `ui/src/components/attendance/__tests__/AttendanceForm.test.tsx`
- Create `ui/src/app/teacher/classes/[classId]/attendance/__tests__/page.test.tsx`
- Create `ui/src/app/teacher/classes/[classId]/attendance/mark/__tests__/page.test.tsx`
- Create `ui/tests/e2e/teacher-attendance.spec.ts`
- **Run:** `cd ui && npm test` then `./run-e2e-tests.sh`

### Step 11: Final Validation
- **Run:** `./run-all-tests.sh` (all unit + cucumber + e2e)
- Mobile responsiveness testing
- Build verification: `npm run build`

---

## Security Requirements

1. **Authorization**: Every endpoint verifies teacher is assigned to the class
2. **Data Scope**: Teachers only see students in their assigned classes
3. **Edit Window**: Attendance edits allowed within 7 days
4. **Soft Deletes**: Never hard delete attendance records
5. **Audit Trail**: Track all edits with history

---

## Key Reference Files

| Purpose | File |
|---------|------|
| Auth guard pattern | `api/src/lib/guard.ts` |
| Class types | `api/src/types/class.ts` |
| Firestore operations pattern | `api/src/lib/firestoreClasses.ts` |
| Admin layout pattern | `ui/src/app/admin/AdminLayoutClient.tsx` |
| List page pattern | `ui/src/app/admin/users/teachers/list/page.tsx` |
