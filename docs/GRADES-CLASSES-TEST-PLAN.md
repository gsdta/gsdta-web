# Grades and Classes Test Plan

**Created**: December 12, 2025
**Status**: Planned

## Goal
Verify the "Grades and Classes" implementation which includes:
- Managing Grades (11 predefined grades)
- Managing Classes (linked to Grades, multiple teachers)

## 1. API Tests (`api/`)

### 1.1 Unit Tests (`api/src/lib/__tests__/`)
*   **Target**: `api/src/lib/firestoreGrades.ts` and `api/src/lib/firestoreClasses.ts`
*   **Test Files**:
    *   `api/src/lib/__tests__/firestoreGrades.test.ts`
    *   `api/src/lib/__tests__/firestoreClasses.test.ts` (Update or Create)
*   **Scenarios**:
    *   **Grades**:
        *   `listGrades`: Returns all grades sorted by `displayOrder`.
        *   `getGrade`: Returns correct grade by ID.
        *   `createGrade`: Creates grade with correct fields.
        *   `updateGrade`: Updates grade fields.
        *   `seedGrades`: Ensures default grades exist.
    *   **Classes**:
        *   `createClass`: Ensures `gradeId` is saved and `teachers` array is initialized.
        *   `assignTeacherToClass`: Adds teacher correctly (primary/assistant).
        *   `removeTeacherFromClass`: Removes teacher.
        *   `updateTeacherRole`: Changes role.

### 1.2 Cucumber E2E Tests (`api/tests/e2e/`)
*   **Feature File**: `api/tests/e2e/features/admin-grades-classes.feature`
*   **Step Definition**: `api/tests/e2e/steps/admin-grades-classes.steps.ts`
*   **Scenarios**:
    *   Admin lists all grades.
    *   Admin updates a grade (e.g., status).
    *   Admin creates a class linked to a grade.
    *   Admin assigns a primary teacher to a class.
    *   Admin assigns an assistant teacher to a class.

## 2. UI Tests (`ui/`)

### 2.1 Unit Tests (`ui/src/__tests__/`)
*   **Target**: Components in `ui/src/app/admin/grades` and `ui/src/app/admin/classes`.
*   **Test Files**:
    *   `ui/src/__tests__/admin-grades-page.test.tsx`
    *   `ui/src/__tests__/ClassTeacherManager.test.tsx` (New component)
*   **Scenarios**:
    *   **Grades Page**: Renders list of grades, edit button works.
    *   **Teacher Manager**: Renders assigned teachers, allows adding new teacher, allows changing role.

### 2.2 Playwright E2E Tests (`ui/tests/e2e/`)
*   **Target**: Admin Pages.
*   **Test Files**:
    *   `ui/tests/e2e/admin/grades.spec.ts` (New)
    *   `ui/tests/e2e/admin/classes.spec.ts` (Update)
*   **Scenarios**:
    *   **Grades**:
        *   Navigate to Admin -> Grades.
        *   Verify list of grades matches expected default.
        *   Edit a grade (change display name) and verify persistence.
    *   **Classes**:
        *   Create a new class, select "Grade 1" from dropdown.
        *   Verify class appears in list with "Grade 1".
        *   Edit class, add a teacher.
        *   Verify teacher appears in list.

## Execution Order
1.  API Unit Tests
2.  API Cucumber Tests
3.  UI Unit Tests
4.  UI Playwright Tests
