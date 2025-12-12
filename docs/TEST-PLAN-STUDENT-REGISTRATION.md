# Test Plan: Student Self-Registration by Parents

## Overview

This document provides a comprehensive test plan for the student self-registration feature. The feature enables parents to register their children through the parent portal, with an admin review and approval workflow.

### Status Workflow
```
Parent registers → PENDING → Admin admits → ADMITTED → Admin assigns class → ACTIVE
```

### Feature Scope
- **Parent Actions**: Register student, view students, edit pending/admitted students
- **Admin Actions**: List students, filter by status, admit students, assign classes
- **Class Management**: List classes, create classes, update classes

---

## Part 1: API Layer Tests

### 1.1 Cucumber E2E Tests (BDD)

All feature files should be created in `/api/tests/e2e/features/`

---

#### Feature: Parent Student Registration (`parent-student-registration.feature`)

```gherkin
Feature: Parent Student Registration
  As a parent
  I want to register my children as students
  So that they can be enrolled in Tamil classes

  Background:
    Given the API is running
```

##### Scenario Group: Student Registration (POST /api/v1/me/students)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| PSR-001 | Parent registers a new student successfully | I am authenticated as a parent | I send a POST request to "/api/v1/me/students" with valid student data | Response status 201, student returned with status "pending", parentId matches token user | High |
| PSR-002 | Registration fails without authentication | No authentication | I send a POST request to "/api/v1/me/students" | Response status 401, code "auth/missing-token" | High |
| PSR-003 | Registration fails with teacher role | I am authenticated as a teacher | I send a POST request to "/api/v1/me/students" | Response status 403, code "auth/forbidden" | High |
| PSR-004 | Registration fails with admin role | I am authenticated as an admin | I send a POST request to "/api/v1/me/students" | Response status 403, code "auth/forbidden" | Medium |
| PSR-005 | Registration fails without firstName | I am authenticated as a parent | I send POST with missing firstName | Response status 400, validation error for firstName | High |
| PSR-006 | Registration fails without lastName | I am authenticated as a parent | I send POST with missing lastName | Response status 400, validation error for lastName | High |
| PSR-007 | Registration fails without dateOfBirth | I am authenticated as a parent | I send POST with missing dateOfBirth | Response status 400, validation error for dateOfBirth | High |
| PSR-008 | Registration fails with invalid dateOfBirth format | I am authenticated as a parent | I send POST with dateOfBirth "15/03/2015" | Response status 400, validation error for dateOfBirth | Medium |
| PSR-009 | Registration fails with future dateOfBirth | I am authenticated as a parent | I send POST with dateOfBirth in future | Response status 400, validation error for dateOfBirth | Medium |
| PSR-010 | Parent email is automatically captured | I am authenticated as a parent | I send a POST request to "/api/v1/me/students" | Response contains parentEmail matching parent's email | Medium |
| PSR-011 | Registration with all optional fields | I am authenticated as a parent | I send POST with grade, schoolName, priorTamilLevel, medicalNotes, photoConsent | Response status 201, all fields saved correctly | Medium |
| PSR-012 | PhotoConsent defaults to false | I am authenticated as a parent | I send POST without photoConsent field | Response status 201, photoConsent is false | Low |

##### Scenario Group: View Own Students (GET /api/v1/me/students)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| PSR-020 | Parent views their own students | I am authenticated as a parent, I have registered students | I send a GET request to "/api/v1/me/students" | Response status 200, returns array of own students only | High |
| PSR-021 | Parent sees empty array with no students | I am authenticated as a parent, I have no students | I send a GET request to "/api/v1/me/students" | Response status 200, returns empty array | Medium |
| PSR-022 | Parent cannot see other parent's students | I am authenticated as parent1, parent2 has students | I send a GET request to "/api/v1/me/students" | Response does not include parent2's students | High |
| PSR-023 | View students fails without auth | No authentication | I send a GET request to "/api/v1/me/students" | Response status 401 | High |

##### Scenario Group: View Single Student (GET /api/v1/me/students/{id})

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| PSR-030 | Parent views their own student details | I am authenticated as a parent, I have a student with id "student-001" | I send a GET request to "/api/v1/me/students/student-001" | Response status 200, returns full student details | High |
| PSR-031 | Parent cannot view other parent's student | I am authenticated as parent1, parent2 has student "student-xyz" | I send a GET request to "/api/v1/me/students/student-xyz" | Response status 404 or 403 | High |
| PSR-032 | View non-existent student returns 404 | I am authenticated as a parent | I send a GET request to "/api/v1/me/students/nonexistent" | Response status 404, code "not-found" | Medium |

##### Scenario Group: Update Own Student (PUT /api/v1/me/students/{id})

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| PSR-040 | Parent updates pending student successfully | I am authenticated as a parent, I have a pending student | I send a PUT request with updated data | Response status 200, student updated | High |
| PSR-041 | Parent updates admitted student successfully | I am authenticated as a parent, I have an admitted student | I send a PUT request with updated data | Response status 200, student updated | High |
| PSR-042 | Parent cannot update active student | I am authenticated as a parent, I have an active student | I send a PUT request with updated data | Response status 403, cannot modify active student | High |
| PSR-043 | Parent cannot update other parent's student | I am authenticated as parent1, parent2 has a student | I send a PUT request to parent2's student | Response status 403 or 404 | High |
| PSR-044 | Parent cannot change student status | I am authenticated as a parent, I have a pending student | I send a PUT request with status "active" | Response status 400 or status unchanged | High |
| PSR-045 | Update validation - invalid dateOfBirth | I am authenticated as a parent, I have a pending student | I send PUT with invalid dateOfBirth | Response status 400, validation error | Medium |

