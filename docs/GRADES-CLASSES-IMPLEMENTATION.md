# Grades and Classes Management Implementation Plan

**Created**: December 12, 2025
**Updated**: December 24, 2025
**Status**: Partially Complete - See Caution Below

## ⚠️ CAUTION: firebase-admin Bundling Issues

> **WARNING**: On December 24, 2025, we had to revert the codebase to commit `28e3348` due to production failures. Some API routes added after this commit caused `firebase-admin` to not bundle correctly in Next.js standalone output.

**Before continuing this implementation:**
1. Test each new API route with a standalone build: `cd api && npm run build`
2. Deploy and verify each route individually before adding more
3. Avoid creating shared modules that import `firebase-admin`
4. Keep CORS handlers inline in each route file
5. See `docs/KNOWN-ISSUES.md` for detailed troubleshooting

The routes that currently exist from commit `28e3348` are working. Exercise caution when adding new routes like `teacher/classes/[id]/attendance/` or `admin/classes/[id]/students/[studentId]/`.

---

## Summary
Implement admin functionality for managing grades and classes with multiple teacher assignments.

## User Requirements
- 11 grades: ps-1, ps-2, kg, grade-1 through grade-8 (matching textbooks section)
- Each grade can have multiple classes
- Admin abilities:
  - Add/Edit grades (rarely changes)
  - Add/Edit/Delete classes (soft delete)
  - Assign multiple teachers to classes (primary + assistants)

## Decisions Made
- **Grade Storage**: Firestore Collection (not hardcoded)
- **Class Structure**: Replace `level` with `gradeId` - classes belong to grades
- **Teacher Assignment**: Multiple teachers per class with roles (primary/assistant)

---

## Implementation Progress

### Phase 1: Database Foundation - COMPLETE
- [x] Create grade types (`api/src/types/grade.ts`) - **DONE**
- [x] Update class types (`api/src/types/class.ts`) - **DONE**
  - Added `gradeId`, `gradeName`, `teachers[]`
  - Kept legacy fields (`level`, `teacherId`, `teacherName`) for backward compatibility

### Phase 2: API - Grades - COMPLETE
- [x] Create Firestore grades service (`api/src/lib/firestoreGrades.ts`) - **DONE**
- [x] Create grades API routes:
  - [x] `api/src/app/v1/admin/grades/route.ts` (GET list, POST create) - **DONE**
  - [x] `api/src/app/v1/admin/grades/[id]/route.ts` (GET, PATCH) - **DONE**
  - [x] `api/src/app/v1/admin/grades/seed/route.ts` (POST seed) - **DONE**

### Phase 3: API - Classes Updates - COMPLETE
- [x] Update Firestore classes service (`api/src/lib/firestoreClasses.ts`) - **DONE**
  - [x] Update `createClass` for `gradeId`
  - [x] Add `assignTeacherToClass()`, `removeTeacherFromClass()`, `updateTeacherRole()`
- [x] Update classes API routes for `gradeId` - **DONE**
- [x] Create teacher assignment API routes (`api/src/app/v1/admin/classes/[id]/teachers/route.ts`) - **DONE**

### Phase 4: UI - Grades Management - IN PROGRESS
- [ ] Create UI grade types (`ui/src/lib/grade-types.ts`)
- [ ] Create UI grade API functions (`ui/src/lib/grade-api.ts`)
- [ ] Create admin grades page (`ui/src/app/admin/grades/page.tsx`)
- [ ] Update admin navigation (`ui/src/app/admin/AdminLayoutClient.tsx`)

### Phase 5: UI - Classes Updates
- [ ] Update UI class types (`ui/src/lib/class-api.ts`)
- [ ] Update classes list page (`ui/src/app/admin/classes/page.tsx`)
- [ ] Update class create page (`ui/src/app/admin/classes/create/page.tsx`)
- [ ] Create class edit page (`ui/src/app/admin/classes/[id]/edit/page.tsx`)
- [ ] Create teacher assignment component (`ui/src/components/admin/ClassTeacherManager.tsx`)

### Phase 6: Bulk Teacher Assignment Page (NEW - Dec 2025)
- [ ] Create teacher assignment page (`ui/src/app/admin/teachers/assign/page.tsx`)
- [ ] Add navigation link in AdminLayoutClient
- [ ] Implement auto-save for teacher assignments
- [ ] Add teacher workload summary
- [ ] Add filtering (by grade, unassigned only)
- [ ] See detailed plan: `docs/TEACHER-ASSIGNMENT-PAGE.md`

---

## Files Created/Modified

