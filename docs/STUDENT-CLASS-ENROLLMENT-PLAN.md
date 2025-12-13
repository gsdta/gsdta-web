# Student-Class Enrollment Implementation Plan

**Date**: December 13, 2025
**Feature**: Student-Class Enrollment
**Priority**: HIGH
**Approach**: Balance admin and parent features

---

## Overview

Enable admins to assign students to classes, view class rosters, and allow parents to see their children's class assignments. This is a natural progression since grades and classes are already implemented.

---

## Current Architecture

### Existing Class-Student Relationship
- Students have `classId` and `className` fields (denormalized)
- Classes track `enrolled` count (denormalized, incremented/decremented)
- **No studentIds array in classes** - uses reverse querying by classId
- Existing API: `PATCH /api/v1/admin/students/{id}/assign-class` (single student)

### Student Status Workflow
```
pending → admitted → active → inactive/withdrawn
```

### Relevant Types

**Student** (`api/src/types/student.ts`):
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  parentId: string;
  grade: string;
  classId?: string;      // Class assignment
  className?: string;    // Denormalized class name
  status: 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn';
  // ... other fields
}
```

**Class** (`api/src/types/class.ts`):
```typescript
{
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;      // Denormalized count
  teachers: ClassTeacher[];
  status: 'active' | 'inactive';
  // ... other fields
}
```

---

## Implementation Plan

### Phase 1: Admin - Class Roster View

**Goal**: View all students assigned to a class

**API Endpoint**:
```
GET /api/v1/admin/classes/{id}/students
```

Response:
```json
{
  "success": true,
  "data": {
    "class": { "id": "...", "name": "...", "capacity": 25, "enrolled": 18 },
    "students": [
      { "id": "...", "firstName": "...", "lastName": "...", "status": "active" }
    ]
  }
}
```

**UI Changes**:
- Add "View Roster" button on class edit page (`/admin/classes/[id]/edit`)
- New roster page: `/admin/classes/[id]/roster`
- Display student list with name, grade, status
- Show capacity vs enrolled count
- Link to student detail pages

**Files to Create/Modify**:
```
NEW:  api/src/app/v1/admin/classes/[id]/students/route.ts
NEW:  ui/src/app/admin/classes/[id]/roster/page.tsx
EDIT: ui/src/app/admin/classes/[id]/edit/page.tsx (add roster link)
EDIT: ui/src/lib/class-api.ts (add getClassStudents function)
```

---

### Phase 2: Admin - Bulk Student Assignment

**Goal**: Assign multiple students to a class at once

**API Endpoints**:
```
POST /api/v1/admin/classes/{id}/students
Body: { studentIds: ["id1", "id2", "id3"] }

DELETE /api/v1/admin/classes/{id}/students/{studentId}
```

**Business Logic**:
1. For each student in bulk assign:
   - Update student's `classId` and `className`
   - Change student status from `admitted` to `active`
   - Increment class's `enrolled` count
2. Validate:
   - Student must be in `admitted` status (or `active` for reassignment)
   - Student's grade must match class's grade
   - Class capacity not exceeded

**UI Changes**:
- Add "Assign Students" button on roster page
- Modal to select unassigned/admitted students
- Filter by grade (auto-filter to class's grade)
- Checkbox selection for bulk assignment
- Show selected count and capacity remaining
- Confirm action with summary

**Files to Create/Modify**:
```
EDIT: api/src/app/v1/admin/classes/[id]/students/route.ts (add POST handler)
NEW:  api/src/app/v1/admin/classes/[id]/students/[studentId]/route.ts (DELETE)
EDIT: api/src/lib/firestoreStudents.ts (add bulkAssignClass function)
EDIT: ui/src/app/admin/classes/[id]/roster/page.tsx (add assign UI)
NEW:  ui/src/components/StudentSelector.tsx (reusable selector modal)
```

---

### Phase 3: Parent - View Class Assignment

**Goal**: Parents see their children's class details

**API Changes**:
Extend `GET /api/v1/me/students` response to include full class details when assigned:

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "...",
        "firstName": "...",
        "classId": "class-123",
        "className": "Tamil Grade 3A",
        "classDetails": {
          "day": "Saturday",
          "time": "10:00 AM - 12:00 PM",
          "teacherName": "Mrs. Lakshmi"
        }
      }
    ]
  }
}
```

**UI Changes**:
- Enhance student card on parent portal
- Show class details section when assigned:
  - Class name
  - Day and time
  - Teacher name
- "Not assigned yet" message for students without class

**Files to Modify**:
```
EDIT: api/src/app/v1/me/students/route.ts (fetch class details)
EDIT: api/src/lib/firestoreStudents.ts (add getStudentsWithClassDetails)
EDIT: ui/src/app/parent/students/page.tsx (enhance display)
EDIT: ui/src/lib/student-types.ts (add classDetails type)
```

---

### Phase 4: Admin - Unassigned Students View

**Goal**: Quickly see students without class assignments