---

#### Feature: Admin Student Management (`admin-student-management.feature`)

```gherkin
Feature: Admin Student Management
  As an admin
  I want to manage student registrations
  So that I can admit students and assign them to classes

  Background:
    Given the API is running
```

##### Scenario Group: List Students (GET /api/v1/admin/students)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ASM-001 | Admin lists all students | I am authenticated as an admin | I send a GET request to "/api/v1/admin/students" | Response status 200, returns students array with total count | High |
| ASM-002 | Admin filters by pending status | I am authenticated as an admin, there are pending students | I send GET with ?status=pending | Response contains only pending students | High |
| ASM-003 | Admin filters by admitted status | I am authenticated as an admin, there are admitted students | I send GET with ?status=admitted | Response contains only admitted students | High |
| ASM-004 | Admin filters by active status | I am authenticated as an admin, there are active students | I send GET with ?status=active | Response contains only active students | High |
| ASM-005 | Admin searches by student name | I am authenticated as an admin, student "Arun Kumar" exists | I send GET with ?search=Arun | Response contains students matching "Arun" | High |
| ASM-006 | Admin paginates results with limit | I am authenticated as an admin, many students exist | I send GET with ?limit=2 | Response contains at most 2 students | Medium |
| ASM-007 | Admin paginates with offset | I am authenticated as an admin, many students exist | I send GET with ?limit=2&offset=2 | Response contains students starting from offset | Medium |
| ASM-008 | Teacher cannot list all students | I am authenticated as a teacher | I send a GET request to "/api/v1/admin/students" | Response status 403 | High |
| ASM-009 | Parent cannot list all students | I am authenticated as a parent | I send a GET request to "/api/v1/admin/students" | Response status 403 | High |
| ASM-010 | Unauthenticated cannot list students | No authentication | I send a GET request to "/api/v1/admin/students" | Response status 401 | High |

##### Scenario Group: View Student Details (GET /api/v1/admin/students/{id})

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ASM-020 | Admin views student details | I am authenticated as an admin, student "student-001" exists | I send GET to "/api/v1/admin/students/student-001" | Response status 200, full student data returned | High |
| ASM-021 | Admin views non-existent student | I am authenticated as an admin | I send GET to "/api/v1/admin/students/nonexistent" | Response status 404 | Medium |
| ASM-022 | Teacher cannot view student via admin endpoint | I am authenticated as a teacher, student exists | I send GET to "/api/v1/admin/students/student-001" | Response status 403 | High |

##### Scenario Group: Update Student (PATCH /api/v1/admin/students/{id})

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ASM-030 | Admin updates student notes | I am authenticated as an admin, student exists | I send PATCH with {notes: "Admin note"} | Response status 200, notes updated | Medium |
| ASM-031 | Admin cannot directly set status to active | I am authenticated as an admin, student is pending | I send PATCH with {status: "active"} | Response status 400 or ignored (use admit/assign endpoints) | Medium |

##### Scenario Group: Admit Student (PATCH /api/v1/admin/students/{id}/admit)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ASM-040 | Admin admits pending student | I am authenticated as an admin, pending student exists | I send PATCH to "/api/v1/admin/students/{id}/admit" | Response status 200, status is "admitted", admittedAt set, admittedBy is admin uid | High |
| ASM-041 | Cannot admit already admitted student | I am authenticated as an admin, student is already admitted | I send PATCH to "/api/v1/admin/students/{id}/admit" | Response status 400 or 200 (idempotent) | Medium |
| ASM-042 | Cannot admit active student | I am authenticated as an admin, student is active | I send PATCH to "/api/v1/admin/students/{id}/admit" | Response status 400, student already active | Medium |
| ASM-043 | Teacher cannot admit student | I am authenticated as a teacher, pending student exists | I send PATCH to "/api/v1/admin/students/{id}/admit" | Response status 403 | High |
| ASM-044 | Parent cannot admit student | I am authenticated as a parent, pending student exists | I send PATCH to "/api/v1/admin/students/{id}/admit" | Response status 403 | High |
| ASM-045 | Admit non-existent student returns 404 | I am authenticated as an admin | I send PATCH to "/api/v1/admin/students/nonexistent/admit" | Response status 404 | Medium |

##### Scenario Group: Assign Class (PATCH /api/v1/admin/students/{id}/assign-class)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ASM-050 | Admin assigns class to admitted student | I am authenticated as an admin, admitted student exists, class "class-001" exists | I send PATCH with {classId: "class-001"} | Response status 200, status is "active", classId set, className set, class enrolled count incremented | High |
| ASM-051 | Cannot assign class to pending student | I am authenticated as an admin, student is pending, class exists | I send PATCH with {classId: "class-001"} | Response status 400, must admit first | High |
| ASM-052 | Cannot assign non-existent class | I am authenticated as an admin, admitted student exists | I send PATCH with {classId: "nonexistent"} | Response status 404 or 400, class not found | High |
| ASM-053 | Cannot assign full class | I am authenticated as an admin, admitted student exists, class is at capacity | I send PATCH with full class id | Response status 400, class is full | High |
| ASM-054 | Cannot assign inactive class | I am authenticated as an admin, admitted student exists, class is inactive | I send PATCH with inactive class id | Response status 400, class is inactive | Medium |
| ASM-055 | Change class decrements old and increments new | I am authenticated as an admin, active student in class-001, class-002 exists | I send PATCH with {classId: "class-002"} | class-001 enrolled decremented, class-002 enrolled incremented | High |
| ASM-056 | Teacher cannot assign class | I am authenticated as a teacher | I send PATCH to assign-class endpoint | Response status 403 | High |

