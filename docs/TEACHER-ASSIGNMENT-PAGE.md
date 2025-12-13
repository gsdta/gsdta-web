# Teacher Assignment Page - Implementation Plan

**Created**: December 13, 2025  
**Status**: Planning  
**Priority**: High

---

## Problem Statement

Currently, teacher assignment functionality exists only in the Edit Class page (`/admin/classes/[id]/edit`), which requires:
1. Navigating to each individual class
2. Multiple clicks to assign teachers to multiple classes
3. No overview of all class-teacher assignments

This is cumbersome when an admin needs to:
- Assign teachers to multiple classes at once
- Get an overview of which classes have teachers assigned
- Quickly reassign teachers across classes

---

## Solution: Dedicated Teacher Assignment Page

Create a new page at `/admin/teachers/assign` that displays:
- **All active classes** in a grid/table layout
- **Primary Teacher dropdown** per class
- **Assistant Teacher dropdown(s)** per class
- Real-time save/update (no submit button needed)
- Visual indicators for classes without teachers

---

## User Stories

### As an Admin:
1. I want to see all classes in one view so I can quickly understand the current state of teacher assignments
2. I want to assign primary teachers to classes using dropdowns so I can quickly make assignments
3. I want to assign assistant teachers to classes so I can have teaching support
4. I want to see which classes don't have teachers assigned so I can prioritize assignments
5. I want changes to save automatically so I don't have to navigate away or click submit
6. I want to filter by grade level so I can focus on specific grades
7. I want to see teacher workload (how many classes each teacher has) so I can distribute fairly

---

## UI Design

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Classes                                          │
│                                                              │
│  Teacher Assignments                                         │
│  Assign teachers to classes for the academic year           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Filters:                                            │   │
│  │  [All Grades ▼]  [Show: ● All ○ Unassigned Only]   │   │
│  │  [Academic Year: 2024-2025 ▼]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Teacher Workload Summary                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Sarah Johnson: 2 classes (1 primary, 1 assistant)    │  │
│  │ Test Teacher: 1 class (1 primary)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Classes (4 total, 3 assigned, 1 unassigned)                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PS-1 Section A - Saturday AM                  ⚠️     │   │
│  │ Grade: Pre-School 1 | Capacity: 2/15                │   │
│  │                                                      │   │
│  │ Primary Teacher:   [Test Teacher        ▼] ✓        │   │
│  │ Assistant Teacher: [+ Add Assistant     ▼]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Grade 3 Section A - Saturday PM              ✓      │   │
│  │ Grade: Grade 3 | Capacity: 1/20                     │   │
│  │                                                      │   │
│  │ Primary Teacher:   [Sarah Johnson      ▼] ✓         │   │
│  │ Assistant Teacher: [Test Teacher       ▼] ✓         │   │
│  │                    [+ Add Assistant]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ KG Section B - Sunday PM                     ⚠️      │   │
│  │ Grade: Kindergarten | Capacity: 0/18                │   │
│  │                                                      │   │
│  │ Primary Teacher:   [Select teacher...  ▼]            │   │
│  │ Assistant Teacher: [+ Add Assistant     ▼]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Visual Indicators
- **✓ Green checkmark**: Class has primary teacher assigned
- **⚠️ Warning icon**: Class has no primary teacher
- **Gray text**: Assistant teacher (optional)
- **Checkmark on dropdown**: Shows current assignment

### Interaction Flow
1. User selects a teacher from "Primary Teacher" dropdown
2. System immediately saves assignment via API
3. UI shows loading spinner briefly
4. Checkmark appears when saved successfully
5. If error occurs, show inline error message with retry option
6. User can add multiple assistant teachers using "+ Add Assistant" button

---

## Technical Implementation

### 1. API Endpoints (Already Exist - Need Verification)

#### GET /api/v1/admin/classes/[id]/teachers
- Returns list of teachers assigned to a class

#### POST /api/v1/admin/classes/[id]/teachers
```json
{
  "teacherId": "uid",
  "teacherName": "Full Name",
  "teacherEmail": "email@example.com",
  "role": "primary" | "assistant"
}
```

#### DELETE /api/v1/admin/classes/[id]/teachers/[teacherId]
- Removes teacher from class

#### PATCH /api/v1/admin/classes/[id]/teachers/[teacherId]
```json
{
  "role": "primary" | "assistant"
}
```

#### GET /api/v1/admin/teachers?status=active
- Returns all active teachers

### 2. New Files to Create

#### UI Component
- **File**: `ui/src/app/admin/teachers/assign/page.tsx`
- **Purpose**: Main teacher assignment page
- **Features**:
  - Fetch all active classes
  - Fetch all active teachers
  - Display class cards with teacher dropdowns
  - Auto-save on selection change
  - Filter by grade
  - Show teacher workload summary

### 3. Component Structure

```typescript
// ui/src/app/admin/teachers/assign/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { adminGetClasses, adminAssignTeacher, adminRemoveTeacher } from '@/lib/class-api';
import { apiFetch } from '@/lib/api-client';

interface TeacherWorkload {
  teacherId: string;
  name: string;
  primaryCount: number;
  assistantCount: number;
  totalCount: number;
}

export default function TeacherAssignmentPage() {
  // State management
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Fetch data
  // Handle teacher assignment
  // Calculate teacher workload
  // Render UI
}
```

