# GSDTA Beta Testing Guide

## QA Environment

**URL**: https://app.qa.gsdta.com

---

## Test User Credentials

| Email | Password | Role(s) | Description |
|-------|----------|---------|-------------|
| `superadmin-uat@gsdta.org` | `REDACTED_PASSWORD` | Super Admin | Full system access, feature flags, admin management |
| `teacher-uat@gsdta.org` | `REDACTED_PASSWORD` | Teacher | Teacher portal, attendance, gradebook |
| `parent1-uat@gsdta.org` | `REDACTED_PASSWORD` | Parent | Parent portal with 5 children (UAT Student 1-5) |
| `parent2-uat@gsdta.org` | `REDACTED_PASSWORD` | Parent | Parent portal with 5 children (UAT Student 6-10) |
| `parent-teacher-uat@gsdta.org` | `REDACTED_PASSWORD` | Parent + Teacher | Multi-role: can switch between parent and teacher |
| `parent-admin-uat@gsdta.org` | `REDACTED_PASSWORD` | Parent + Admin | Multi-role: parent and admin access |
| `teacher-admin-uat@gsdta.org` | `REDACTED_PASSWORD` | Teacher + Admin | Multi-role: teacher and admin access |
| `allroles-uat@gsdta.org` | `REDACTED_PASSWORD` | All Roles | Has all 4 roles for testing role switching |

---

## Features to Test by Role

### Parent Portal
- [ ] Login and complete profile (phone, address required on first login)
- [ ] View dashboard with children's summary
- [ ] View linked children/students
- [ ] Add a new child/student
- [ ] View grades and assignments for each child
- [ ] View historical report cards
- [ ] View attendance records
- [ ] Send message to teacher
- [ ] View and reply to conversations
- [ ] View calendar events
- [ ] RSVP to events
- [ ] Update profile settings

### Teacher Portal
- [ ] Login and view dashboard
- [ ] View assigned classes
- [ ] View class roster (student list)
- [ ] Record daily attendance
- [ ] Create assignments
- [ ] Enter grades in gradebook
- [ ] View gradebook matrix
- [ ] Generate/publish report cards
- [ ] Send message to parents
- [ ] View and reply to conversations
- [ ] View student progress

### Admin Portal
- [ ] Login and view dashboard
- [ ] Manage teachers (view, search, invite new)
- [ ] Manage classes (create, edit, assign teachers)
- [ ] Manage students (view, search, bulk import)
- [ ] Transfer students between classes
- [ ] Manage grades/levels
- [ ] View attendance analytics
- [ ] Manage calendar events (create, edit, delete)
- [ ] Manage flash news announcements
- [ ] Edit hero content on homepage
- [ ] View audit logs

### Super Admin Portal
- [ ] All admin features above
- [ ] Manage feature flags (enable/disable features by role)
- [ ] Promote/demote admins
- [ ] System configuration

### Multi-Role Users
- [ ] Login with multi-role account (e.g., `parent-teacher-uat@gsdta.org`)
- [ ] Switch between roles using role switcher
- [ ] Verify each role shows correct dashboard and features
- [ ] Verify navigation changes based on selected role

### Public Website
- [ ] View homepage hero section
- [ ] View flash news marquee
- [ ] View Thirukkural quotes (Tamil + English)
- [ ] View public calendar
- [ ] Verify bilingual content display

---

## Test Data Available

| Data Type | Count | Details |
|-----------|-------|---------|
| Class | 1 | Grade 3 - Saturday AM |
| Students | 10 | UAT Student 1-10 |
| Assignments | 4 | Homework, quiz, project, midterm test |
| Grades | 10 | 5 students x 2 graded assignments |
| Attendance Records | 40 | 4 weeks x 10 students |
| Report Cards | 3 | Fall 2024 for students 1-3 |
| Conversations | 2 | Parent-teacher messages |
| Calendar Events | 5 | Pongal, New Year, meetings, class, spring break |

---

## Important Notes

1. **Profile Completion Required**: Parents must complete their profile (phone number, address) on first login before accessing other features.

2. **Role Switching**: Users with multiple roles can switch between them using the role switcher in the header/sidebar.

3. **Bilingual Content**: The app supports both Tamil and English. Test content displays correctly in both languages.

4. **Real-Time Updates**: Messages and content changes should update in real-time without page refresh.

5. **Data Isolation**: QA environment data is completely separate from production.

6. **Mobile Responsive**: Test on both desktop and mobile devices to verify responsive design.

---

## Data Guidelines

**Safe to Create/Modify:**
- New students, classes, assignments
- New calendar events, flash news
- New conversations and messages
- Grades and attendance records

**Please Avoid Deleting:**
- The existing **UAT Student 1-10** records
- The **Grade 3 - Saturday AM** class
- The pre-seeded assignments and report cards

> **Note**: Automated UAT tests run against this environment when code is deployed. These tests use separate credentials but share the same test data. If you accidentally delete critical test data, it can be re-seeded by the development team.

---

## Reporting Issues

When reporting bugs or issues, please include:

1. **User account used** (which test user)
2. **Steps to reproduce** the issue
3. **Expected behavior** vs **Actual behavior**
4. **Screenshots** or screen recordings if possible
5. **Browser and device** information
6. **Any error messages** displayed

---

## Contact

For questions or support during testing, please contact the development team.

---

*Last Updated: January 2025*