---

#### Feature: Admin Class Management (`admin-class-management.feature`)

```gherkin
Feature: Admin Class Management
  As an admin
  I want to manage Tamil classes
  So that students can be assigned to them

  Background:
    Given the API is running
```

##### Scenario Group: List Classes (GET /api/v1/admin/classes)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ACM-001 | Admin lists all classes | I am authenticated as an admin | I send GET to "/api/v1/admin/classes" | Response status 200, returns classes array with total | High |
| ACM-002 | Admin filters active classes | I am authenticated as an admin | I send GET with ?status=active | Response contains only active classes | High |
| ACM-003 | Admin filters inactive classes | I am authenticated as an admin | I send GET with ?status=inactive | Response contains only inactive classes | Medium |
| ACM-004 | Admin filters by level | I am authenticated as an admin | I send GET with ?level=Beginner | Response contains only Beginner classes | Medium |
| ACM-005 | Admin gets class options for dropdown | I am authenticated as an admin | I send GET with ?options=true | Response returns simplified options array | Medium |
| ACM-006 | Teacher cannot list classes via admin endpoint | I am authenticated as a teacher | I send GET to "/api/v1/admin/classes" | Response status 403 | High |
| ACM-007 | Unauthenticated cannot list classes | No authentication | I send GET to "/api/v1/admin/classes" | Response status 401 | High |

##### Scenario Group: Create Class (POST /api/v1/admin/classes)

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ACM-010 | Admin creates class successfully | I am authenticated as an admin | I send POST with name, level, day, time, capacity | Response status 201, class created with status "active", enrolled 0 | High |
| ACM-011 | Create class fails without name | I am authenticated as an admin | I send POST without name | Response status 400, validation error | High |
| ACM-012 | Create class fails without level | I am authenticated as an admin | I send POST without level | Response status 400, validation error | High |
| ACM-013 | Create class fails without day | I am authenticated as an admin | I send POST without day | Response status 400, validation error | High |
| ACM-014 | Create class fails without time | I am authenticated as an admin | I send POST without time | Response status 400, validation error | High |
| ACM-015 | Create class fails with capacity < 1 | I am authenticated as an admin | I send POST with capacity 0 | Response status 400, capacity must be positive | Medium |
| ACM-016 | Create class with optional teacher | I am authenticated as an admin | I send POST with teacherId, teacherName | Response status 201, teacher fields saved | Medium |
| ACM-017 | Create class with academic year | I am authenticated as an admin | I send POST with academicYear "2024-2025" | Response status 201, academicYear saved | Low |
| ACM-018 | Teacher cannot create class | I am authenticated as a teacher | I send POST to create class | Response status 403 | High |

##### Scenario Group: View Class (GET /api/v1/admin/classes/{id})

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ACM-020 | Admin views class details | I am authenticated as an admin, class "class-001" exists | I send GET to "/api/v1/admin/classes/class-001" | Response status 200, full class data | High |
| ACM-021 | View non-existent class returns 404 | I am authenticated as an admin | I send GET to "/api/v1/admin/classes/nonexistent" | Response status 404 | Medium |

##### Scenario Group: Update Class (PATCH /api/v1/admin/classes/{id})

| Scenario ID | Scenario Name | Given | When | Then | Priority |
|-------------|---------------|-------|------|------|----------|
| ACM-030 | Admin updates class name | I am authenticated as an admin, class exists | I send PATCH with {name: "New Name"} | Response status 200, name updated | High |
| ACM-031 | Admin updates class capacity | I am authenticated as an admin, class exists | I send PATCH with {capacity: 25} | Response status 200, capacity updated | Medium |
| ACM-032 | Admin deactivates class | I am authenticated as an admin, class is active | I send PATCH with {status: "inactive"} | Response status 200, status is inactive | High |
| ACM-033 | Admin activates class | I am authenticated as an admin, class is inactive | I send PATCH with {status: "active"} | Response status 200, status is active | Medium |
| ACM-034 | Cannot reduce capacity below enrolled | I am authenticated as an admin, class has 5 enrolled | I send PATCH with {capacity: 3} | Response status 400, capacity cannot be less than enrolled | High |
| ACM-035 | Teacher cannot update class | I am authenticated as a teacher, class exists | I send PATCH to update class | Response status 403 | High |

---

### 1.2 API Unit Tests (Node.js test runner)

All unit tests should be created in `/api/src/**/__tests__/` directories.

---

#### Unit Test Group: firestoreStudents.ts (`/api/src/lib/__tests__/firestoreStudents.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| FS-001 | createStudent creates with pending status | Valid student data | Student with status "pending", timestamps set | High |
| FS-002 | createStudent sets parentId correctly | parentId, data | Student has correct parentId | High |
| FS-003 | createStudent sets parentEmail | parentId, parentEmail, data | Student has parentEmail | Medium |
| FS-004 | getStudentById returns existing student | Existing student id | Full student data | High |
| FS-005 | getStudentById returns null for non-existent | Non-existent id | null | High |
| FS-006 | getStudentsByParentId returns only parent's students | parentId with 2 students | Array of 2 students | High |
| FS-007 | getStudentsByParentId returns empty for no students | parentId with no students | Empty array | Medium |
| FS-008 | getAllStudents returns all students | No filters | All students | High |
| FS-009 | getAllStudents filters by status | {status: "pending"} | Only pending students | High |
| FS-010 | getAllStudents filters by search term | {search: "Arun"} | Students matching name | High |
| FS-011 | getAllStudents applies limit | {limit: 2} | At most 2 students | Medium |
| FS-012 | getAllStudents applies offset | {offset: 2} | Skips first 2 students | Medium |
| FS-013 | updateStudent updates allowed fields | id, {grade: "6th"} | Updated student | High |
| FS-014 | updateStudent with parent check - owner | id, data, parentId | Updated student | High |
| FS-015 | updateStudent with parent check - non-owner | id, data, wrong parentId | Throws error | High |
| FS-016 | admitStudent changes status to admitted | Pending student id, adminId | Status "admitted", admittedAt, admittedBy set | High |
| FS-017 | admitStudent throws for non-pending | Admitted student id | Throws error | Medium |
| FS-018 | assignClassToStudent updates status and class | Admitted student id, classId, className | Status "active", classId, className set | High |
| FS-019 | assignClassToStudent throws for pending | Pending student id, classId | Throws error | High |

