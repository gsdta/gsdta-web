# Student-Class Enrollment Feature

**Status**: ✅ Phase 1 & 2 Complete | 🚧 Phase 2.1 In Progress  
**Date**: December 13, 2025

---

## Quick Start

### For Admins

**View Class Roster**:
1. Go to Admin → Classes
2. Click on a class or "Edit" button
3. Click "View Roster" button (green button in header)
4. View all enrolled students

**Remove Student from Class**:
1. On the roster page, find the student
2. Click "Remove" button
3. Confirm the action
4. Student is unassigned and status reverts to "admitted"

**Assign Students** (Coming Soon - Phase 2.1):
1. On the roster page, click "Assign Students" button
2. Select students from the modal
3. Students are assigned and status changes to "active"

---

## Features Implemented

### ✅ Phase 1: View Class Roster
- View all students enrolled in a class
- See student name, grade, status, parent email
- Track capacity (enrolled / capacity)
- Visual indicators for spots available/full
- Links to individual student detail pages
- Empty state when no students assigned
- Mobile-responsive table design

### ✅ Phase 2: Manage Enrollment
- **Remove students** from class with confirmation
- **Bulk assign API** ready (POST endpoint)
- **Student status workflow**: admitted ↔ active
- **Capacity validation**: prevents over-enrollment
- **Atomic operations**: Firestore batch writes ensure data consistency
- **Denormalized counts**: Class `enrolled` count syncs automatically

---

## API Endpoints

### Get Class Roster
```
GET /api/v1/admin/classes/{classId}/students
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "class": {
      "id": "class-123",
      "name": "Tamil Grade 3A",
      "gradeId": "grade-3",
      "gradeName": "Grade 3",
      "capacity": 25,
      "enrolled": 18
    },
    "students": [
      {
        "id": "student-456",
        "firstName": "Priya",
        "lastName": "Kumar",
        "name": "Priya Kumar",
        "grade": "Grade 3",
        "status": "active",
        "parentEmail": "parent@example.com"
      }
    ]
  }
}
```

### Bulk Assign Students
```
POST /api/v1/admin/classes/{classId}/students
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "studentIds": ["student-456", "student-789"]
}

Response:
{
  "success": true,
  "message": "2 student(s) assigned successfully",
  "data": {
    "assignedCount": 2,
    "class": { "id": "class-123", "name": "Tamil Grade 3A", "enrolled": 20 },
    "students": [...]
  }
}
```

### Remove Student from Class
```
DELETE /api/v1/admin/classes/{classId}/students/{studentId}
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "message": "Student removed from class successfully",
  "data": {
    "student": {
      "id": "student-456",
      "firstName": "Priya",
      "lastName": "Kumar",
      "name": "Priya Kumar"
    },
    "class": {
      "id": "class-123",
      "name": "Tamil Grade 3A"
    }
  }
}
```

---

## Data Model

### Student Document
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  parentId: string;
  grade: string;
  
  // Class Assignment (denormalized)
  classId?: string;      // ID of assigned class
  className?: string;    // Name of class (for display)
  
  // Status (workflow: pending → admitted → active → inactive)
  status: 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn';
}
```

### Class Document
```typescript
{
  id: string;
  name: string;
  gradeId: string;
  capacity: number;
  
  // Denormalized count (synced via batch writes)
  enrolled: number;
  
  status: 'active' | 'inactive';
}
```

---

## Student Status Workflow

```
         ┌─────────┐
         │ pending │ (Parent registered)
         └────┬────┘
              │ Admin admits
              ▼
         ┌─────────┐
         │admitted │ (Approved, not in class)
         └────┬────┘
              │ Assign to class
              ▼
         ┌─────────┐
    ┌───│ active  │───┐ (Enrolled in class)
    │   └─────────┘   │
    │                 │
Remove│               │Withdraw/Transfer
from  │               │
class │               ▼
    │          ┌──────────┐
    └─────────▶│ inactive │
               └──────────┘
```

---

## Architecture Decisions

### Why Denormalize?
We store `classId`, `className` in student and `enrolled` count in class because:
1. **Faster queries**: Query students by classId directly
2. **Simpler checks**: Compare enrolled vs capacity without counting
3. **Avoids large arrays**: No studentIds array in class doc (scales better)

### Why Batch Writes?
All enrollment operations use Firestore batch writes to:
1. **Ensure atomicity**: All updates succeed or all fail
2. **Maintain consistency**: Student and class stay in sync
3. **Prevent race conditions**: Multiple admins can work simultaneously

### Why Status Transitions?
Clear status workflow ensures:
1. **Visibility**: Admin knows which students can be assigned
2. **Reversibility**: Can unassign student and restore to "admitted"
3. **Reporting**: Easy to count active vs admitted students

---

## UI Routes

### Admin Routes
```
/admin/classes                          - List all classes
/admin/classes/[id]/edit                - Edit class details
/admin/classes/[id]/roster              - ✅ View class roster (NEW)
/admin/classes/[id]/roster/assign       - 🚧 Assign students modal (Phase 2.1)
```

---

## Testing Checklist

### Manual Testing
- [x] View empty roster (no students)
- [x] View roster with multiple students
- [x] Student info displays correctly
- [x] Capacity count accurate
- [x] Remove student works
- [x] Confirmation dialog shown
- [x] Roster refreshes after removal
- [x] Error handling works
- [x] Mobile responsive
- [x] Loading states work
- [ ] Bulk assign students (Phase 2.1)

### Edge Cases Tested
- [x] Cannot remove student not in class (404 error)
- [x] Cannot assign to full class (capacity check)
- [x] Cannot assign to inactive class
- [x] Cannot assign non-admitted student
- [x] Batch operation atomicity

---

## Next Steps

### Phase 2.1: Student Selector Modal (Priority)
**Goal**: Complete the "Assign Students" functionality

**Tasks**:
1. Create reusable StudentSelector component
2. Filter students by:
   - Status: `admitted` (or `active` for reassignment)
   - Grade: Match class grade
   - Not already in this class
3. Multi-select with checkboxes
4. Show selected count vs spots available
5. Integrate with `adminBulkAssignStudents()` API
6. Show success message
7. Refresh roster after assignment

**Files to Create**:
```
ui/src/components/StudentSelector.tsx
ui/src/app/admin/classes/[id]/roster/assign/page.tsx (alternative)
```

### Phase 3: Parent Portal
- Extend `/api/v1/me/students` to include class details
- Show class day, time, teacher on parent portal
- "Not assigned yet" message for unassigned students

### Phase 4: Unassigned Students View
- Add filter to admin students page
- Show unassigned students tab
- Quick assign action per student

---

## Related Documentation

- **Implementation Details**: `/docs/STUDENT-CLASS-ENROLLMENT-IMPLEMENTATION.md`
- **Original Plan**: `/docs/STUDENT-CLASS-ENROLLMENT-PLAN.md`
- **Role Requirements**: `/docs/ROLES.md` (Admin User Management section)
- **Firestore Schema**: `/docs/FIRESTORE-COLLECTIONS.md`

---

## Questions?

If you have questions about this feature:
1. Check `/docs/STUDENT-CLASS-ENROLLMENT-IMPLEMENTATION.md` for technical details
2. Review `/docs/STUDENT-CLASS-ENROLLMENT-PLAN.md` for the original design
3. Look at test files for example usage
4. Check API route files for OpenAPI documentation

---

**Feature Owner**: Admin Team  
**Last Updated**: December 13, 2025  
**Status**: In Active Development