### NEW FILES
| File | Status | Description |
|------|--------|-------------|
| `api/src/types/grade.ts` | DONE | Grade type definitions + DEFAULT_GRADES |
| `api/src/lib/firestoreGrades.ts` | DONE | Grade Firestore operations |
| `api/src/app/v1/admin/grades/route.ts` | TODO | Grades list/create API |
| `api/src/app/v1/admin/grades/[id]/route.ts` | TODO | Grade detail/update API |
| `api/src/app/v1/admin/grades/seed/route.ts` | TODO | Seed grades API |
| `api/src/app/v1/admin/classes/[id]/teachers/route.ts` | TODO | Teacher assignment API |
| `ui/src/lib/grade-types.ts` | TODO | UI grade types |
| `ui/src/lib/grade-api.ts` | TODO | UI grade API functions |
| `ui/src/app/admin/grades/page.tsx` | TODO | Admin grades page |
| `ui/src/app/admin/classes/[id]/edit/page.tsx` | TODO | Class edit page |
| `ui/src/components/admin/ClassTeacherManager.tsx` | TODO | Teacher assignment component |

### MODIFIED FILES
| File | Status | Changes |
|------|--------|---------|
| `api/src/types/class.ts` | DONE | Added gradeId, teachers[], kept legacy fields |
| `api/src/lib/firestoreClasses.ts` | TODO | Support gradeId, teacher management |
| `api/src/app/v1/admin/classes/route.ts` | TODO | Validate gradeId, grade filter |
| `api/src/app/v1/admin/classes/[id]/route.ts` | TODO | Include teachers in response |
| `ui/src/lib/class-api.ts` | TODO | Update types, add teacher functions |
| `ui/src/app/admin/classes/page.tsx` | TODO | Grade column, teacher display |
| `ui/src/app/admin/classes/create/page.tsx` | TODO | Grade dropdown instead of level |
| `ui/src/app/admin/AdminLayoutClient.tsx` | TODO | Add Grades nav link |

---

## Default Grades Data
These 11 grades match the textbooks.ts structure:

| id | name | displayName | displayOrder |
|----|------|-------------|--------------|
| ps-1 | PS-1 | Pre-School 1 | 1 |
| ps-2 | PS-2 | Pre-School 2 | 2 |
| kg | KG | Kindergarten | 3 |
| grade-1 | Grade-1 | Grade 1 | 4 |
| grade-2 | Grade-2 | Grade 2 | 5 |
| grade-3 | Grade-3 | Grade 3 | 6 |
| grade-4 | Grade-4 | Grade 4 | 7 |
| grade-5 | Grade-5 | Grade 5 | 8 |
| grade-6 | Grade-6 | Grade 6 | 9 |
| grade-7 | Grade-7 | Grade 7 | 10 |
| grade-8 | Grade-8 | Grade 8 | 11 |

---

## Type Definitions

### Grade (api/src/types/grade.ts)
```typescript
interface Grade {
  id: string;           // e.g., "ps-1", "grade-5"
  name: string;         // e.g., "PS-1", "Grade-5"
  displayName: string;  // e.g., "Pre-School 1", "Grade 5"
  displayOrder: number; // 1-11 for sorting
  status: 'active' | 'inactive';
  createdAt, updatedAt: Timestamp;
  createdBy?: string;
}
```

### ClassTeacher (api/src/types/class.ts)
```typescript
interface ClassTeacher {
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  role: 'primary' | 'assistant';
  assignedAt: Timestamp;
  assignedBy: string;
}
```

### Updated Class (api/src/types/class.ts)
```typescript
interface Class {
  id: string;
  name: string;
  gradeId: string;           // NEW: Reference to grades collection
  gradeName?: string;        // NEW: Denormalized grade name
  teachers: ClassTeacher[];  // NEW: Multiple teachers
  // Legacy fields kept for backward compatibility:
  level?: TamilLevel;        // DEPRECATED
  teacherId?: string;        // DEPRECATED
  teacherName?: string;      // DEPRECATED
  // ... other fields unchanged
}
```

---

## Migration Strategy
**Conservative Approach** (being used):
1. Keep legacy fields (`level`, `teacherId`, `teacherName`) during transition
2. New code reads `gradeId` first, falls back to `level` if missing
3. New code reads `teachers` array first, falls back to single `teacherId` if empty
4. Admin manually migrates existing classes via edit page
5. Remove legacy fields in future release after all classes migrated

---

## Current Task
**Currently working on**: Phase 2 - Creating grades API routes

Next steps:
1. Create `api/src/app/v1/admin/grades/route.ts`
2. Create `api/src/app/v1/admin/grades/[id]/route.ts`
3. Create `api/src/app/v1/admin/grades/seed/route.ts`