---

#### Unit Test Group: firestoreClasses.ts (`/api/src/lib/__tests__/firestoreClasses.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| FC-001 | createClass creates with active status | Valid class data | Class with status "active", enrolled 0 | High |
| FC-002 | getClassById returns existing class | Existing class id | Full class data | High |
| FC-003 | getClassById returns null for non-existent | Non-existent id | null | High |
| FC-004 | getAllClasses returns all classes | No filters | All classes | High |
| FC-005 | getAllClasses filters by status | {status: "active"} | Only active classes | High |
| FC-006 | getAllClasses filters by level | {level: "Beginner"} | Only Beginner classes | Medium |
| FC-007 | updateClass updates allowed fields | id, {name: "New Name"} | Updated class | High |
| FC-008 | incrementEnrolled increases count | classId, 1 | enrolled += 1 | High |
| FC-009 | incrementEnrolled decreases count | classId, -1 | enrolled -= 1 | High |
| FC-010 | incrementEnrolled doesn't go below 0 | classId with 0 enrolled, -1 | enrolled stays 0 | Medium |

---

#### Unit Test Group: Student Routes (`/api/src/app/v1/me/students/__tests__/route.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| SR-001 | GET returns 401 without auth | No token | 401 status | High |
| SR-002 | GET returns 403 for non-parent | Admin token | 403 status | High |
| SR-003 | GET returns parent's students | Parent token | 200, students array | High |
| SR-004 | POST returns 401 without auth | No token, valid body | 401 status | High |
| SR-005 | POST returns 403 for non-parent | Admin token, valid body | 403 status | High |
| SR-006 | POST creates student | Parent token, valid body | 201, student with pending status | High |
| SR-007 | POST validates required fields | Parent token, missing firstName | 400, validation error | High |
| SR-008 | POST validates dateOfBirth format | Parent token, invalid date | 400, validation error | High |

---

#### Unit Test Group: Admin Students Routes (`/api/src/app/v1/admin/students/__tests__/route.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| AS-001 | GET returns 401 without auth | No token | 401 status | High |
| AS-002 | GET returns 403 for non-admin | Teacher token | 403 status | High |
| AS-003 | GET returns all students | Admin token | 200, students with total | High |
| AS-004 | GET filters by status query param | Admin token, ?status=pending | 200, filtered students | High |
| AS-005 | GET filters by search query param | Admin token, ?search=test | 200, matching students | High |

---

#### Unit Test Group: Admin Students Detail Routes (`/api/src/app/v1/admin/students/[id]/__tests__/route.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| ASD-001 | GET returns 401 without auth | No token | 401 status | High |
| ASD-002 | GET returns 403 for non-admin | Parent token | 403 status | High |
| ASD-003 | GET returns student details | Admin token, valid id | 200, student data | High |
| ASD-004 | GET returns 404 for non-existent | Admin token, invalid id | 404 status | Medium |
| ASD-005 | PATCH updates student | Admin token, valid updates | 200, updated student | High |

---

#### Unit Test Group: Admit Route (`/api/src/app/v1/admin/students/[id]/admit/__tests__/route.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| ADM-001 | PATCH returns 401 without auth | No token | 401 status | High |
| ADM-002 | PATCH returns 403 for non-admin | Teacher token | 403 status | High |
| ADM-003 | PATCH admits pending student | Admin token, pending student id | 200, status "admitted" | High |
| ADM-004 | PATCH returns 404 for non-existent | Admin token, invalid id | 404 status | Medium |
| ADM-005 | PATCH returns 400 for non-pending | Admin token, active student id | 400 status | Medium |

---

#### Unit Test Group: Assign Class Route (`/api/src/app/v1/admin/students/[id]/assign-class/__tests__/route.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| ACL-001 | PATCH returns 401 without auth | No token | 401 status | High |
| ACL-002 | PATCH returns 403 for non-admin | Parent token | 403 status | High |
| ACL-003 | PATCH assigns class to admitted student | Admin token, admitted student, valid class | 200, status "active" | High |
| ACL-004 | PATCH returns 400 for pending student | Admin token, pending student | 400 status | High |
| ACL-005 | PATCH returns 404 for non-existent class | Admin token, admitted student, invalid class | 404 status | Medium |
| ACL-006 | PATCH validates classId required | Admin token, no classId in body | 400 status | High |

---

#### Unit Test Group: Admin Classes Routes (`/api/src/app/v1/admin/classes/__tests__/route.test.ts`)

| Test ID | Test Description | Input | Expected Output | Priority |
|---------|------------------|-------|-----------------|----------|
| CL-001 | GET returns 401 without auth | No token | 401 status | High |
| CL-002 | GET returns 403 for non-admin | Teacher token | 403 status | High |
| CL-003 | GET returns all classes | Admin token | 200, classes with total | High |
| CL-004 | GET filters by status | Admin token, ?status=active | 200, filtered classes | High |
| CL-005 | GET returns options format | Admin token, ?options=true | 200, options array | Medium |
| CL-006 | POST returns 401 without auth | No token | 401 status | High |
| CL-007 | POST returns 403 for non-admin | Teacher token | 403 status | High |
| CL-008 | POST creates class | Admin token, valid body | 201, class created | High |
| CL-009 | POST validates required fields | Admin token, missing name | 400 status | High |