### 4. Data Flow

```
1. Page Load
   ↓
2. Fetch all active classes (adminGetClasses)
   ↓
3. Fetch all active teachers (GET /api/v1/admin/teachers)
   ↓
4. Calculate teacher workload from classes.teachers[]
   ↓
5. Display classes with current assignments
   ↓
6. User selects teacher from dropdown
   ↓
7. Auto-save: POST /api/v1/admin/classes/[id]/teachers
   ↓
8. Update local state on success
   ↓
9. Show checkmark or error message
```

### 5. Business Logic

#### Teacher Assignment Rules
- Each class MUST have exactly ONE primary teacher
- Each class CAN have zero or more assistant teachers
- A teacher CAN be assigned to multiple classes
- A teacher CAN be primary in one class and assistant in another
- Changing primary teacher removes previous primary (handled by backend)
- Removing a teacher requires confirmation

#### Validation
- Cannot assign same teacher as both primary and assistant in same class
- Cannot have duplicate assistant teachers in same class
- Must select a teacher (not empty option)

#### Error Handling
- Show inline error below dropdown
- Retry button for failed saves
- Don't block other operations if one fails
- Log errors for debugging

---

## Implementation Phases

### Phase 1: Create API Endpoint (if needed)
**File**: `api/src/app/v1/admin/classes/[id]/teachers/route.ts`
- [ ] Verify endpoint exists
- [ ] Test POST, DELETE, PATCH operations
- [ ] Ensure proper validation and error handling

### Phase 2: Create UI Page
**File**: `ui/src/app/admin/teachers/assign/page.tsx`
- [ ] Create page component
- [ ] Fetch classes and teachers
- [ ] Display class cards
- [ ] Add primary teacher dropdowns
- [ ] Implement auto-save functionality
- [ ] Add loading states
- [ ] Add error handling

### Phase 3: Add Assistant Teacher Support
- [ ] Add "+ Add Assistant" button
- [ ] Allow multiple assistant teachers per class
- [ ] Remove assistant teacher functionality
- [ ] Show assistant teachers in card

### Phase 4: Add Filtering & Workload
- [ ] Add grade filter dropdown
- [ ] Add "Unassigned Only" toggle
- [ ] Calculate teacher workload
- [ ] Display workload summary section
- [ ] Add academic year filter (future)

### Phase 5: Polish & Testing
- [ ] Add visual indicators (checkmarks, warnings)
- [ ] Responsive design (mobile-friendly)
- [ ] Add confirmation dialogs
- [ ] Test edge cases
- [ ] Add keyboard navigation support

---

## Navigation Update

### Add to Admin Navigation
**File**: `ui/src/app/admin/AdminLayoutClient.tsx`

Add new menu item under "Teachers" section:
```typescript
{
  label: 'Teachers',
  items: [
    { label: 'All Teachers', href: '/admin/users/teachers/list', icon: '👩‍🏫' },
    { label: 'Invite Teacher', href: '/admin/teachers/invite', icon: '✉️' },
    { label: 'Assign to Classes', href: '/admin/teachers/assign', icon: '📋' }, // NEW
  ],
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Teacher workload calculation
- [ ] Filter logic (grade, unassigned)
- [ ] Validation rules

### Integration Tests
- [ ] Assign primary teacher to class
- [ ] Add assistant teacher to class
- [ ] Remove teacher from class
- [ ] Change primary teacher (old primary becomes unassigned)
- [ ] Assign same teacher to multiple classes
- [ ] Filter by grade
- [ ] Show unassigned classes only

### E2E Tests
- [ ] Admin can navigate to teacher assignment page
- [ ] Admin can see all classes
- [ ] Admin can assign teachers using dropdowns
- [ ] Changes save automatically
- [ ] Visual feedback shows save status
- [ ] Errors display inline with retry option

---

## Success Criteria

- ✅ Admin can assign primary teachers to all classes from one page
- ✅ Admin can add/remove assistant teachers
- ✅ Changes save automatically without submit button
- ✅ Visual feedback shows save status (loading/success/error)
- ✅ Page shows which classes need teacher assignments
- ✅ Teacher workload is displayed
- ✅ Page is responsive and works on mobile
- ✅ All edge cases handled gracefully

---

## Benefits

1. **Efficiency**: Assign teachers to all classes without navigating between pages
2. **Overview**: See all class-teacher assignments at a glance
3. **Workload Balance**: Ensure fair distribution of classes among teachers
4. **Quick Identification**: Easily spot classes without teachers
5. **Bulk Operations**: Handle all assignments in one workflow

---

## Future Enhancements (Out of Scope)

- [ ] Drag-and-drop teacher assignment
- [ ] Teacher availability calendar integration
- [ ] Conflict detection (same teacher, same time slot)
- [ ] Teacher preference/qualification matching
- [ ] Bulk assignment tools (assign one teacher to multiple classes)
- [ ] Import/export teacher assignments
- [ ] Teacher assignment history/audit log
- [ ] Email notifications when assigned to class

---

## Notes

- Keep the existing Edit Class page functionality intact
- This page is for bulk/overview operations
- Edit Class page is for detailed class management
- Both UIs use the same backend APIs
- Focus on common workflow: assigning all teachers at start of year
