# GSDTA Tamil School - System Requirements Specification

**Purpose**: This document explains what the GSDTA Tamil School website does in simple terms. Use this as your guide when testing the system.

**Last Updated**: January 2, 2026

---

## Table of Contents

1. [What is This System?](#what-is-this-system)
2. [Who Uses This System?](#who-uses-this-system)
3. [How to Log In](#how-to-log-in)
4. [Parent Features](#parent-features)
5. [Teacher Features](#teacher-features)
6. [Admin Features](#admin-features)
7. [Super Admin Features](#super-admin-features)
8. [Public Website](#public-website)
9. [Feature Flags](#feature-flags)

---

## What is This System?

The GSDTA Tamil School Management System is a website that helps run a Tamil language school. It lets:

- **Parents** register their children and track their progress
- **Teachers** take attendance and manage their classes
- **Admins** manage the entire school (students, teachers, classes)
- **Super Admins** control system settings and security

The website works on computers, tablets, and phones.

---

## Who Uses This System?

### User Types (Roles)

| Role | Who Are They? | What Can They Do? |
|------|---------------|-------------------|
| **Parent** | Moms and dads of students | Register kids, view their info, update profile |
| **Teacher** | Tamil teachers | View classes, take attendance, see student list |
| **Admin** | School administrators | Manage everything - students, teachers, classes |
| **Super Admin** | System managers | Control system settings, security, feature flags |

### How Users Get Access

| Role | How They Join |
|------|---------------|
| Parent | Signs up on the website themselves |
| Teacher | Gets an email invitation from Admin |
| Admin | Promoted by Super Admin |
| Super Admin | Created during initial system setup |

---

## How to Log In

### What You Should See

1. **Login Page** shows two options:
   - Sign in with email and password
   - Sign in with Google

2. **After Login**, you go to your dashboard based on your role

### Expected Behavior

| Action | What Should Happen |
|--------|-------------------|
| Enter correct email/password | Goes to your dashboard |
| Enter wrong password | Shows "Invalid credentials" error |
| Click "Sign in with Google" | Opens Google login popup |
| Click "Sign up" | Goes to registration page |
| Click "Forgot password" | Opens password reset form |

### Things That Should NOT Happen

- Logging in without email verification (for new accounts)
- Accessing admin pages as a parent
- Seeing other parents' information

---

## Parent Features

### Dashboard

When a parent logs in, they see their **Dashboard** with:

- Welcome message with their name
- Quick stats showing number of linked students
- **Tile cards** for quick navigation to all features
- List of their registered children (if any)

#### Dashboard Tiles (Quick Actions)

| Tile | What It Does |
|------|-------------|
| **My Students** | See all your registered children |
| **Register Student** | Add a new child to the school |
| **Messages** | Send/receive messages from teachers |
| **My Profile** | Update your contact information |
| **Settings** | Change notification preferences |

### Registering a Student

**Steps:**
1. Click "Register Student" tile
2. Fill in child's information:
   - First name, Last name
   - Date of birth
   - Gender
   - Grade they want to join
   - School name
   - Medical notes (optional)
   - Photo consent (yes/no)
3. Add parent contact details
4. Click "Submit"

**What Should Happen:**
- Student shows as "Pending" status
- Admin will review and approve
- Once approved, status changes to "Admitted" or "Active"

### Viewing Your Students

**What You See:**
- List of all your registered children
- Each child shows: Name, Grade, Status
- Status badges: Pending (yellow), Active (green), Inactive (gray)

### My Profile

**What You Can Update:**
- Display name
- Phone number
- Home address
- Language preference (English or Tamil)
- Notification settings (email/SMS on/off)

### When Features Are Disabled

If an admin has turned off certain features:
- Those tile cards will NOT appear on your dashboard
- You will NOT see those options in the sidebar menu
- If you try to go there directly, you'll see an error

---

## Teacher Features

### Dashboard

When a teacher logs in, they see:

- Welcome message with their name
- Stats: Total classes, Total students, Classes today
- Today's schedule (if they have classes today)
- **Tile cards** for quick navigation
- List of their assigned classes

#### Dashboard Tiles (Quick Actions)

| Tile | What It Does |
|------|-------------|
| **My Classes** | See all classes you teach |
| **Mark Attendance** | Take attendance for today |
| **Attendance History** | See past attendance records |
| **Messages** | Communicate with parents |

### Viewing Your Classes

**What You See:**
- List of classes assigned to you
- Each class shows: Name, Grade, Day/Time, Student count
- Click a class to see more details

### Class Details

When you click on a class:
- Class name and grade
- Schedule (day and time)
- Room number
- Your role (Primary Teacher or Assistant)
- Number of students enrolled

### Class Roster (Student List)

**What You See:**
- List of all students in the class
- Each student shows: Name, Grade
- Can search for a student by name

### Taking Attendance

**Steps:**
1. Go to "Mark Attendance" or click a class then "Mark Attendance"
2. See list of all students
3. For each student, click one of:
   - ✓ Present (green)
   - ✗ Absent (red)
   - ⏰ Late (yellow)
   - 📝 Excused (blue)
4. Add notes if needed
5. Click "Save Attendance"

**What Should Happen:**
- Attendance is saved
- Shows success message
- Can be edited within 7 days

### Viewing Attendance History

**What You See:**
- List of past attendance records
- Filter by date range
- See who was present/absent on each day
- Attendance percentages

### Editing Attendance

**Rules:**
- Can only edit attendance from the last 7 days
- Must select the record to edit
- Must provide reason for change
- System keeps track of all changes

---

## Admin Features

### Dashboard

When an admin logs in, they see:

- Welcome message
- **Tile cards** organized by section for ALL admin features
- Sidebar menu with all options

#### Dashboard Tile Sections

| Section | Tiles |
|---------|-------|
| **Students** | All Students, Pending Review |
| **Teachers** | All Teachers, Invite Teacher, Assign to Classes |
| **Classes** | All Classes, Create Class, Grades |
| **Resources** | Textbooks |
| **Volunteers** | All Volunteers |
| **Analytics** | Attendance Analytics |
| **Content** | Hero Content |
| **Calendar** | All Events, Create Event |

### Managing Students

#### View All Students
- See list of all students in the school
- Search by name
- Filter by: Status, Grade, Class
- Click a student to see details

#### Student Statuses
| Status | Meaning |
|--------|---------|
| Pending | New registration, waiting for review |
| Admitted | Approved but not assigned to class |
| Active | Currently enrolled in a class |
| Inactive | No longer attending |
| Withdrawn | Officially removed |

#### Admitting a Student
1. Go to "Pending Review"
2. Click on a pending student
3. Review their information
4. Click "Admit" button
5. Status changes to "Admitted"

#### Assigning Student to Class
1. Go to student details
2. Click "Assign to Class"
3. Select a class from dropdown
4. Click "Save"
5. Student status becomes "Active"

### Managing Teachers

#### View All Teachers
- List of all teachers
- Search by name or email
- Filter by status (Active/Inactive)

#### Inviting a New Teacher
1. Click "Invite Teacher"
2. Enter teacher's email
3. Click "Send Invite"
4. Teacher receives email with link
5. Teacher clicks link and creates account
6. Teacher is now in the system

**Invite Rules:**
- Invite expires after 72 hours
- Cannot invite same email twice (while pending)
- Teacher must verify their email

#### Assigning Teachers to Classes
1. Go to "Assign to Classes"
2. Select a teacher
3. Select a class
4. Choose role: Primary or Assistant
5. Click "Assign"

### Managing Classes

#### View All Classes
- List of all classes
- Filter by grade
- See: Name, Grade, Teacher, Day/Time, Enrollment

#### Creating a Class
1. Click "Create Class"
2. Fill in:
   - Class name
   - Select grade
   - Section (A, B, etc.)
   - Room number
   - Day (Saturday/Sunday)
   - Time
   - Capacity (max students)
3. Click "Create"

#### Editing a Class
- Click on a class to view details
- Click "Edit"
- Change any information
- Click "Save"

### Managing Grades

#### Default Grades
The system comes with these grades:
- PS-1, PS-2 (Pre-School)
- KG (Kindergarten)
- Grade 1 through Grade 8

#### What You Can Do
- Change grade display names
- Change display order
- Activate/Deactivate grades

### Managing Textbooks

- Add textbooks to the catalog
- Set grade level
- Track inventory count
- Public textbook page shows available books

### Managing Volunteers

- Add volunteer records
- Track volunteer type (Teaching, Admin, Event)
- Track volunteer status
- Log volunteer hours

### Managing Hero Content (Banners)

Hero content = the big banners on the homepage

#### Creating a Banner
1. Go to "Hero Content"
2. Click "Create New"
3. Fill in:
   - Title (English and Tamil)
   - Subtitle
   - Image URL
   - Button text and link (optional)
   - Start and end dates
   - Priority (higher = shows first)
4. Toggle "Active" to make it live
5. Click "Save"

#### How Banners Work
- Multiple banners rotate automatically
- Only shows between start and end dates
- Higher priority banners show first
- Inactive banners don't show

### Calendar Events

- Create school events
- Set event date and details
- Events show on public calendar

---

## Super Admin Features

Super Admins have all Admin features PLUS extra system controls.

### Admin User Management

#### Viewing Admins
- See all users who have admin role
- See who is super_admin vs regular admin

#### Promoting a User to Admin
1. Go to "Admin Users"
2. Click "Add Admin"
3. Search for a user
4. Select user and provide reason
5. Click "Promote"
6. User now has admin access

#### Demoting an Admin
1. Find the admin in the list
2. Click "Demote"
3. Provide reason
4. Click "Confirm"
5. User loses admin access

**Note:** Cannot demote a super_admin

### Audit Logs

Everything important that happens is logged.

#### What's Logged
- User logins
- Admin actions
- Student registrations
- Class changes
- Security events

#### Viewing Logs
- Filter by user, action, date
- Filter by severity (Info, Warning, Critical)
- Export to CSV file

### Security Monitoring

#### What You See
- Failed login attempts
- Unauthorized access attempts
- Rate limit violations
- Suspicious activities

#### Taking Action
- Emergency suspend a user
- Review security events
- Mark events as resolved

### System Configuration

#### Maintenance Mode
- Turn on maintenance mode (shows "under maintenance" message)
- Set maintenance message in English and Tamil
- Only admins can access during maintenance

#### Rate Limits
- Set how many logins allowed per minute
- Set how many API calls allowed
- Prevent abuse of the system

### Data Recovery

#### Deleted Data
- All deleted items are kept for 90 days
- View deleted students, classes, etc.
- Restore accidentally deleted items

#### Emergency Suspend User
- Immediately block a user's access
- Set suspension type (Warning, Temporary, Permanent)
- Lift suspension when resolved

### Data Export

- Export all system data
- Export specific collections (Users, Students, Classes)
- Download as files
- Links expire after 24 hours

### Feature Flags

#### What Are Feature Flags?
Feature flags let you turn features on or off for different user types without changing the code.

#### How It Works
1. Go to "Feature Flags" page
2. See features organized by role (Admin, Teacher, Parent)
3. Toggle each feature on/off
4. Click "Save Changes"

#### What Happens When You Disable a Feature
- That option disappears from user's navigation
- That tile card disappears from dashboard
- If user tries to access directly, they get an error
- Takes effect within 5 minutes (due to caching)

#### Available Feature Flags

**Admin Features:**
- Students
- Teachers
- Classes
- Grades
- Textbooks
- Volunteers
- AttendanceAnalytics
- HeroContent
- Calendar

**Teacher Features:**
- Classes
- Attendance
- Messaging

**Parent Features:**
- Students
- StudentRegistration
- Messaging
- Profile
- Settings

---

## Public Website

The public website is what anyone can see without logging in.

### Public Pages

| Page | What It Shows |
|------|---------------|
| **Home** | Welcome message, hero banners, Tamil verse of the day |
| **About** | Information about the school |
| **Calendar** | School events and schedule |
| **Contact** | Contact form and address |
| **Donate** | Donation information |
| **Team** | Team member profiles |
| **Textbooks** | Available textbooks by grade |
| **Documents** | Public documents and PDFs |
| **Classes** | Public class schedule |

### Language Support

- Every page available in English and Tamil
- Toggle button to switch languages
- Remembers your preference

### Hero Banners

- Big rotating banners at top of homepage
- Click through to events
- Managed by admins

### Thirukkural

- Shows a random Tamil verse daily
- Rotates through 1330 verses
- Shows English translation

---

## Common Test Scenarios

### Happy Path Tests (Things That Should Work)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Parent registers student | Login → Register Student → Fill form → Submit | Student shows as "Pending" |
| Teacher takes attendance | Login → Class → Mark Attendance → Save | Shows "Saved successfully" |
| Admin admits student | Login → Pending Review → Select student → Admit | Status changes to "Admitted" |
| Admin invites teacher | Login → Invite Teacher → Enter email → Send | "Invitation sent" message |

### Error Tests (Things That Should Fail Gracefully)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Wrong password | Enter wrong password | Shows "Invalid credentials" |
| Access without login | Go directly to /admin | Redirects to login page |
| Teacher edits old attendance | Try to edit from 8+ days ago | Shows "Cannot edit" message |
| Duplicate teacher invite | Invite same email twice | Shows "Already invited" error |

### Feature Flag Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Disable Students feature | Super Admin turns off "Students" for Admin | Students tiles/menu disappear |
| Disable Registration | Turn off "StudentRegistration" for Parent | Register button disappears |
| Re-enable feature | Turn feature back on | Option reappears (within 5 mins) |

---

## Quick Reference: Status Meanings

### Student Status
| Status | Meaning |
|--------|---------|
| Pending | Waiting for admin approval |
| Admitted | Approved, needs class assignment |
| Active | Enrolled and attending |
| Inactive | Not currently attending |
| Withdrawn | Officially removed |

### User Status
| Status | Meaning |
|--------|---------|
| Active | Can log in and use system |
| Pending | Account created, not fully set up |
| Suspended | Blocked from logging in |
| Inactive | Disabled account |

### Attendance Status
| Status | Meaning |
|--------|---------|
| Present | Student attended class |
| Absent | Student did not attend |
| Late | Student arrived late |
| Excused | Absent with valid reason |

---

## Need Help?

- **Technical Issues**: Contact system administrator
- **School Questions**: Contact school office
- **Bug Reports**: Report at https://github.com/gsdta/gsdta-web/issues

---

**This document is your guide for understanding how the GSDTA Tamil School system works. Use it when testing to verify the system behaves as described.**