---

## Part 2: UI Layer Tests

### 2.1 Jest Unit Tests (React Testing Library)

All unit tests should be created in `/ui/src/**/__tests__/` directories.

---

#### Component Tests: Parent Students Page (`/ui/src/app/parent/students/__tests__/page.test.tsx`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| PSP-001 | Renders loading state initially | Mock useAuth, pending fetch | Render page | Loading indicator visible | Medium |
| PSP-002 | Renders empty state when no students | Mock empty response | Render page | "No students" message, register link visible | High |
| PSP-003 | Renders student cards | Mock 2 students | Render page | 2 student cards visible with names | High |
| PSP-004 | Displays status badges correctly | Mock students with different statuses | Render page | Correct badge colors (yellow=pending, blue=admitted, green=active) | High |
| PSP-005 | Register button links to registration page | Mock any response | Render page | Register button has href="/parent/students/register" | High |
| PSP-006 | Student card shows class info for active students | Mock active student with class | Render page | Class name visible on card | Medium |
| PSP-007 | Student card shows "Not assigned" for admitted without class | Mock admitted student | Render page | "Not assigned" text visible | Medium |
| PSP-008 | Error state displays error message | Mock fetch failure | Render page | Error message visible | Medium |

---

#### Component Tests: Registration Form (`/ui/src/app/parent/students/register/__tests__/page.test.tsx`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| REG-001 | Renders registration form | Mock useAuth | Render page | Form with all fields visible | High |
| REG-002 | Submit button disabled when form invalid | Mock useAuth | Render page, leave fields empty | Submit button disabled | High |
| REG-003 | Submit button enabled when form valid | Mock useAuth | Fill all required fields | Submit button enabled | High |
| REG-004 | FirstName validation - required | Mock useAuth | Submit without firstName | Error message for firstName | High |
| REG-005 | LastName validation - required | Mock useAuth | Submit without lastName | Error message for lastName | High |
| REG-006 | DateOfBirth validation - required | Mock useAuth | Submit without dateOfBirth | Error message for dateOfBirth | High |
| REG-007 | Successful submission redirects to students page | Mock successful API response | Fill form, submit | Router pushed to /parent/students | High |
| REG-008 | Failed submission shows error message | Mock failed API response | Fill form, submit | Error message visible | High |
| REG-009 | PhotoConsent checkbox toggles | Mock useAuth | Click checkbox | Checkbox state changes | Medium |
| REG-010 | Cancel link returns to students page | Mock useAuth | Render page | Cancel link has href="/parent/students" | Low |

---

#### Component Tests: Admin Students List (`/ui/src/app/admin/students/__tests__/page.test.tsx`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| ASL-001 | Renders loading state | Mock useAuth, pending fetch | Render page | Loading indicator visible | Medium |
| ASL-002 | Renders student table | Mock students response | Render page | Table with student rows | High |
| ASL-003 | Displays student name in table | Mock students | Render page | Full names visible in rows | High |
| ASL-004 | Displays status badges | Mock students with different statuses | Render page | Correct status badges | High |
| ASL-005 | Filter dropdown changes status filter | Mock students | Select "Pending" filter | API called with status=pending | High |
| ASL-006 | Search input filters students | Mock students | Type in search input | API called with search param | High |
| ASL-007 | Admit button visible for pending students | Mock pending student | Render page | Admit button visible | High |
| ASL-008 | Admit button hidden for active students | Mock active student | Render page | Admit button not visible | Medium |
| ASL-009 | Click admit calls API | Mock pending student | Click Admit button | API called, student updated | High |
| ASL-010 | View link navigates to student details | Mock student | Render page | View link has correct href | Medium |
| ASL-011 | Empty state when no students | Mock empty response | Render page | "No students found" message | Medium |

---

#### Component Tests: Admin Student Details (`/ui/src/app/admin/students/[id]/__tests__/page.test.tsx`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| ASD-001 | Renders student details | Mock student response | Render page | All student info displayed | High |
| ASD-002 | Admit button visible for pending | Mock pending student | Render page | Admit button visible | High |
| ASD-003 | Assign Class button visible for admitted | Mock admitted student | Render page | Assign Class button visible | High |
| ASD-004 | Click Admit changes status | Mock pending student, admit API | Click Admit | Status changes to admitted | High |
| ASD-005 | Click Assign Class opens modal | Mock admitted student | Click Assign Class | Modal opens with class dropdown | High |
| ASD-006 | Class dropdown shows available classes | Mock admitted student, classes | Open modal | Classes listed in dropdown | High |
| ASD-007 | Select class and confirm assigns | Mock admitted student, classes | Select class, click assign | API called, status active | High |
| ASD-008 | Cancel closes modal | Mock admitted student | Open modal, click cancel | Modal closes | Medium |
| ASD-009 | Back link navigates to list | Mock student | Render page | Back link has correct href | Low |
| ASD-010 | Parent contact info displayed | Mock student with parentEmail | Render page | Parent email visible | Medium |

---

