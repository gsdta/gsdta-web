# UAT Test Users

**Last Updated**: December 28, 2025
**Environment**: QA (`gsdta-qa`)

This document contains all UAT test user credentials for the QA environment.

---

## Quick Reference

| Email | Password | Roles |
|-------|----------|-------|
| `superadmin-uat@gsdta.org` | `UatTest123!` | super_admin |
| `teacher-uat@gsdta.org` | `UatTest123!` | teacher |
| `parent1-uat@gsdta.org` | `UatTest123!` | parent |
| `parent2-uat@gsdta.org` | `UatTest123!` | parent |
| `parent-teacher-uat@gsdta.org` | `UatTest123!` | parent, teacher |
| `parent-admin-uat@gsdta.org` | `UatTest123!` | parent, admin |
| `teacher-admin-uat@gsdta.org` | `UatTest123!` | teacher, admin |
| `allroles-uat@gsdta.org` | `UatTest123!` | super_admin, admin, teacher, parent |

---

## Detailed User Information

### Single Role Users

#### Super Admin
- **Email**: `superadmin-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-super-admin`
- **Roles**: `super_admin`
- **Use Case**: Test super admin dashboard, system configuration, user management

#### Teacher
- **Email**: `teacher-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-teacher-1`
- **Roles**: `teacher`
- **Assigned Class**: Grade 3 - Saturday AM
- **Use Case**: Test teacher portal, attendance, gradebook, messaging

#### Parent 1
- **Email**: `parent1-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-parent-1`
- **Roles**: `parent`
- **Children**: UAT Student 1-5
- **Use Case**: Test parent portal, view grades, messaging, profile completion

#### Parent 2
- **Email**: `parent2-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-parent-2`
- **Roles**: `parent`
- **Children**: UAT Student 6-10
- **Use Case**: Test parent portal with different set of children

---

### Multi-Role Users (for Role Switching)

#### Parent + Teacher
- **Email**: `parent-teacher-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-parent-teacher`
- **Roles**: `parent`, `teacher`
- **Use Case**: Test switching between parent and teacher portals

#### Parent + Admin
- **Email**: `parent-admin-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-parent-admin`
- **Roles**: `parent`, `admin`
- **Use Case**: Test switching between parent portal and admin dashboard

#### Teacher + Admin
- **Email**: `teacher-admin-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-teacher-admin`
- **Roles**: `teacher`, `admin`
- **Use Case**: Test switching between teacher portal and admin dashboard

#### All Roles
- **Email**: `allroles-uat@gsdta.org`
- **Password**: `UatTest123!`
- **UID**: `uat-all-roles`
- **Roles**: `super_admin`, `admin`, `teacher`, `parent`
- **Use Case**: Test full role switching functionality across all portals

---

## Test Data Summary

### Class
- **Name**: Grade 3 - Saturday AM
- **ID**: `class-grade-3-sat`
- **Teacher**: UAT Teacher (`uat-teacher-1`)
- **Students**: 10 (UAT Student 1-10)

### Students
| ID | Name | Parent | Grade |
|----|------|--------|-------|
| `uat-student-1` | UAT Student 1 | parent1-uat@gsdta.org | Grade 3 |
| `uat-student-2` | UAT Student 2 | parent1-uat@gsdta.org | Grade 3 |
| `uat-student-3` | UAT Student 3 | parent1-uat@gsdta.org | Grade 3 |
| `uat-student-4` | UAT Student 4 | parent1-uat@gsdta.org | Grade 3 |
| `uat-student-5` | UAT Student 5 | parent1-uat@gsdta.org | Grade 3 |
| `uat-student-6` | UAT Student 6 | parent2-uat@gsdta.org | Grade 3 |
| `uat-student-7` | UAT Student 7 | parent2-uat@gsdta.org | Grade 3 |
| `uat-student-8` | UAT Student 8 | parent2-uat@gsdta.org | Grade 3 |
| `uat-student-9` | UAT Student 9 | parent2-uat@gsdta.org | Grade 3 |
| `uat-student-10` | UAT Student 10 | parent2-uat@gsdta.org | Grade 3 |

### Test Data Available
- **Calendar Events**: 5 events (Pongal, New Year, meetings, weekly class, spring break)
- **Attendance Records**: 40 records (4 weeks x 10 students)
- **Assignments**: 4 (homework, quiz, project, midterm test)
- **Student Grades**: 10 (5 students x 2 graded assignments)
- **Report Cards**: 3 (Fall 2024 for students 1-3)
- **Conversations**: 2 parent-teacher conversations
- **Messages**: 5 messages

---

## Environment Variables

See `uat/.env` for the complete configuration. Copy these to your `.env.local` or use them in your test configuration:

```bash
# UAT Test Users
UAT_SUPERADMIN_EMAIL=superadmin-uat@gsdta.org
UAT_SUPERADMIN_PASSWORD=UatTest123!

UAT_TEACHER_EMAIL=teacher-uat@gsdta.org
UAT_TEACHER_PASSWORD=UatTest123!

UAT_PARENT1_EMAIL=parent1-uat@gsdta.org
UAT_PARENT1_PASSWORD=UatTest123!

UAT_PARENT2_EMAIL=parent2-uat@gsdta.org
UAT_PARENT2_PASSWORD=UatTest123!

UAT_PARENT_TEACHER_EMAIL=parent-teacher-uat@gsdta.org
UAT_PARENT_TEACHER_PASSWORD=UatTest123!

UAT_PARENT_ADMIN_EMAIL=parent-admin-uat@gsdta.org
UAT_PARENT_ADMIN_PASSWORD=UatTest123!

UAT_TEACHER_ADMIN_EMAIL=teacher-admin-uat@gsdta.org
UAT_TEACHER_ADMIN_PASSWORD=UatTest123!

UAT_ALL_ROLES_EMAIL=allroles-uat@gsdta.org
UAT_ALL_ROLES_PASSWORD=UatTest123!
```

---

## Seed Script

To recreate this test data, run:

```bash
cd scripts
FIREBASE_PROJECT_ID=gsdta-qa node seed-qa-new-features.js
```

---

## Notes

1. **Password Policy**: All UAT users use the same password `UatTest123!` for convenience
2. **Email Verification**: All users are created with `emailVerified: true`
3. **Custom Claims**: Roles are set as custom claims in Firebase Auth tokens
4. **Profile Completion**: Parent users have complete profiles (phone, address) for testing