**API Changes**:
Add `unassigned=true` filter to `GET /api/v1/admin/students`:
```
GET /api/v1/admin/students?unassigned=true&status=admitted
```

Query: `where classId == null or classId == ''`

**UI Changes**:
- Add "Unassigned" filter option on admin students page
- Show count of unassigned students in status summary
- "Quick Assign" action button per student row
- Quick assign opens class selector modal

**Files to Modify**:
```
EDIT: api/src/app/v1/admin/students/route.ts (add unassigned filter)
EDIT: api/src/lib/firestoreStudents.ts (add unassigned query support)
EDIT: ui/src/app/admin/students/page.tsx (add filter tab, quick assign)
```

---

## Firestore Queries

### Get Students by Class
```typescript
// In firestoreStudents.ts
export async function getStudentsByClassId(classId: string): Promise<Student[]> {
  const snapshot = await db.collection('students')
    .where('classId', '==', classId)
    .where('status', 'in', ['active', 'admitted'])
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
}
```

### Get Unassigned Students
```typescript
export async function getUnassignedStudents(grade?: string): Promise<Student[]> {
  let query = db.collection('students')
    .where('status', '==', 'admitted')
    .where('classId', '==', null);

  if (grade) {
    query = query.where('grade', '==', grade);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
}
```

### Bulk Assign Students
```typescript
export async function bulkAssignStudentsToClass(
  classId: string,
  className: string,
  studentIds: string[]
): Promise<void> {
  const batch = db.batch();

  for (const studentId of studentIds) {
    const studentRef = db.collection('students').doc(studentId);
    batch.update(studentRef, {
      classId,
      className,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  // Update class enrolled count
  const classRef = db.collection('classes').doc(classId);
  batch.update(classRef, {
    enrolled: FieldValue.increment(studentIds.length),
    updatedAt: FieldValue.serverTimestamp()
  });

  await batch.commit();
}
```

---

## Testing Plan

### API Tests (Cucumber)

**Feature: Class Roster Management**
```gherkin
Scenario: Admin gets class roster
  Given I am logged in as an admin
  And there is a class "Tamil Grade 3A" with 5 students
  When I GET /api/v1/admin/classes/{classId}/students
  Then the response status is 200
  And the response contains 5 students

Scenario: Admin bulk assigns students to class
  Given I am logged in as an admin
  And there are 3 admitted students without class
  And there is a class "Tamil Grade 3A" with capacity 25
  When I POST /api/v1/admin/classes/{classId}/students with studentIds
  Then the response status is 200
  And the class enrolled count is increased by 3
  And the students status is changed to "active"

Scenario: Admin removes student from class
  Given I am logged in as an admin
  And student "John" is enrolled in class "Tamil Grade 3A"
  When I DELETE /api/v1/admin/classes/{classId}/students/{studentId}
  Then the response status is 200
  And the student classId is null
  And the class enrolled count is decreased by 1
```

### E2E Tests (Playwright)

```typescript
test.describe('Class Roster Management', () => {
  test('Admin can view class roster', async ({ page }) => {
    // Login as admin
    // Navigate to class edit page
    // Click "View Roster" button
    // Verify student list is displayed
  });

  test('Admin can assign students to class', async ({ page }) => {
    // Login as admin
    // Navigate to class roster page
    // Click "Assign Students"
    // Select students from modal
    // Confirm assignment
    // Verify students appear in roster
  });

  test('Parent sees class info for enrolled child', async ({ page }) => {
    // Login as parent
    // Navigate to students page
    // Verify class details shown (name, day, time, teacher)
  });
});
```

---

## Files Summary

### New Files
```
api/src/app/v1/admin/classes/[id]/students/route.ts
api/src/app/v1/admin/classes/[id]/students/[studentId]/route.ts
ui/src/app/admin/classes/[id]/roster/page.tsx
ui/src/components/StudentSelector.tsx
```

### Files to Modify
```
api/src/lib/firestoreStudents.ts
api/src/lib/firestoreClasses.ts
api/src/app/v1/admin/students/route.ts
api/src/app/v1/me/students/route.ts
ui/src/app/admin/classes/[id]/edit/page.tsx
ui/src/app/admin/students/page.tsx
ui/src/app/parent/students/page.tsx
ui/src/lib/class-api.ts
ui/src/lib/student-api.ts
ui/src/lib/student-types.ts
```

---

## Success Criteria

- [ ] Admin can view roster of students in any class
- [ ] Admin can bulk assign students to a class
- [ ] Admin can remove a student from a class
- [ ] Admin can filter unassigned students
- [ ] Parent can see their child's class details (name, day, time, teacher)
- [ ] All operations maintain data integrity (enrolled count synced)
- [ ] Grade matching is enforced (student grade = class grade)
- [ ] Capacity limits are enforced
- [ ] Tests pass for all new functionality
- [ ] Documentation updated (FEATURES.md, ROLES.md)

---

## Notes

- Follow existing patterns from teacher assignment implementation
- Use Firestore batch writes for bulk operations
- Maintain denormalized data consistency
- Mobile-responsive UI required
- Update FEATURES.md when complete