#### Component Tests: Admin Classes List (`/ui/src/app/admin/classes/__tests__/page.test.tsx`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| CL-001 | Renders loading state | Mock useAuth, pending fetch | Render page | Loading indicator visible | Medium |
| CL-002 | Renders classes table | Mock classes response | Render page | Table with class rows | High |
| CL-003 | Displays class name and level | Mock classes | Render page | Name and level visible | High |
| CL-004 | Displays enrolled/capacity | Mock classes | Render page | "X/Y students" visible | High |
| CL-005 | Filter by status works | Mock classes | Select status filter | API called with status param | Medium |
| CL-006 | Create Class button links correctly | Mock any response | Render page | Create button has correct href | High |
| CL-007 | Edit link navigates to class details | Mock class | Render page | Edit link has correct href | Medium |
| CL-008 | Deactivate button calls API | Mock active class | Click Deactivate | API called with status inactive | High |
| CL-009 | Activate button visible for inactive | Mock inactive class | Render page | Activate button visible | Medium |

---

#### Component Tests: Create Class Form (`/ui/src/app/admin/classes/create/__tests__/page.test.tsx`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| CCF-001 | Renders create class form | Mock useAuth | Render page | All form fields visible | High |
| CCF-002 | Submit disabled when invalid | Mock useAuth | Render empty form | Submit button disabled | High |
| CCF-003 | Name validation - required | Mock useAuth | Submit without name | Error message for name | High |
| CCF-004 | Time validation - required | Mock useAuth | Submit without time | Error message for time | High |
| CCF-005 | Capacity validation - min 1 | Mock useAuth | Enter capacity 0 | Error message for capacity | High |
| CCF-006 | Successful submission redirects | Mock success API | Fill form, submit | Router pushed to /admin/classes | High |
| CCF-007 | Failed submission shows error | Mock failed API | Fill form, submit | Error message visible | Medium |
| CCF-008 | Level dropdown has options | Mock useAuth | Render page | Beginner, Intermediate, Advanced options | Medium |
| CCF-009 | Day dropdown has all days | Mock useAuth | Render page | All 7 days as options | Medium |

---

#### API Client Tests: student-api.ts (`/ui/src/lib/__tests__/student-api.test.ts`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| SA-001 | getMyStudents calls correct endpoint | Mock fetch | Call getMyStudents | Fetched /api/v1/me/students | High |
| SA-002 | getMyStudents passes auth header | Mock fetch, token | Call getMyStudents | Authorization header set | High |
| SA-003 | createStudent calls POST | Mock fetch | Call createStudent | POST to /api/v1/me/students | High |
| SA-004 | createStudent sends body as JSON | Mock fetch | Call createStudent with data | Body matches data | High |
| SA-005 | adminGetStudents calls admin endpoint | Mock fetch | Call adminGetStudents | Fetched /api/v1/admin/students | High |
| SA-006 | adminGetStudents passes filters | Mock fetch | Call with {status: "pending"} | Query param included | High |
| SA-007 | adminAdmitStudent calls admit endpoint | Mock fetch | Call adminAdmitStudent | PATCH to /api/v1/admin/students/{id}/admit | High |
| SA-008 | adminAssignClass sends classId | Mock fetch | Call adminAssignClass | Body contains classId | High |
| SA-009 | Throws on non-ok response | Mock 400 response | Call any function | Error thrown | High |

---

#### API Client Tests: class-api.ts (`/ui/src/lib/__tests__/class-api.test.ts`)

| Test ID | Test Description | Setup | Actions | Assertions | Priority |
|---------|------------------|-------|---------|------------|----------|
| CA-001 | adminGetClasses calls correct endpoint | Mock fetch | Call adminGetClasses | Fetched /api/v1/admin/classes | High |
| CA-002 | adminGetClasses passes status filter | Mock fetch | Call with {status: "active"} | Query param included | High |
| CA-003 | adminGetClassOptions uses options=true | Mock fetch | Call adminGetClassOptions | ?options=true in URL | High |
| CA-004 | adminCreateClass calls POST | Mock fetch | Call adminCreateClass | POST method used | High |
| CA-005 | adminUpdateClass calls PATCH | Mock fetch | Call adminUpdateClass | PATCH to /api/v1/admin/classes/{id} | High |
| CA-006 | Throws on non-ok response | Mock 400 response | Call any function | Error thrown | High |

---

### 2.2 Playwright E2E Tests

All E2E tests should be created in `/ui/tests/e2e/` directory.

---

#### Parent Student Flow Tests (`/ui/tests/e2e/parent/students.spec.ts`)

| Test ID | Test Description | Pre-conditions | Steps | Expected Result | Priority |
|---------|------------------|----------------|-------|-----------------|----------|
| PE2E-001 | Parent students page is protected | Not logged in | Navigate to /parent/students | Redirected to signin | High |
| PE2E-002 | Logged in parent sees students list | Logged in as parent with students | Navigate to /parent/students | Student cards visible | High |
| PE2E-003 | Register new student link works | Logged in as parent | Click "Register New Student" | Navigates to /parent/students/register | High |
| PE2E-004 | Complete student registration flow | Logged in as parent | Fill form, submit | Redirected to students list, new student visible | High |
| PE2E-005 | Registration form validation | Logged in as parent | Submit empty form | Validation errors shown | High |
| PE2E-006 | Student status badge displays correctly | Logged in as parent with pending student | View students list | Yellow "Pending Review" badge | Medium |

---

#### Admin Student Management Flow Tests (`/ui/tests/e2e/admin/students.spec.ts`)

