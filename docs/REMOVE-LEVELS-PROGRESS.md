# Remove Levels Migration Progress

This document tracks the progress of removing all "level" references from the codebase since grades have replaced them.

## Summary
The class organization system was previously based on "levels" (Beginner/Intermediate/Advanced), which has been replaced with "grades" (e.g., PS-1, Grade-5). This migration removes all level references.

**Note**: The student field `priorTamilLevel` refers to the student's prior Tamil proficiency/experience, which is conceptually different from class levels. This field has been kept but relabeled to "Prior Tamil Experience" for clarity.

## Completed Tasks

### 1. API Types (`api/src/types/class.ts`)
- [x] Removed `TamilLevel` type definition
- [x] Removed `level?: TamilLevel` field from `Class` interface

### 2. API Routes
- [x] `api/src/app/v1/admin/classes/route.ts`
  - Removed `c.level` fallback in gradeName
  - Removed `level: c.level` from response
- [x] `api/src/app/v1/admin/classes/[id]/route.ts`
  - Removed `classData.level` fallback in GET response
  - Removed `level: classData.level` from GET response
  - Removed `classData.level` fallback in PATCH response
  - Removed `level: classData.level` from PATCH response

### 3. API Firestore Layer (`api/src/lib/firestoreClasses.ts`)
- [x] Removed `data.level` fallback in `getActiveClassOptions()`

### 4. UI Type Definitions
- [x] `ui/src/lib/enrollment-types.ts`
  - Changed `level: string` to `gradeName: string` in `Class` interface
- [x] `ui/src/lib/class-api.ts`
  - Removed `level?: string` from `ClassOption` interface

### 5. UI Components
- [x] `ui/src/components/EnrollmentForm.tsx`
  - Changed `selectedClass.level` to `selectedClass.gradeName`
  - Changed label from "Level:" to "Grade:"
- [x] `ui/src/components/StudentForm.tsx`
  - Changed label from "Prior level" to "Prior Tamil Experience"
  - Updated dropdown options to use lowercase values (none, beginner, intermediate, advanced) with descriptive labels
- [x] `ui/src/components/StudentsList.tsx`
  - Updated i18n key from `students.priorLevel` to `students.priorExperience`

### 6. UI Pages
- [x] `ui/src/app/admin/classes/page.tsx`
  - Changed `cls.gradeName || cls.level || 'N/A'` to `cls.gradeName || 'N/A'`
- [x] `ui/src/app/admin/students/[id]/page.tsx`
  - Changed label from "Prior Tamil Level" to "Prior Tamil Experience"
  - Changed `selected.level` to `selected.gradeName` in class assignment modal

### 7. i18n Messages (`ui/src/i18n/messages.ts`)
- [x] English:
  - Changed `home.carousel.programs.description` from "levels" to "grades"
  - Changed `classes.level` key to `classes.grade`
  - Changed `students.priorLevel` to `students.priorExperience`
- [x] Tamil:
  - Updated `home.carousel.programs.description`
  - Changed `classes.level` to `classes.grade`
  - Changed `students.priorLevel` to `students.priorExperience`

### 8. Student Types (`ui/src/lib/student-types.ts`)
- [x] Renamed `tamilLevelOptions` to `tamilProficiencyOptions`
- [x] Updated label from "Select level (optional)" to "Select experience (optional)"
- [x] Added backward compatibility alias for `tamilLevelOptions`

### 9. Unit Tests
- [x] `ui/src/app/admin/classes/__tests__/page.test.tsx`
  - Changed mock class `level` to `gradeName`
  - Updated test name from "level" to "grade"
- [x] `ui/src/app/admin/students/[id]/__tests__/page.test.tsx`
  - Changed mock class `level` to `gradeName`
- [x] `ui/src/lib/__tests__/class-api.test.ts`
  - Changed `level` to `gradeId` in mock class data
- [x] `ui/src/app/admin/teachers/assign/__tests__/page.test.tsx`
  - Removed `level` field from mock classes

### 10. E2E Tests
- [x] `api/tests/e2e/steps/student.steps.ts`
  - Changed `level: 'Beginner'` to `gradeId` and `gradeName`

### 11. Seed Script (`scripts/seed-emulator.js`)
- [x] Removed all `level` fields from SAMPLE_CLASSES

## All Tests Passed

- API tests: 56/56 passed
- UI tests: 212 passed, 8 skipped
- E2E tests: 79/79 passed

## Files Modified (Complete List)

### API
- `api/src/types/class.ts`
- `api/src/app/v1/admin/classes/route.ts`
- `api/src/app/v1/admin/classes/[id]/route.ts`
- `api/src/lib/firestoreClasses.ts`
- `api/tests/e2e/steps/student.steps.ts`

### UI
- `ui/src/lib/enrollment-types.ts`
- `ui/src/lib/class-api.ts`
- `ui/src/lib/student-types.ts`
- `ui/src/lib/__tests__/class-api.test.ts`
- `ui/src/components/EnrollmentForm.tsx`
- `ui/src/components/StudentForm.tsx`
- `ui/src/components/StudentsList.tsx`
- `ui/src/app/admin/classes/page.tsx`
- `ui/src/app/admin/classes/__tests__/page.test.tsx`
- `ui/src/app/admin/students/[id]/page.tsx`
- `ui/src/app/admin/students/[id]/__tests__/page.test.tsx`
- `ui/src/app/admin/teachers/assign/page.tsx`
- `ui/src/app/admin/teachers/assign/__tests__/page.test.tsx`
- `ui/src/app/classes/page.tsx`
- `ui/src/app/classes/[id]/page.tsx`
- `ui/src/i18n/messages.ts`

### Scripts
- `scripts/seed-emulator.js`

## Notes

1. The `priorTamilLevel` database field in student records has NOT been renamed (to avoid migration complexity). Only UI labels have been updated.

2. The key change is from class organization by "level" (Beginner/Intermediate/Advanced) to "grade" (PS-1, Grade-5, etc.)

3. The backward compatibility alias `tamilLevelOptions` has been kept to avoid breaking any code that might still import it.

4. Run build to catch any TypeScript errors after making changes:
   ```bash
   cd api && npm run build
   cd ui && npm run build
   ```