| Test ID | Test Description | Pre-conditions | Steps | Expected Result | Priority |
|---------|------------------|----------------|-------|-----------------|----------|
| AE2E-001 | Admin students page is protected | Not logged in | Navigate to /admin/students | Redirected to signin | High |
| AE2E-002 | Admin students page requires admin role | Logged in as parent | Navigate to /admin/students | Redirected or forbidden | High |
| AE2E-003 | Admin sees all students | Logged in as admin, students exist | Navigate to /admin/students | All students in table | High |
| AE2E-004 | Filter pending students | Logged in as admin | Select "Pending" filter | Only pending students shown | High |
| AE2E-005 | Search students by name | Logged in as admin, "Arun" exists | Type "Arun" in search | Only matching students shown | Medium |
| AE2E-006 | View student details | Logged in as admin, student exists | Click View on student | Student details page shown | High |
| AE2E-007 | Admit pending student | Logged in as admin, pending student | Click Admit on student | Status changes to Admitted | High |
| AE2E-008 | Assign class to admitted student | Logged in as admin, admitted student, class exists | Open details, click Assign, select class, confirm | Status changes to Active, class assigned | High |
| AE2E-009 | Cannot assign class to pending student | Logged in as admin, pending student | View pending student details | Assign Class button not visible | Medium |

---

#### Admin Class Management Flow Tests (`/ui/tests/e2e/admin/classes.spec.ts`)

| Test ID | Test Description | Pre-conditions | Steps | Expected Result | Priority |
|---------|------------------|----------------|-------|-----------------|----------|
| CE2E-001 | Admin classes page is protected | Not logged in | Navigate to /admin/classes | Redirected to signin | High |
| CE2E-002 | Admin sees all classes | Logged in as admin, classes exist | Navigate to /admin/classes | All classes in table | High |
| CE2E-003 | Create new class link works | Logged in as admin | Click "Create Class" | Navigates to create form | High |
| CE2E-004 | Complete class creation flow | Logged in as admin | Fill form, submit | Redirected to classes list, new class visible | High |
| CE2E-005 | Class creation form validation | Logged in as admin | Submit empty form | Validation errors shown | High |
| CE2E-006 | Deactivate active class | Logged in as admin, active class | Click Deactivate | Status changes to Inactive | High |
| CE2E-007 | Filter active classes only | Logged in as admin | Select "Active Only" filter | Only active classes shown | Medium |

---

## Part 3: Test Data Requirements

### Seed Data for Tests

The following test data should be available in the emulator (via `/scripts/seed-emulator.js`):

#### Users
| UID | Email | Role | Purpose |
|-----|-------|------|---------|
| test-admin-uid | admin@test.com | admin | Admin tests |
| test-teacher-uid | teacher@test.com | teacher | RBAC tests |
| test-parent-uid | parent@test.com | parent | Parent tests |
| parent-test-002 | parent2@test.com | parent | Multi-parent tests |

#### Students
| ID | Name | Parent | Status | Class | Purpose |
|----|------|--------|--------|-------|---------|
| student-001 | Arun Kumar | test-parent-uid | active | class-001 | Active student tests |
| student-002 | Priya Sharma | test-parent-uid | active | class-002 | Second active student |
| student-003 | Vikram Patel | parent-test-002 | active | class-001 | Different parent tests |
| student-004 | Meera Krishnan | parent-test-002 | pending | - | Pending student tests |
| student-005 | Raj Sundar | test-parent-uid | admitted | - | Admitted student tests |

#### Classes
| ID | Name | Level | Status | Enrolled | Capacity | Purpose |
|----|------|-------|--------|----------|----------|---------|
| class-001 | Tamil Beginners - Saturday AM | Beginner | active | 2 | 20 | Assignment tests |
| class-002 | Tamil Intermediate - Saturday PM | Intermediate | active | 1 | 15 | Level filter tests |
| class-003 | Tamil Advanced - Sunday | Advanced | active | 0 | 10 | Empty class tests |

---

## Part 4: Test Step Definitions Required

### New Step Definitions for `/api/tests/e2e/steps/`

#### student.steps.ts

```gherkin
# Data setup steps
Given there is a student with id {string} with status {string}
Given there is a student with id {string} belonging to parent {string}
Given the class {string} has {int} students enrolled

# Verification steps
Then the JSON path "status" should equal "pending"
Then the JSON path "admittedAt" should exist
Then the JSON path "admittedBy" should equal {string}
Then the JSON path "classId" should equal {string}
Then the JSON path "className" should equal {string}
```

#### class.steps.ts

```gherkin
# Data setup steps
Given there is a class with id {string}
Given there is an active class with id {string} and capacity {int}
Given the class {string} is at full capacity

# Verification steps
Then the class {string} should have {int} enrolled students
```

---

## Part 5: Test Execution Commands

### API Tests
```bash
# Run all Cucumber E2E tests
cd api && npm run test:e2e

# Run specific feature file
cd api && npm run test:cucumber -- --name "Parent Student Registration"

# Run unit tests
cd api && npm run test

# Run specific unit test file
cd api && npm run test -- --test-name-pattern "firestoreStudents"
```

### UI Tests
```bash
# Run Jest unit tests
cd ui && npm run test

# Run specific test file
cd ui && npm run test -- student-api.test.ts

# Run Playwright E2E tests
cd ui && npm run test:e2e

# Run specific Playwright test
cd ui && npx playwright test students.spec.ts

# Run with browser visible
cd ui && npm run test:e2e:headed
```

---

## Part 6: Test Priority Matrix

### Priority 1 (Must Have) - Critical Path
- Authentication and authorization for all endpoints
- Student registration by parent (create, validate)
- Admin admit student flow
- Admin assign class flow
- Class creation

### Priority 2 (Should Have) - Important Functionality
- Student listing and filtering
- Student update by parent
- Class listing and filtering
- Status badge displays
- Error handling

### Priority 3 (Nice to Have) - Edge Cases
- Pagination tests
- Capacity constraints
- Optional field handling
- UI loading states
- Cancel/back navigation

---

## Part 7: Test Environment Setup

### Prerequisites
1. Firebase emulators running (Firestore on 8889, Auth on 9099)
2. API server running on port 8080
3. UI server running on port 3100
4. Seed data loaded via `node scripts/seed-emulator.js`

### Environment Variables
```bash
FIRESTORE_EMULATOR_HOST=localhost:8889
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
USE_TEST_AUTH=true
ALLOW_TEST_INVITES=1
```

### Docker Compose (optional)
```bash
docker-compose up -d  # Start emulators
npm run seed          # Seed test data
```

---

## Appendix A: Test File Checklist

### API Tests to Create
- [ ] `/api/tests/e2e/features/parent-student-registration.feature`
- [ ] `/api/tests/e2e/features/admin-student-management.feature`
- [ ] `/api/tests/e2e/features/admin-class-management.feature`
- [ ] `/api/tests/e2e/steps/student.steps.ts`
- [ ] `/api/tests/e2e/steps/class.steps.ts`
- [ ] `/api/src/lib/__tests__/firestoreStudents.test.ts`
- [ ] `/api/src/lib/__tests__/firestoreClasses.test.ts`
- [ ] `/api/src/app/v1/me/students/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/me/students/[id]/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/admin/students/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/admin/students/[id]/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/admin/students/[id]/admit/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/admin/students/[id]/assign-class/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/admin/classes/__tests__/route.test.ts`
- [ ] `/api/src/app/v1/admin/classes/[id]/__tests__/route.test.ts`

### UI Tests to Create
- [ ] `/ui/src/app/parent/students/__tests__/page.test.tsx`
- [ ] `/ui/src/app/parent/students/register/__tests__/page.test.tsx`
- [ ] `/ui/src/app/admin/students/__tests__/page.test.tsx`
- [ ] `/ui/src/app/admin/students/[id]/__tests__/page.test.tsx`
- [ ] `/ui/src/app/admin/classes/__tests__/page.test.tsx`
- [ ] `/ui/src/app/admin/classes/create/__tests__/page.test.tsx`
- [ ] `/ui/src/lib/__tests__/student-api.test.ts`
- [ ] `/ui/src/lib/__tests__/class-api.test.ts`
- [ ] `/ui/tests/e2e/parent/students.spec.ts`
- [ ] `/ui/tests/e2e/admin/students.spec.ts`
- [ ] `/ui/tests/e2e/admin/classes.spec.ts`

---

## Appendix B: Gherkin Feature File Templates

### parent-student-registration.feature
```gherkin
@parent @students @registration
Feature: Parent Student Registration
  As a parent
  I want to register my children as students
  So that they can be enrolled in Tamil classes

  Background:
    Given the API is running

  # ============================================
  # POST /api/v1/me/students - Create Student
  # ============================================

  @auth @happy-path
  Scenario: PSR-001 Parent registers a new student successfully
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2015-03-15",
        "grade": "5th Grade",
        "schoolName": "Test Elementary",
        "priorTamilLevel": "beginner",
        "photoConsent": true
      }
      """
    Then the response status should be 201
    And the JSON response should have properties:
      | property | type    |
      | success  | boolean |
      | data     | object  |
    And the JSON path "data.student.status" should equal "pending"
    And the JSON path "data.student.parentId" should equal "test-parent-uid"
    And the JSON path "data.student.parentEmail" should equal "parent@test.com"

  @auth @negative
  Scenario: PSR-002 Registration fails without authentication
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  # ... additional scenarios
```

### admin-student-management.feature
```gherkin
@admin @students @management
Feature: Admin Student Management
  As an admin
  I want to manage student registrations
  So that I can admit students and assign them to classes

  Background:
    Given the API is running
    Given I am authenticated as an admin

  # ============================================
  # GET /api/v1/admin/students - List Students
  # ============================================

  @list @happy-path
  Scenario: ASM-001 Admin lists all students
    When I send a GET request to "/api/v1/admin/students"
    Then the response status should be 200
    And the JSON response should have properties:
      | property | type   |
      | success  | boolean|
      | data     | object |
    And the JSON path "data.students" should be an array
    And the JSON path "data.total" should exist

  @list @filter
  Scenario: ASM-002 Admin filters by pending status
    Given there is a student with id "pending-student-001" with status "pending"
    When I send a GET request to "/api/v1/admin/students?status=pending"
    Then the response status should be 200
    And all students in response should have status "pending"

  # ============================================
  # PATCH /api/v1/admin/students/{id}/admit
  # ============================================

  @admit @happy-path
  Scenario: ASM-040 Admin admits pending student
    Given there is a student with id "admit-test-001" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/admit-test-001/admit"
    Then the response status should be 200
    And the JSON path "data.student.status" should equal "admitted"
    And the JSON path "data.student.admittedAt" should exist
    And the JSON path "data.student.admittedBy" should equal "test-admin-uid"

  # ============================================
  # PATCH /api/v1/admin/students/{id}/assign-class
  # ============================================

  @assign-class @happy-path
  Scenario: ASM-050 Admin assigns class to admitted student
    Given there is a student with id "assign-test-001" with status "admitted"
    Given there is an active class with id "test-class-001" and capacity 20
    When I send a PATCH request to "/api/v1/admin/students/assign-test-001/assign-class" with JSON body:
      """
      {
        "classId": "test-class-001"
      }
      """
    Then the response status should be 200
    And the JSON path "data.student.status" should equal "active"
    And the JSON path "data.student.classId" should equal "test-class-001"

  # ... additional scenarios
```

---

*Document Version: 1.0*
*Created: December 2024*
*Last Updated: December 2024*
