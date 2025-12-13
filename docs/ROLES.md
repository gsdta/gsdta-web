# Role-Based Access Control (RBAC)

**Last Updated**: December 2025

This document describes the role-based access control system for the GSDTA web application.

---

## Table of Contents

1. [Overview](#overview)
2. [Super Admin Role](#super-admin-role)
3. [Admin Role](#admin-role)
4. [Teacher Role](#teacher-role)
5. [Parent Role](#parent-role)
6. [Student Role](#student-role-future)
7. [Firestore Collections](#firestore-collections)
8. [Permission Matrix](#permission-matrix)
9. [UI Dashboard Layouts](#ui-dashboard-layouts)
10. [Implementation Phases](#implementation-phases)

---

## Overview

The application implements a hierarchical role-based access control system with the following roles:

- **Super Admin** - Highest privileges, can manage admins and system settings
- **Admin** - Manage users, content, and school operations (cannot add/remove other admins)
- **Teacher** - Invite-only role for instructors, manage classes and students
- **Parent** - Default role for new users, access to their children's information
- **Student** - (Future) Direct portal access for students

---

## Super Admin Role

Super Admins have the highest level of access and control over the entire system. They have all capabilities of regular admins plus elevated permissions.

### Key Characteristics

- **Onboarding**: First super admin seeded manually; can promote other admins
- **Routing**: UI routes to `/admin` (same as regular admin)
- **Distinguisher**: `roles: ['super_admin']` or `isSuperAdmin: true` flag

### Capabilities

#### Admin Management
- [ ] Promote users to admin role
- [ ] Demote admins to regular users
- [ ] View all admin activity logs
- [ ] Remove admin access

#### System Configuration
- [ ] Enable/disable maintenance mode
- [ ] Configure system-wide rate limits
- [ ] Manage API keys and integrations
- [ ] Configure email/SMS providers
- [ ] Set up backup schedules

#### Security & Audit
- [ ] View complete audit logs (all users, all actions)
- [ ] Export audit reports
- [ ] View failed login attempts
- [ ] Monitor API usage and anomalies
- [ ] Emergency account suspension (bypass normal workflow)

#### Disaster Recovery
- [ ] Rollback content changes
- [ ] Restore deleted users/data
- [ ] Database backup/restore controls
- [ ] Export complete system data

### Super Admin Operations

**Seed First Super Admin:**
```json
// Firestore: users/{uid}
{
  "email": "superadmin@gsdta.com",
  "roles": ["super_admin"],
  "status": "active",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

**Promote User to Admin:**
```
POST /api/v1/admin/promote
Body: { userId: "...", role: "admin" }
Authorization: Bearer <super-admin-id-token>
```

---

## Admin Role

Admins manage day-to-day school operations including users, content, and communications. They have extensive permissions but cannot manage other admins.

### Key Characteristics

- **Onboarding**: Promoted by super admin
- **Routing**: UI routes to `/admin`
- **Distinguisher**: `roles: ['admin']` (without super_admin flag)

### Capabilities

#### User Management - Teachers

- [x] Create teacher invites (already implemented)
- [x] View all teachers (list with search/filter)
- [ ] View teacher details (classes, students, activity)
- [ ] Edit teacher profile information
- [ ] Edit teacher contact details
- [ ] Update teacher qualifications/certifications
- [ ] Assign teachers to classes
- [ ] Reassign teachers between classes
- [ ] View teacher activity logs
- [ ] View teacher performance metrics

**Teacher Status Management:**
- [ ] Mark teacher as inactive (on leave, resigned)
- [ ] Mark teacher as active (rejoining after leave)
- [ ] Set inactive reason (leave of absence, resignation, terminated, etc.)
- [ ] Set inactive date and expected return date
- [ ] Reactivate teacher account
- [ ] View teacher status history
- [ ] Automatically unassign classes when marking inactive
- [ ] Reassign classes to substitute teachers
- [ ] Restore class assignments on reactivation
- [ ] Notify teachers of status changes

**Teacher Invite Management:**
- [ ] Resend invite links
- [ ] View invite history and status
- [ ] Cancel pending invites
- [ ] Extend invite expiration
- [ ] Revoke invite access

#### User Management - Students

**View & Search:**
- [ ] View all students (list with pagination)
- [ ] Search students by name
- [ ] Filter by grade, class, status, enrollment date
- [ ] Advanced search (parent name, teacher name)
- [ ] Sort by multiple fields
- [ ] Saved filter presets

**Create & Edit:**
- [ ] Add students manually (comprehensive form)
- [ ] Bulk import students (CSV upload with validation)
- [ ] Edit all student details:
  - [ ] Personal info (name, DOB, gender)
  - [ ] Grade and academic year
  - [ ] Contact information
  - [ ] Address details
  - [ ] Emergency contacts (multiple)
  - [ ] Medical information (allergies, conditions)
  - [ ] Dietary restrictions
  - [ ] Special needs/accommodations
  - [ ] Parent associations
  - [ ] Class assignments
  - [ ] Student photo
- [ ] View edit history (audit trail)
- [ ] Bulk edit (update grade, teacher, class for multiple students)

**Student Status Management:**
- [ ] Mark student as inactive (withdrawn, transferred)
- [ ] Mark student as active (rejoining)
- [ ] Set inactive reason (withdrawn, transferred, graduated, expelled, etc.)
- [ ] Set withdrawal/transfer date
- [ ] Reactivate student account
- [ ] View student status history
- [ ] Archive inactive students (move to alumni)
- [ ] Restore archived students
- [ ] Automatically unassign from classes when marking inactive
- [ ] Notify parents of status changes

**Student Academic Management:**
- [ ] Assign students to classes
- [ ] Transfer students between classes
- [ ] Unassign students from classes
- [ ] Bulk assign students to classes
- [ ] Graduate students to next grade
- [ ] Promote/retain students
- [ ] Link students to parent accounts
- [ ] Unlink parent-student relationships
- [ ] View student enrollment status
- [ ] Set enrollment date
- [ ] Set expected graduation date

**Student Reports & Data:**
- [ ] Generate comprehensive student reports
- [ ] Export student list (CSV, PDF, Excel)
- [ ] View student attendance history (all classes)
- [ ] View student grades/progress (all classes)
- [ ] View student behavioral records
- [ ] View student documents (birth cert, records, etc.)
- [ ] View student payment history
- [ ] View complete student timeline

#### User Management - Parents

- [ ] View all parents (list with search/filter)
- [ ] View parent details (linked students, contact info)
- [ ] Edit parent profile information
- [ ] Link parents to students (family associations)
- [ ] Unlink parent-student relationships
- [ ] View parent engagement metrics
- [ ] Suspend/activate parent accounts
- [ ] Send messages to specific parents
- [ ] Export parent contact list

#### User Management - General

- [ ] Global user search (across all roles)
- [ ] Advanced filters (status, role, date joined, activity)
- [ ] Bulk operations (bulk email, bulk status updates)
- [ ] View user activity timeline
- [ ] Export user data (GDPR compliance)
- [ ] Merge duplicate accounts

#### Website Content Management - Hero Section

**Default Behavior:**
- Thirukkural displays by default (bilingual: Tamil + English)
- Static client-side data (stored in `ui/src/data/thirukkural-data.ts`)
- Automatically rotates every ~8-13 seconds (random verses, 1330 total)
- No Firestore storage - all client-side for performance
- No admin management needed for Thirukkural rotation

**Event Banner with Carousel:**
When admin publishes an event banner, it alternates with Thirukkural in a sliding carousel (10s per slide).

- [x] Create event banner (upload image + bilingual text) - **✅ Complete**
- [x] Set event display period (start date/time → end date/time) - **✅ Complete**
- [x] Add event title and description (bilingual: Tamil + English) - **✅ Complete**
- [x] Add call-to-action button with text (bilingual) and link - **✅ Complete**
- [x] Set banner priority (if multiple concurrent events, show highest priority) - **✅ Complete**
- [x] Auto-slide carousel between event and Thirukkural (10s intervals) - **✅ Complete**
- [x] Manual slide navigation with indicators - **✅ Complete**
- [ ] Preview banner before publishing - **UI Future Enhancement**
- [x] Schedule banner activation (future start date) - **✅ Complete**
- [x] Auto-activate at start date/time - **✅ Complete**
- [x] Auto-deactivate at end date/time - **✅ Complete**
- [x] Show both event and Thirukkural in rotation - **✅ Complete**
- [x] Edit active event banners - **✅ Complete (via activate/deactivate)**
- [x] Deactivate event banner manually (before end date) - **✅ Complete**
- [ ] Duplicate event banner as template - **UI Future Enhancement**
- [x] View event banner history - **✅ Complete**

**Implementation Status**:
- ✅ **Backend**: API endpoints, security rules, tests, seeding - COMPLETE
- ✅ **UI**: Hook with caching, event banner component, admin page - COMPLETE
- ✅ **Carousel**: Auto-slide + manual navigation - COMPLETE (Dec 2025)
- ✅ **Caching**: 5-min TTL with real-time listeners - COMPLETE
- ✅ **Bilingual**: Tamil + English support - COMPLETE
- ✅ **Mobile**: Responsive design - COMPLETE
- 📝 See `/HERO-CONTENT-README.md` for carousel documentation

**Client Behavior:**
- Client checks Firestore for active event banners (where `isActive: true` and current time is between `startDate` and `endDate`)
- If active event banner exists → Show carousel alternating event banner and Thirukkural
- If no active event banner → Show Thirukkural only (static client-side rotation)
- Carousel auto-slides every 10 seconds, with manual navigation via indicators
- Cache event banner data with 5-minute TTL
- Real-time listener on `heroContent` collection to immediately show/hide event banners
- Force cache eviction when admin publishes/updates event banner

#### Website Content Management - News & Announcements (Flash News Marquee)

**Flash News Marquee:**
- [ ] Create flash news items (short text, bilingual: Tamil + English)
- [ ] Set display priority/order
- [ ] Set start and end dates (auto-show/hide)
- [ ] Mark as urgent (different styling/speed)
- [ ] Preview marquee before publishing
- [ ] Publish/unpublish toggle (immediate effect)
- [ ] Force cache eviction on publish
- [ ] Client-side caching with TTL (configurable)
- [ ] Automatic cache refresh when admin updates

**News Post Management:**
- [ ] Create detailed news items (title, body, rich text - bilingual)
- [ ] Add images to news posts
- [ ] Add links and attachments
- [ ] Categorize news (Events, Academic, Sports, etc.)
- [ ] Set priority level (low, normal, high, urgent)
- [ ] Set expiration dates (auto-hide after date)
- [ ] Pin important announcements to top
- [ ] Publish/unpublish toggle
- [ ] Schedule future publish date
- [ ] Draft mode (save without publishing)
- [ ] Preview news before publishing
- [ ] Edit published news
- [ ] Delete news (soft delete)
- [ ] View news analytics (views, clicks)
- [ ] Duplicate news template
- [ ] Bulk operations (publish multiple, expire multiple)

**Bilingual Content:**
- All news content must support Tamil + English
- Admin enters both languages during creation
- Client displays based on user's language preference
- Fallback to English if Tamil translation missing
- [ ] Archive old news
- [ ] View news analytics (views, engagement)
- [ ] Approve/reject teacher-submitted news

#### Website Content Management - School Calendar

- [ ] Add calendar events (title, date/time, location)
- [ ] Set event types (Holiday, Meeting, Sports, Academic, Other)
- [ ] Set event descriptions (rich text)
- [ ] Create recurring events (weekly, monthly)
- [ ] Set custom recurrence patterns
- [ ] Color code events by type
- [ ] Attach documents to events (PDFs, images)
- [ ] Set event visibility (public vs. internal-only)
- [ ] Send event reminders (email, SMS, push)
- [ ] View event RSVPs
- [ ] Export calendar (iCal format)
- [ ] Sync with Google Calendar
- [ ] Edit/delete calendar events
- [ ] Approve/reject teacher-suggested events
- [ ] Bulk import events (CSV)

#### Website Content Management - Static Pages

- [ ] Edit "About Us" page
- [ ] Edit "Contact" page  
- [ ] Edit "Programs" page
- [ ] Edit "Staff" page
- [ ] Create custom pages
- [ ] Rich text editor with formatting
- [ ] Add images/videos to pages
- [ ] SEO settings (meta title, description)
- [ ] Page visibility controls
- [ ] Preview before publishing

#### Website Content Management - Media Library

- [ ] Upload images
- [ ] Upload documents (PDF, DOCX)
- [ ] Upload videos
- [ ] Organize media in folders
- [ ] Tag media for easy search
- [ ] Search media library
- [ ] View media usage (where it's used)
- [ ] Delete unused media
- [ ] Bulk upload media
- [ ] View storage usage
- [ ] Image optimization and resizing
- [ ] Generate thumbnails

#### Website Content Management - Photo Galleries

- [ ] Create photo galleries
- [ ] Upload photos to galleries
- [ ] Organize photos in albums
- [ ] Set gallery visibility (public/internal)
- [ ] Add captions to photos
- [ ] Download galleries
- [ ] Share gallery links

#### Communication Tools

- [ ] Send announcements to all users
- [ ] Target announcements by role (parents, teachers)
- [ ] Target announcements by grade
- [ ] Target announcements by class
- [ ] Send email announcements
- [ ] Send SMS announcements
- [ ] Send in-app notifications
- [ ] Send push notifications (mobile)
- [ ] Schedule announcements for future
- [ ] Create announcement templates
- [ ] Use merge fields in templates (name, grade, etc.)
- [ ] Track announcement delivery status
- [ ] Track announcement read status
- [ ] Resend announcements
- [ ] Archive sent announcements

#### Class Management

- [x] Create classes (IMPLEMENTED Dec 2025)
- [x] Edit class details (name, grade, day, time, capacity) (IMPLEMENTED Dec 2025)
- [x] Set class schedule (day, time) (IMPLEMENTED Dec 2025)
- [x] Assign teachers to classes (primary + assistants) (IMPLEMENTED Dec 2025)
- [ ] Assign students to classes
- [x] Set class capacity limits (IMPLEMENTED Dec 2025)
- [ ] View class rosters
- [ ] Transfer students between classes
- [x] Deactivate/reactivate classes (soft delete) (IMPLEMENTED Dec 2025)
- [x] Set academic year per class (IMPLEMENTED Dec 2025)
- [ ] Bulk assign students to classes

**Grade Management** (IMPLEMENTED Dec 2025):
- [x] View all grades (11 grades: ps-1, ps-2, kg, grade-1 through grade-8)
- [x] Edit grade display name and order
- [x] Activate/deactivate grades
- [x] Seed default grades

#### Reports & Analytics

**User Metrics:**
- [ ] Total users by role
- [ ] New signups over time (chart)
- [ ] Active vs. inactive users
- [ ] User engagement metrics
- [ ] Login frequency by user
- [ ] Role distribution

**Content Metrics:**
- [ ] Most viewed pages
- [ ] Most clicked announcements
- [ ] News engagement (views, time spent)
- [ ] Calendar event participation
- [ ] Download statistics

**Academic Metrics:**
- [ ] Attendance rates by class
- [ ] Attendance trends over time
- [ ] Grade distribution
- [ ] Student progress reports

**System Health:**
- [ ] API usage statistics
- [ ] Error rates and logs
- [ ] Storage usage
- [ ] Performance metrics (page load times)
- [ ] Email delivery rates

**Export Options:**
- [ ] Export reports as PDF
- [ ] Export reports as CSV
- [ ] Schedule automated reports
- [ ] Email reports to stakeholders

#### Annual Assessment Results Publishing

**Results Compilation:**
- [ ] View all final grades by grade level
- [ ] View all final grades by class
- [ ] View all final grades by teacher
- [ ] Filter results by academic year/term
- [ ] Review grade completion status
- [ ] Identify missing grades or incomplete data
- [ ] Generate grade statistics and summaries

**Publish Annual Results:**
- [ ] Publish results for all grades at once
- [ ] Publish results for selected grades (e.g., only Grade 5, 8, 12)
- [ ] Publish results grade-by-grade
- [ ] Set publication date and time
- [ ] Schedule results for future publication
- [ ] Preview results before publishing
- [ ] Require admin approval before publishing

**Grade-wise Publishing:**
- [ ] Select specific grades to publish (multi-select)
- [ ] Publish kindergarten results separately
- [ ] Publish elementary grades (K-5)
- [ ] Publish middle school grades (6-8)
- [ ] Publish high school grades (9-12)
- [ ] Publish results for graduating class first
- [ ] Stagger publication by grade level

**Publication Controls:**
- [ ] Lock grades before publishing (prevent teacher edits)
- [ ] Send notification to parents when results published
- [ ] Send notification to teachers when results published
- [ ] Make results visible on parent portal
- [ ] Make results visible on public website (optional, anonymized)
- [ ] Download published results (PDF, Excel)
- [ ] Generate result analytics (pass rates, distribution, etc.)

**Published Results Management:**
- [ ] View publication history
- [ ] View who published what and when
- [ ] Unpublish results (with reason/justification)
- [ ] Republish corrected results
- [ ] Send correction notifications
- [ ] Archive published results by year
- [ ] Compare results across years

**Public Results Display:**
- [ ] Publish school-wide pass rates
- [ ] Publish grade-wise pass rates
- [ ] Publish subject-wise performance
- [ ] Publish topper lists (with consent)
- [ ] Publish achievement awards
- [ ] Display grade distributions (anonymized)
- [ ] Set visibility controls (public vs. internal)
- [ ] Generate press release summaries

**Results Analytics:**
- [ ] Compare year-over-year performance
- [ ] Grade-wise performance trends
- [ ] Subject-wise performance analysis
- [ ] Teacher-wise performance comparison
- [ ] Identify improvement areas
- [ ] Generate board presentation reports
- [ ] Export results for accreditation

### Admin Dashboard Routes

**Layout & Navigation** (✅ Implemented Dec 2025):
- ✅ Header navigation with dropdown menus for Teachers, Classes, Content
- ✅ Two-pane layout: Left sidebar for section navigation, right pane for content
- ✅ Mobile-responsive with hamburger menu
- ✅ Active section and page highlighting
- ✅ Centralized Protected wrapper in layout
- 📝 See `/ADMIN-LAYOUT-CHANGES.md` for implementation details

```
/admin
├── /dashboard              - Overview, stats, recent activity
├── /users
│   ├── /teachers           - Teacher management
│   │   ├── /list           - ✅ All teachers with filters (IMPLEMENTED)
│   │   ├── /invite         - ✅ Send teacher invites (IMPLEMENTED)
│   │   ├── /:id            - Teacher details
│   │   ├── /:id/edit       - Edit teacher profile
│   │   └── /inactive       - Inactive/archived teachers
│   ├── /students           - Student management
│   │   ├── /list           - All students with filters
│   │   ├── /add            - Add new student
│   │   ├── /import         - Bulk import students
│   │   ├── /:id            - Student details
│   │   ├── /:id/edit       - Edit student profile
│   │   ├── /inactive       - Inactive/archived students
│   │   └── /promote        - Bulk promote to next grade
│   ├── /parents            - Parent management
│   │   ├── /list           - All parents with filters
│   │   ├── /:id            - Parent details
│   │   └── /inactive       - Inactive parents
│   └── /search             - Global user search
├── /content
│   ├── /hero               - ✅ Hero section editor (IMPLEMENTED)
│   ├── /news               - News/announcements
│   ├── /pages              - Static page editor
│   ├── /media              - Media library
│   └── /galleries          - Photo galleries
├── /calendar               - Calendar management
├── /grades                 - ✅ Grade management (IMPLEMENTED Dec 2025)
├── /classes                - ✅ Class management (IMPLEMENTED Dec 2025)
│   ├── /                   - All classes with grade filter
│   ├── /create             - Create new class
│   └── /[id]/edit          - Edit class & manage teachers
├── /communications         - Send announcements
├── /reports                - Analytics and reports
│   ├── /students           - Student reports
│   ├── /attendance         - Attendance reports
│   ├── /academic           - Academic performance reports
│   └── /analytics          - System analytics
├── /results                - Annual results management
│   ├── /review             - Review all final grades
│   ├── /publish            - Publish annual results
│   │   ├── /all            - Publish all grades
│   │   ├── /select         - Select grades to publish
│   │   └── /history        - Publication history
│   ├── /public             - Public results display settings
│   └── /analytics          - Results analytics and trends
└── /settings               - Admin settings
```

---

## Parent Role

Parents can access public content and, after sign-in, parent-specific pages. Parent is the default role for a first-time user created at sign-in per policy.

### Key Characteristics

- **Signup**: Simple signup process (email/Google)
- **Onboarding**: First sign-in auto-creates a parent profile in Firestore
- **Profile Completion**: **Forced profile update on first login if incomplete**
- **Routing**: UI routes parents to `/parent` after sign-in (or `/parent/profile/complete` if incomplete)
- **Access**: Public site pages and parent area

### Authentication & Session

**Mock mode (local/test):**
- Role selected via UI mock and persisted in session

**Firebase mode:**
- Sign in with Google or Email/Password
- UI fetches `GET /api/v1/me` to resolve roles and status
- Checks profile completion status
- Redirects to profile completion if required

### Relevant API Endpoints

- `GET /api/v1/me` - Returns uid, email, roles, status, emailVerified, profileComplete
- `GET /api/v1/parent/profile` - Get complete parent profile
- `PUT /api/v1/parent/profile` - Update parent profile
- `POST /api/v1/parent/profile/complete` - Mark profile as complete

### Capabilities

#### Profile Management

**Edit Parent Profile (REQUIRED ON FIRST LOGIN):**
- [ ] View current profile
- [ ] Edit personal information:
  - [ ] First name (required)
  - [ ] Last name (required)
  - [ ] Phone number (required)
  - [ ] Alternate phone number
  - [ ] Profile photo
- [ ] Edit address details:
  - [ ] Street address (required)
  - [ ] City (required)
  - [ ] State (required)
  - [ ] ZIP code (required)
  - [ ] Country
- [ ] Set preferred contact method
- [ ] Set preferred language
- [ ] Update emergency contact information
- [ ] View profile completion status
- [ ] Validate required fields before saving

**Profile Completion Flow:**
- [ ] Detect incomplete profile on login
- [ ] Show profile completion modal/page (blocking)
- [ ] Highlight required fields
- [ ] Validate data before allowing access
- [ ] Mark profile as complete
- [ ] Allow optional fields to be skipped
- [ ] Auto-save draft progress

**Close Account:**
- [ ] Request account closure
- [ ] Confirm account closure (multi-step verification)
- [ ] Soft delete parent account (mark as inactive)
- [ ] Retain student data (unlink parent association)
- [ ] Send confirmation email
- [ ] Specify closure reason (optional)
- [ ] Set effective closure date
- [ ] Download all personal data before closure (GDPR)
- [ ] Notify admins of account closure

#### Children/Student Management

**Add Children:**
- [ ] Add new child (manual entry)
- [ ] Fill comprehensive child form:
  - [ ] First name, last name (required)
  - [ ] Date of birth (required)
  - [ ] Gender
  - [ ] Grade
  - [ ] Current school (if transferring)
  - [ ] Student photo
  - [ ] Medical information (allergies, conditions)
  - [ ] Emergency contacts
  - [ ] Special needs/accommodations
- [ ] Check for existing student by name + DOB
- [ ] If duplicate detected, show existing record
- [ ] Option to reactivate existing (inactive) student
- [ ] Update existing student details on reactivation
- [ ] Link reactivated student to parent account
- [ ] Auto-create Google Drive folder structure on add
- [ ] Send confirmation notification on add

**Edit Children:**
- [ ] View list of linked children
- [ ] Edit child details:
  - [ ] Personal information (limited fields)
  - [ ] Medical information
  - [ ] Emergency contacts
  - [ ] Dietary restrictions
  - [ ] Special needs updates
  - [ ] Student photo
- [ ] Request admin approval for critical changes (name, DOB, grade)
- [ ] View edit history
- [ ] Update Google Drive folder if grade changes

**Delete/Remove Children:**
- [ ] Soft delete child from parent account (unlink)
- [ ] Specify removal reason:
  - [ ] Graduated
  - [ ] Transferred to another school
  - [ ] No longer enrolled
  - [ ] Other (specify)
- [ ] Confirm deletion (multi-step verification)
- [ ] Mark student as inactive in backend
- [ ] Retain student data in system
- [ ] Unlink parent-student association
- [ ] Notify admin of removal
- [ ] Option to archive Google Drive folder

**Reactivate Children:**
- [ ] View previously removed children
- [ ] Reactivate child if rejoining school
- [ ] Update child details on reactivation
- [ ] Re-link to parent account
- [ ] Restore Google Drive folder access
- [ ] Notify school admin of reactivation

#### Student Academic Information

**View Current Year Assessments:**
- [ ] View ongoing assessments published by teachers
- [ ] Filter by child/class/subject
- [ ] View assessment details (name, type, date, max score)
- [ ] View assessment scores (if graded)
- [ ] View teacher feedback/comments
- [ ] View assessment rubrics
- [ ] Track assessment completion status
- [ ] View upcoming assessments
- [ ] **Scope**: Current academic year only
- [ ] Download assessment reports

**View Final Assessment Results:**
- [ ] View all published final results (all years)
- [ ] Filter by child
- [ ] Filter by academic year
- [ ] Filter by term (mid-term, final, annual)
- [ ] View grade-wise results
- [ ] View subject-wise performance
- [ ] View overall GPA/percentage
- [ ] View class rank (if enabled)
- [ ] View teacher comments
- [ ] View attendance summary
- [ ] Download report cards (PDF)
- [ ] Compare results across years
- [ ] View grade distribution charts
- [ ] **Historical Access**: All years available

**Progress Tracking:**
- [ ] View real-time grade updates
- [ ] Track assignment completion
- [ ] View attendance trends
- [ ] Monitor academic progress over time
- [ ] View strengths and areas for improvement
- [ ] Set learning goals (with teacher collaboration)
- [ ] Receive alerts for low grades or missing assignments

#### Homework Submission (Google Drive Integration)

**Upload Homework:**
- [ ] Select child
- [ ] Select subject/class
- [ ] Select assignment (from teacher's list)
- [ ] Upload homework files (PDF, images, documents)
- [ ] Add submission notes/comments
- [ ] Preview uploaded files
- [ ] Submit homework
- [ ] Receive submission confirmation
- [ ] View submission timestamp
- [ ] Edit/resubmit before deadline (if allowed)

**Google Drive Integration:**
- [ ] Auto-create folder structure on child enrollment:
  ```
  Student Name/
  ├── Grade 1/
  │   ├── Week 1/
  │   ├── Week 2/
  │   ├── ...
  │   └── Week 32/
  ├── Grade 2/
  │   ├── Week 1/
  │   ├── ...
  │   └── Week 32/
  ├── ...
  └── Grade 8/
      ├── Week 1/
      ├── ...
      └── Week 32/
  ```
- [ ] Create folders for grades 1-8
- [ ] Create 32 week folders per grade
- [ ] Upload homework to appropriate week folder
- [ ] Auto-detect current grade and week
- [ ] Organize by subject within week folder
- [ ] Set proper permissions (parent + teachers + admin)
- [ ] Generate shareable links
- [ ] Sync with parent's Google account
- [ ] Handle grade promotion (move to next grade folder)

**Homework Management:**
- [ ] View uploaded homework history
- [ ] Filter by child/grade/week/subject
- [ ] Download previously uploaded homework
- [ ] Delete uploaded homework (before teacher review)
- [ ] View teacher feedback on homework
- [ ] View homework grades/scores
- [ ] Track homework completion rate
- [ ] Receive reminders for pending homework
- [ ] View upcoming homework deadlines

**Google Drive Folder Management:**
- [ ] View folder structure
- [ ] Access student's Drive folder directly
- [ ] Share folder with specific people (with approval)
- [ ] View folder storage usage
- [ ] Request additional storage if needed
- [ ] Archive old grade folders
- [ ] Download entire folder as ZIP

#### Communication

- [ ] Message assigned teachers
- [ ] Reply to teacher messages
- [ ] View message history
- [ ] View announcements (filtered for their students' grades)
- [ ] Receive email notifications
- [ ] Receive SMS notifications (opt-in)
- [ ] Receive in-app notifications
- [ ] Receive push notifications (mobile app)
- [ ] Mark messages as read/unread
- [ ] Archive old conversations
- [ ] Set notification preferences

#### Calendar & Events

- [ ] View school calendar
- [ ] Filter calendar by student's grade/class
- [ ] View event details
- [ ] RSVP to events (Yes/No/Maybe)
- [ ] Add events to personal calendar (iCal export)
- [ ] Sync with Google Calendar
- [ ] Receive event reminders
- [ ] View past events
- [ ] Download event attachments

#### Payments & Fees

- [ ] View payment history
- [ ] View outstanding balances
- [ ] Pay tuition fees
- [ ] Pay activity fees
- [ ] Pay enrollment fees
- [ ] Select payment method (credit card, bank transfer)
- [ ] Save payment methods securely
- [ ] Set up auto-pay
- [ ] Download receipts
- [ ] Download annual statements
- [ ] View payment due dates
- [ ] Receive payment reminders

#### Resources & Documents

- [ ] Access class materials shared by teachers
- [ ] Download forms and documents
- [ ] View school handbook
- [ ] View school policies
- [ ] Download lunch menu
- [ ] Download school calendar PDF
- [ ] Access parent resources
- [ ] View FAQs

#### News & Announcements

- [ ] View all announcements
- [ ] Filter announcements by category
- [ ] View pinned announcements
- [ ] Read news articles
- [ ] View photo galleries
- [ ] Share announcements (if public)
- [ ] Mark announcements as read

#### Personal Profile

- [ ] Update profile information
- [ ] Update contact details (phone, email, address)
- [ ] Update emergency contacts
- [ ] Update profile photo
- [ ] Manage linked students
- [ ] Set notification preferences
- [ ] Change password
- [ ] Enable two-factor authentication
- [ ] View login history

### Parent Dashboard Routes

```
/parent
├── /dashboard              - Overview, announcements, upcoming events
├── /profile                - Profile settings
│   ├── /edit               - Edit profile (required on first login)
│   ├── /complete           - Complete profile (forced if incomplete)
│   └── /close              - Close account
├── /children               - Manage children
│   ├── /list               - All my children
│   ├── /add                - Add new child
│   ├── /:id                - Child details
│   ├── /:id/edit           - Edit child information
│   ├── /:id/remove         - Remove/unlink child
│   ├── /inactive           - Previously removed children
│   └── /reactivate/:id     - Reactivate removed child
├── /students/:id           - Individual child academic portal
│   ├── /overview           - Summary (grades, attendance, homework)
│   ├── /attendance         - Attendance history
│   ├── /assessments        - Current year assessments
│   │   ├── /ongoing        - Ongoing assessments
│   │   └── /completed      - Completed assessments
│   ├── /results            - Final assessment results (all years)
│   │   ├── /current        - Current year results
│   │   ├── /history        - Historical results (all years)
│   │   └── /compare        - Compare across years
│   ├── /homework           - Homework management
│   │   ├── /upload         - Upload homework
│   │   ├── /submitted      - Submitted homework history
│   │   ├── /pending        - Pending submissions
│   │   └── /drive          - Access Google Drive folder
│   ├── /schedule           - Class schedule
│   └── /progress           - Academic progress tracking
├── /calendar               - School calendar with RSVP
├── /payments               - Tuition and fees
│   ├── /history            - Payment history
│   ├── /pay                - Make a payment
│   └── /receipts           - Download receipts
├── /messages               - Teacher communications
├── /documents              - Forms and resources
└── /announcements          - News and updates
```

**Key Features per Route:**

- **Profile/Complete**: Blocking modal/page until all required fields filled, validates data, highlights missing fields
- **Children/Add**: Duplicate detection by name+DOB, option to reactivate inactive student, auto-creates Google Drive structure
- **Students/:id/Homework/Upload**: Auto-detects grade and week, uploads to correct Drive folder, shows preview, confirmation
- **Students/:id/Homework/Drive**: Direct link to student's organized Google Drive folder with grade/week structure
- **Students/:id/Results/History**: Access to all years' results, compare performance across years
- **Students/:id/Assessments**: Current academic year only, real-time updates from teachers

---

## Student Role (Future)

Direct portal access for students to engage with their learning.

### Capabilities (Planned)

#### Academic

- [ ] View class schedule
- [ ] View assignments
- [ ] Submit assignments online
- [ ] View grades
- [ ] Download class materials
- [ ] Access learning resources
- [ ] View feedback from teachers
- [ ] Track academic progress

#### Communication

- [ ] Message teachers
- [ ] View class announcements
- [ ] Participate in class discussions (moderated)
- [ ] Receive notifications

#### Calendar

- [ ] View personal schedule
- [ ] View assignment due dates
- [ ] View school events
- [ ] Set reminders

#### Profile

- [ ] View profile
- [ ] Update avatar/photo
- [ ] View achievements/badges
- [ ] View attendance record

### Student Dashboard Routes (Planned)

```
/student
├── /dashboard              - Overview, assignments, grades
├── /classes                - My classes
│   └── /classes/:id        - Class details, materials
├── /assignments            - View and submit assignments
├── /grades                 - View grades and progress
├── /calendar               - My schedule and events
├── /messages               - Teacher communications
└── /profile                - Profile settings
```

---

## Teacher Role

Teachers gain access via an invitation issued by an Admin. After accepting the invite, teachers are routed to the teacher experience in the UI.

### Key Characteristics

- **Onboarding**: Invite-only via unique token (emailed or shared out-of-band)
- **Acceptance**: User must sign in and the signed-in email must match the invite email
- **Routing**: UI routes teachers to `/teacher` once the role is present

### Invite Flow (Already Implemented)

#### 1. Verify Invite (Public)

```
GET /api/v1/invites/verify?token=...
```

**Purpose**: Check if an invite token is valid and usable

**Returns**: Invite details when usable
- `id` - Invite ID
- `email` - Invited email address
- `role` - Role being granted (typically "teacher")
- `status` - Invite status
- `expiresAt` - Expiration timestamp

**Rate Limiting**: 20 requests/min/IP

**Test Mode**: Accepts `test-*` tokens

#### 2. Accept Invite (Authenticated)

```
POST /api/v1/invites/accept
Body: { token: "..." }
Authorization: Bearer <firebase-id-token>
```

**Purpose**: Accept an invite and add the role to the user's profile

**Requirements**:
- Valid Firebase ID token
- Signed-in email must match invite email
- User profile status must be `active`

**Actions**:
- Adds the invited role to user profile
- Marks the invite as accepted

**Rate Limiting**: 10 requests/min/IP

### Authentication & Session

**Mock mode (local/test):**
- Role can be simulated in the UI
- E2E tests verify the verification page and invalid-token behaviors

**Firebase mode:**
- Sign in with Google or Email/Password
- UI calls `GET /api/v1/me` to resolve roles/status and route accordingly

### Capabilities

#### Class Management

- [ ] View assigned classes
- [ ] View class schedules
- [ ] View class locations
- [ ] View class capacity and enrollment
- [ ] Post class announcements
- [ ] Share class materials (PDFs, links, videos)
- [ ] Organize materials by topic/date
- [ ] Create class calendar events
- [ ] View class performance metrics

#### Student Management

**View & Search:**
- [ ] View complete student roster for assigned classes
- [ ] Search students by name
- [ ] Filter students by grade/class
- [ ] View student profiles (photo, contact, emergency info)
- [ ] View student schedules
- [ ] View student enrollment status

**Edit Student Details:**
- [ ] Edit student contact information
- [ ] Update student emergency contacts
- [ ] Add/update student photos
- [ ] Add student notes (behavior, learning style, etc.)
- [ ] Update student medical information (allergies, conditions)
- [ ] Update dietary restrictions
- [ ] Flag special needs or accommodations
- [ ] Update parent contact preferences

**Note**: Teachers can only edit students assigned to their classes. Cannot change core details (name, DOB, grade, enrollment status).

#### Attendance Management

**Daily Attendance:**
- [ ] Record daily attendance for all classes
- [ ] Quick entry mode (mark all present, then exceptions)
- [ ] Bulk attendance entry (entire class at once)
- [ ] Mark students as: Present, Absent, Late, Excused
- [ ] Record late arrival time
- [ ] Add attendance notes per student
- [ ] Edit attendance (same day only)
- [ ] View real-time attendance status

**Attendance History & Reports:**
- [ ] View attendance history by student
- [ ] View attendance history by class
- [ ] View attendance patterns and trends
- [ ] Generate attendance reports (daily, weekly, monthly)
- [ ] Export attendance data (CSV, PDF)
- [ ] View attendance statistics (% present, late, absent)
- [ ] Identify students with poor attendance
- [ ] Flag chronic absenteeism

**Attendance Notifications:**
- [ ] Auto-notify parents of absences
- [ ] Send attendance summaries to parents (weekly)
- [ ] View attendance notification history

#### Assessment & Grading

**Record Assessments:**
- [ ] Create assignments (homework, quiz, test, project)
- [ ] Set assignment details (name, type, due date, max score)
- [ ] Set assignment weights and categories
- [ ] Post grades for individual students
- [ ] Post grades for entire class (bulk entry)
- [ ] Add grading rubrics
- [ ] Record extra credit
- [ ] Record participation scores

**Manage Grades:**
- [ ] View gradebook (all students, all assignments)
- [ ] Edit posted grades (with audit trail)
- [ ] Delete grades (with reason/approval)
- [ ] Import grades from CSV
- [ ] Export grades to CSV
- [ ] Calculate weighted averages
- [ ] Apply grade curves
- [ ] Set grading scale (A, B, C, etc.)

**Grade Analytics:**
- [ ] View grade distribution (histogram)
- [ ] View class average by assignment
- [ ] View student grade trends over time
- [ ] Identify students at risk (failing, declining)
- [ ] Compare student performance to class average
- [ ] View assignment completion rates

**Feedback & Comments:**
- [ ] Add detailed feedback per assignment
- [ ] Add general progress comments
- [ ] Use comment templates/snippets
- [ ] Attach files to feedback
- [ ] Private notes (not visible to parents)

#### Student Reports & Progress

**Generate Reports:**
- [ ] Generate individual student progress reports
- [ ] Generate class progress reports
- [ ] Create custom report cards
- [ ] Generate mid-term reports
- [ ] Generate end-of-term reports
- [ ] Include narrative comments
- [ ] Include attendance summary
- [ ] Include grade breakdown

**View Student Progress:**
- [ ] View student academic history
- [ ] View all grades and assignments
- [ ] View attendance record
- [ ] View behavioral notes
- [ ] View parent-teacher communication history
- [ ] Track student improvement over time
- [ ] View student strengths and weaknesses

**Progress Monitoring:**
- [ ] Set learning goals per student
- [ ] Track progress toward goals
- [ ] Flag students needing intervention
- [ ] Schedule parent conferences for at-risk students
- [ ] Document intervention strategies
- [ ] Monitor intervention effectiveness

#### Publish Final Results

**End-of-Term Process:**
- [ ] Review all grades for completeness
- [ ] Calculate final grades (weighted average)
- [ ] Assign letter grades
- [ ] Write final comments/narratives
- [ ] Preview report cards before publishing
- [ ] Submit grades for admin review (if required)
- [ ] Publish final grades to parents
- [ ] Lock grades after publishing (no further edits)

**Report Cards:**
- [ ] Generate final report cards
- [ ] Include term summary
- [ ] Include attendance summary  
- [ ] Include teacher comments
- [ ] Include recommendations for next term
- [ ] Preview before sending to parents
- [ ] Publish report cards (make visible to parents)
- [ ] Send notification when published
- [ ] Download report cards (PDF)

**Grade Finalization:**
- [ ] Submit final grades by deadline
- [ ] View submission status
- [ ] Request grade change after publishing (with justification)
- [ ] View published grade history
- [ ] Archive grades for past terms

**Promotion/Retention:**
- [ ] Recommend student for promotion
- [ ] Flag student for retention
- [ ] Provide justification/notes
- [ ] Submit recommendation to admin

#### Content Contribution

- [ ] Submit news items (pending admin approval)
- [ ] Suggest calendar events (pending admin approval)
- [ ] Upload teaching materials to shared library
- [ ] Create class-specific resources
- [ ] Share external learning resources

#### Communication

- [ ] Message parents of students in their classes
- [ ] Reply to parent inquiries
- [ ] View communication history with parents
- [ ] Send class-wide announcements
- [ ] Schedule meeting requests
- [ ] View parent contact information
- [ ] Mark messages as read/unread
- [ ] Archive old conversations

#### Reports & Analytics

- [ ] Generate class attendance reports
- [ ] View attendance trends and patterns
- [ ] Generate student progress reports
- [ ] Generate class performance reports
- [ ] Export class roster (CSV, PDF)
- [ ] Export grade data (CSV, PDF)
- [ ] View grade distribution for class
- [ ] View assignment completion rates
- [ ] Create and export report cards
- [ ] View parent engagement metrics
- [ ] Generate term summary reports
- [ ] Compare class performance across terms

#### Personal Profile

- [ ] Update profile information
- [ ] Update profile photo
- [ ] Set notification preferences
- [ ] View own schedule
- [ ] Manage personal calendar

### Teacher Dashboard Routes

```
/teacher
├── /dashboard              - Overview, upcoming classes, recent activity
├── /classes                - My classes list
│   └── /classes/:id        - Individual class details
│       ├── /roster         - Student list with quick actions
│       ├── /attendance     - Attendance tracking and history
│       ├── /gradebook      - Gradebook with all assignments
│       ├── /assignments    - Create/manage assignments
│       ├── /materials      - Class materials and resources
│       └── /analytics      - Class performance metrics
├── /students               - All my students across classes
│   └── /students/:id       - Individual student details
│       ├── /overview       - Summary (grades, attendance, notes)
│       ├── /grades         - Student grade history
│       ├── /attendance     - Student attendance history
│       ├── /progress       - Progress tracking
│       ├── /edit           - Edit student information
│       └── /reports        - Generate student reports
├── /attendance             
│   ├── /today              - Quick daily attendance entry
│   ├── /history            - Attendance history and reports
│   └── /reports            - Generate attendance reports
├── /gradebook              
│   ├── /entry              - Grade entry (by class or assignment)
│   ├── /assignments        - Manage all assignments
│   ├── /reports            - Grade reports and analytics
│   └── /publish            - Publish final grades/report cards
├── /reports
│   ├── /progress           - Student progress reports
│   ├── /report-cards       - Generate/publish report cards
│   ├── /attendance         - Attendance reports
│   └── /class-summary      - Class summary reports
├── /materials              - Teaching materials library
├── /messages               - Parent communications
├── /schedule               - My teaching schedule
└── /profile                - Profile settings
```

**Key Features per Route:**

- **Dashboard**: Quick access to today's classes, pending tasks (grading, attendance), recent parent messages, alerts
- **Attendance/Today**: Optimized for rapid entry (touch/tap interface, keyboard shortcuts, bulk actions)
- **Gradebook/Entry**: Spreadsheet-like interface, inline editing, bulk operations, import/export
- **Reports/Report-Cards**: Preview mode, batch generation, publish to multiple parents, track delivery
- **Students/:id/Edit**: Only editable fields shown, validation, audit trail, admin approval for sensitive changes

---

## Admin Role

Admins manage teacher invitations and have elevated privileges for operational tasks.

### Key Characteristics

- **Onboarding**: Seeded manually for the first admin; subsequent admins can be granted via Firestore or future UI
- **Capabilities**: 
  - Create teacher invites
  - Perform operational updates (suspend users, etc.)
- **Routing**: UI routes admins to `/admin` once the role is present

### Invite Management

#### Create Invite (Admin-Only)

```
POST /api/v1/invites
Authorization: Bearer <firebase-id-token>
Body: {
  email: "teacher@example.com",
  role: "teacher",           // Optional, defaults to 'teacher'
  expiresInHours: 168        // Optional, defaults to 7 days
}
```

**Requirements**:
- Valid Firebase ID token
- User must have `admin` role

**Rate Limiting**: 30 requests/hour/IP

**Actions**:
- Generates unique invite token
- Stores invite in `roleInvites` collection
- Sets expiration timestamp

#### Verify and Accept Endpoints

Shared with teacher flow (see Teacher Role section above)

### Security

- API enforces token verification and role checks via reusable guard
- CORS allow-list is enforced
- Rate limiting applied to invite endpoints

### Operations (Manual v1)

#### Seed First Admin

1. Create Auth user (Firebase Console or CLI)
2. Set Firestore document `users/{uid}`:
   ```json
   {
     "email": "admin@gsdta.com",
     "roles": ["admin"],
     "status": "active",
     "createdAt": "<timestamp>",
     "updatedAt": "<timestamp>"
   }
   ```

#### Suspend User

Update Firestore document `users/{uid}`:
```json
{
  "status": "suspended"
}
```

### Future Enhancements

- Admin UI for invite lifecycle management
- User search and filtering
- Role management interface
- Audit logs for admin actions

---

## Role Assignment Flow

### New User (Default: Parent)

```
1. User signs in with Google/Email
2. API checks if user document exists in Firestore
3. If not exists:
   - Create user document with role: ['parent']
   - Set status: 'active'
4. Return user profile to UI
5. UI routes to /parent
```

### Teacher Onboarding

```
1. Admin creates invite via POST /api/v1/invites
2. Teacher receives invite token (email or link)
3. Teacher visits invite link with token
4. UI calls GET /api/v1/invites/verify?token=...
5. Teacher signs in (or creates account)
6. UI calls POST /api/v1/invites/accept with token
7. API adds 'teacher' role to user profile
8. UI routes to /teacher
```

### Admin Onboarding

```
1. Manual seeding (first admin):
   - Create Firebase Auth user
   - Create Firestore user document with role: ['admin']
2. Subsequent admins:
   - Existing admin updates Firestore to add 'admin' role
   - Or future admin management UI
```

---

## API Role Guards

The API uses a reusable guard system to protect endpoints:

### Guard Implementation

```typescript
// Pseudo-code
async function requireRole(idToken: string, allowedRoles: string[]) {
  // 1. Verify Firebase ID token
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  
  // 2. Fetch user profile from Firestore
  const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
  const user = userDoc.data();
  
  // 3. Check status
  if (user.status !== 'active') {
    throw new Error('User not active');
  }
  
  // 4. Check role
  const hasRole = user.roles.some(role => allowedRoles.includes(role));
  if (!hasRole) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}
```

### Usage Examples

```typescript
// Admin-only endpoint
app.post('/api/v1/invites', async (req, res) => {
  const user = await requireRole(req.headers.authorization, ['admin']);
  // ... create invite
});

// Teacher or Admin endpoint
app.get('/api/v1/classes', async (req, res) => {
  const user = await requireRole(req.headers.authorization, ['teacher', 'admin']);
  // ... fetch classes
});
```

---

## UI Routing

### Route Protection

The UI implements client-side route guards based on the user's role:

```typescript
// Simplified routing logic
function determineRoute(user: User): string {
  if (!user.roles || user.status !== 'active') {
    return '/signin';
  }
  
  if (user.roles.includes('admin')) {
    return '/admin';
  }
  
  if (user.roles.includes('teacher')) {
    return '/teacher';
  }
  
  if (user.roles.includes('parent')) {
    return '/parent';
  }
  
  return '/'; // Default to home
}
```

### Protected Routes

| Route | Allowed Roles | Description |
|-------|--------------|-------------|
| `/` | All | Public home page |
| `/signin` | All | Sign-in page |
| `/parent` | parent, teacher, admin | Parent dashboard |
| `/teacher` | teacher, admin | Teacher dashboard |
| `/admin` | admin | Admin dashboard |
| `/invites/accept?token=...` | All (authenticated) | Accept invite page |

---

## Firestore Schema

### users Collection

```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;            // User's email
  roles: string[];          // Array of roles: ['parent'], ['teacher'], ['admin'], etc.
  status: string;           // 'active' | 'suspended'
  emailVerified: boolean;   // From Firebase Auth
  createdAt: Timestamp;     // User creation timestamp
  updatedAt: Timestamp;     // Last update timestamp
  metadata?: {              // Optional metadata
    displayName?: string;
    photoURL?: string;
    // ... other fields
  };
}
```

### roleInvites Collection

```typescript
{
  id: string;               // Auto-generated invite ID
  token: string;            // Unique invite token (UUID)
  email: string;            // Invited email address
  role: string;             // Role to grant (e.g., 'teacher')
  status: string;           // 'pending' | 'accepted' | 'expired'
  createdAt: Timestamp;     // Invite creation timestamp
  expiresAt: Timestamp;     // Expiration timestamp
  createdBy: string;        // UID of admin who created invite
  acceptedAt?: Timestamp;   // When invite was accepted (if accepted)
  acceptedBy?: string;      // UID of user who accepted (if accepted)
}
```

---

## Security Considerations

### Authentication

- All protected routes require valid Firebase ID token
- Tokens are verified on every API request
- Token expiration is enforced (1 hour default)

### Authorization

- Role checks are performed on every protected endpoint
- Status checks ensure only active users can perform actions
- Multiple roles can be assigned to a single user

### Rate Limiting

- Invite verification: 20 requests/min/IP
- Invite acceptance: 10 requests/min/IP
- Invite creation: 30 requests/hour/IP

### Email Verification

- Email verification can be enforced for sensitive operations
- Currently optional but recommended for production

### Invite Token Security

- Tokens are UUIDs (cryptographically random)
- Tokens expire after configured time (default: 7 days)
- Tokens can only be used once
- Email must match between invite and signed-in user

---

## Testing

### Mock Mode (Local Development)

The application supports a mock authentication mode for local development:

```typescript
// Set in environment
NEXT_PUBLIC_AUTH_MODE=mock

// UI allows selecting role without Firebase
// API bypasses Firebase verification
// Test invite tokens accepted (test-*)
```

### Test Invite Tokens

For E2E testing, the API accepts special test tokens:

- `test-valid-teacher` - Valid teacher invite
- `test-expired` - Expired invite
- `test-invalid` - Invalid token format

### E2E Test Coverage

- ✅ Teacher invite verification page
- ✅ Invalid token handling
- ✅ Invite acceptance flow
- ✅ Role-based routing
- ✅ Access denied scenarios

---

## Future Enhancements

### Admin Features
- [ ] Admin UI for invite management
- [ ] User search and filtering
- [ ] Bulk invite creation
- [ ] Invite analytics and reporting
- [ ] Role hierarchy management
- [ ] Audit logging

### Teacher Features
- [ ] Teacher dashboard
- [ ] Class management
- [ ] Student roster
- [ ] Teaching materials library
- [ ] Communication tools

### Parent Features
- [ ] Student enrollment
- [ ] Progress tracking
- [ ] Payment integration
- [ ] Communication with teachers

### System Improvements
- [ ] Workload Identity Federation (replace service account keys)
- [ ] Advanced rate limiting (per user, not just IP)
- [ ] Role expiration and renewal
- [ ] Multi-tenancy support
- [ ] Fine-grained permissions system

---

## Related Documentation

- [PROJECT-STATUS.md](PROJECT-STATUS.md) - Current project status and features
- [INFRASTRUCTURE-SETUP.md](INFRASTRUCTURE-SETUP.md) - Infrastructure setup guide
- [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) - Production deployment checklist

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Maintained By**: GSDTA Development Team

---

## Firestore Collections

### users Collection (Existing - Enhanced)

```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;            // User's email
  roles: string[];          // ['parent'], ['teacher'], ['admin'], ['super_admin']
  status: string;           // 'active' | 'inactive' | 'suspended' | 'pending'
  emailVerified: boolean;   // From Firebase Auth
  createdAt: Timestamp;     // User creation timestamp
  updatedAt: Timestamp;     // Last update timestamp
  
  // Profile information
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  alternatePhone?: string;
  
  // Address (required for parents)
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  
  // Profile completion (for parents)
  profileComplete?: boolean;        // True if all required fields filled
  profileCompletedAt?: Timestamp;   // When profile was completed
  requiredFields?: string[];        // List of fields that are required
  
  // Inactive status tracking (for teachers/parents)
  inactiveInfo?: {
    markedInactiveAt: Timestamp;
    inactiveReason: string;     // 'leave_of_absence' | 'resigned' | 'terminated' | 'other'
    expectedReturnDate?: Timestamp;
    notes?: string;             // Admin notes about inactive status
    markedInactiveBy: string;   // Admin UID who marked inactive
  };
  
  // Reactivation tracking
  reactivationHistory?: Array<{
    reactivatedAt: Timestamp;
    reactivatedBy: string;      // Admin UID
    notes?: string;
  }>;
  
  // Additional metadata
  metadata?: {
    preferredLanguage?: string;
    timezone?: string;
    lastLoginAt?: Timestamp;
    loginCount?: number;
  };
  
  // Notification preferences
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}
```

### students Collection (New)

```typescript
{
  id: string;               // Auto-generated student ID
  firstName: string;
  lastName: string;
  dateOfBirth: Timestamp;
  grade: string;            // 'K', '1', '2', ..., '12'
  gender?: string;
  
  // Relationships
  parentIds: string[];      // Array of parent user IDs
  teacherIds: string[];     // Array of assigned teacher IDs
  classIds: string[];       // Array of enrolled class IDs
  
  // Status
  status: string;           // 'active' | 'inactive' | 'alumni' | 'pending'
  enrollmentDate: Timestamp;
  graduationDate?: Timestamp;
  
  // Inactive status tracking
  inactiveInfo?: {
    markedInactiveAt: Timestamp;
    inactiveReason: string;     // 'withdrawn' | 'transferred' | 'graduated' | 'expelled' | 'other'
    withdrawalDate?: Timestamp;
    transferSchool?: string;    // Name of school transferred to
    notes?: string;             // Admin notes
    markedInactiveBy: string;   // Admin UID
  };
  
  // Reactivation tracking
  reactivationHistory?: Array<{
    reactivatedAt: Timestamp;
    reactivatedBy: string;      // Admin UID
    notes?: string;
  }>;
  
  // Contact & Emergency
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  
  // Medical & Special Needs
  metadata?: {
    photoUrl?: string;
    allergies?: string[];
    medicalConditions?: string[];
    specialNeeds?: string;
    dietaryRestrictions?: string[];
  };
  
  // Documents
  documents?: {
    birthCertificate?: string;  // Storage URL
    immunizationRecords?: string;
    otherDocuments?: string[];
  };
  
  createdBy: string;        // Admin UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### classes Collection (New)

```typescript
{
  id: string;               // Auto-generated class ID
  name: string;             // "Math 101", "English Literature"
  grade: string;            // 'K', '1', '2', ..., '12'
  subject?: string;         // 'Math', 'Science', 'English', etc.
  teacherId: string;        // Primary teacher UID
  
  // Schedule
  schedule: Array<{
    dayOfWeek: number;      // 0 (Sunday) - 6 (Saturday)
    startTime: string;      // "09:00"
    endTime: string;        // "10:30"
  }>;
  
  location: string;         // "Room 101", "Gym", "Online"
  academicYear: string;     // "2025-2026"
  semester?: string;        // "Fall", "Spring", "Full Year"
  
  // Enrollment
  studentIds: string[];     // Array of enrolled student IDs
  capacity: number;
  
  // Status
  status: string;           // 'active' | 'inactive' | 'archived'
  startDate: Timestamp;
  endDate: Timestamp;
  
  // Additional info
  description?: string;
  syllabus?: string;        // Storage URL or rich text
  materials?: string[];     // Array of material URLs
  
  createdBy: string;        // Admin UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### content Collection (New)

```typescript
{
  id: string;               // Auto-generated content ID
  type: string;             // 'hero' | 'news' | 'page' | 'announcement'
  
  // Content
  title: string;
  subtitle?: string;
  body?: string;            // Rich text HTML
  excerpt?: string;         // Short summary
  
  // Media
  imageUrl?: string;
  videoUrl?: string;
  attachments?: string[];   // Array of document URLs
  
  // Categorization
  category?: string;        // 'Events', 'Academic', 'Sports', etc.
  tags?: string[];
  
  // Publishing
  status: string;           // 'draft' | 'published' | 'scheduled' | 'archived'
  publishDate?: Timestamp;
  expiryDate?: Timestamp;
  publishedAt?: Timestamp;
  
  // Display
  priority: number;         // 0 (lowest) - 10 (highest)
  isPinned: boolean;
  visibility: string;       // 'public' | 'internal'
  
  // Versioning
  version: number;
  previousVersionId?: string;
  
  // SEO (for public pages)
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  
  // Analytics
  views?: number;
  lastViewedAt?: Timestamp;
  
  // Authorship
  createdBy: string;        // Admin UID
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}
```

### calendar Collection (New)

```typescript
{
  id: string;               // Auto-generated event ID
  title: string;
  description: string;
  
  // Timing
  startDate: Timestamp;
  endDate: Timestamp;
  isAllDay: boolean;
  
  // Location
  location?: string;
  locationUrl?: string;     // Google Maps link, Zoom link, etc.
  
  // Categorization
  type: string;             // 'holiday' | 'meeting' | 'sports' | 'academic' | 'other'
  category?: string;
  color?: string;           // Hex color for calendar display
  
  // Visibility & Targeting
  visibility: string;       // 'public' | 'internal'
  targetRoles?: string[];   // ['parent', 'teacher'] or empty for all
  targetGrades?: string[];  // ['K', '1', '2'] or empty for all
  
  // Recurrence
  recurrence?: {
    frequency: string;      // 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number;       // Every N days/weeks/months
    daysOfWeek?: number[];  // For weekly: [1, 3, 5] = Mon, Wed, Fri
    endDate?: Timestamp;
    exceptions?: Timestamp[]; // Dates to skip
  };
  
  // Attachments & Links
  attachments?: string[];   // Document URLs
  externalLinks?: Array<{
    title: string;
    url: string;
  }>;
  
  // RSVPs
  rsvpsEnabled: boolean;
  rsvps?: {
    [userId: string]: {
      status: string;       // 'yes' | 'no' | 'maybe'
      respondedAt: Timestamp;
    };
  };
  
  // Reminders
  reminderSent?: boolean;
  reminderDate?: Timestamp;
  
  // Approval workflow
  approvalStatus?: string;  // 'pending' | 'approved' | 'rejected'
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  createdBy: string;        // Admin or Teacher UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### announcements Collection (New)

```typescript
{
  id: string;               // Auto-generated announcement ID
  title: string;
  body: string;             // Rich text HTML
  
  // Targeting
  targetRoles: string[];    // ['parent', 'teacher'] or ['all']
  targetGrades?: string[];  // Filter by student grades
  targetClasses?: string[]; // Specific class IDs
  
  // Priority & Status
  priority: string;         // 'low' | 'normal' | 'high' | 'urgent'
  status: string;           // 'draft' | 'sent' | 'scheduled'
  
  // Delivery
  channels: string[];       // ['email', 'sms', 'push', 'in-app']
  scheduledFor?: Timestamp;
  sentAt?: Timestamp;
  
  // Tracking
  recipientCount: number;
  deliveredCount: number;
  readBy: {
    [userId: string]: Timestamp;
  };
  
  // Attachments
  attachments?: string[];
  
  createdBy: string;        // Admin UID
  createdAt: Timestamp;
}
```

### messages Collection (New)

```typescript
{
  id: string;               // Auto-generated message ID
  threadId: string;         // Group related messages
  
  // Participants
  senderId: string;
  recipientId: string;
  
  // Content
  subject: string;
  body: string;
  attachments?: string[];
  
  // Status
  status: string;           // 'sent' | 'delivered' | 'read'
  readAt?: Timestamp;
  
  // Context
  contextType?: string;     // 'student' | 'class' | 'general'
  contextId?: string;       // Student ID or Class ID
  
  // Reply thread
  inReplyTo?: string;       // Parent message ID
  
  createdAt: Timestamp;
}
```

### payments Collection (New)

```typescript
{
  id: string;               // Auto-generated payment ID
  
  // Parties
  parentId: string;
  studentId?: string;       // Optional link to student
  
  // Amount
  amount: number;
  currency: string;         // 'USD'
  
  // Payment details
  type: string;             // 'tuition' | 'enrollment' | 'activity' | 'late_fee' | 'other'
  description: string;
  academicYear?: string;
  
  // Payment processing
  paymentMethod: string;    // 'credit_card' | 'bank_transfer' | 'cash' | 'check'
  status: string;           // 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  
  // Dates
  dueDate: Timestamp;
  paidAt?: Timestamp;
  refundedAt?: Timestamp;
  
  // Documentation
  receiptUrl?: string;
  invoiceNumber?: string;
  
  // Auto-pay
  isAutoPay?: boolean;
  autoPaySetupId?: string;
  
  // Notes
  notes?: string;
  internalNotes?: string;   // Admin-only notes
  
  createdBy: string;        // Admin UID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### attendance Collection (New)

```typescript
{
  id: string;               // Auto-generated attendance ID
  
  // References
  studentId: string;
  classId: string;
  teacherId: string;
  
  // Attendance info
  date: Timestamp;          // Date of class
  status: string;           // 'present' | 'absent' | 'late' | 'excused'
  
  // Additional info
  arrivalTime?: string;     // For late arrivals
  notes?: string;           // Teacher notes
  
  // Recorded by
  recordedBy: string;       // Teacher UID
  recordedAt: Timestamp;
  
  // Parent notification
  parentNotified: boolean;
  notifiedAt?: Timestamp;
}
```

### grades Collection (New)

```typescript
{
  id: string;               // Auto-generated grade ID
  
  // References
  studentId: string;
  classId: string;
  teacherId: string;
  
  // Grade info
  assignmentName: string;
  assignmentType: string;   // 'homework' | 'quiz' | 'test' | 'project' | 'participation'
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade?: string;     // 'A', 'B+', etc.
  
  // Dates
  assignedDate: Timestamp;
  dueDate: Timestamp;
  submittedDate?: Timestamp;
  gradedDate: Timestamp;
  
  // Feedback
  feedback?: string;        // Teacher comments
  
  // Status
  status: string;           // 'graded' | 'pending' | 'late' | 'missing'
  
  // Weights (for GPA calculation)
  weight?: number;
  category?: string;
  
  // Recorded by
  recordedBy: string;       // Teacher UID
  recordedAt: Timestamp;
  updatedAt: Timestamp;
}
```

### media Collection (New)

```typescript
{
  id: string;               // Auto-generated media ID
  filename: string;
  originalFilename: string;
  url: string;              // Firebase Storage URL
  
  // File info
  type: string;             // 'image' | 'document' | 'video' | 'audio'
  mimeType: string;
  size: number;             // bytes
  
  // Organization
  folder: string;           // '/hero', '/news', '/classes', etc.
  tags: string[];
  description?: string;
  
  // Usage tracking
  usageCount: number;
  usedIn: Array<{
    type: string;           // 'content', 'class', 'announcement'
    id: string;
  }>;
  
  // Image-specific (if applicable)
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnailUrl?: string;
  
  // Uploaded by
  uploadedBy: string;       // User UID
  uploadedAt: Timestamp;
}
```

### auditLog Collection (New)

```typescript
{
  id: string;               // Auto-generated log ID
  
  // Actor
  userId: string;
  userRole: string;
  userEmail: string;
  
  // Action
  action: string;           // 'create' | 'update' | 'delete' | 'login' | 'invite' | etc.
  resource: string;         // 'user' | 'student' | 'class' | 'content' | etc.
  resourceId: string;
  
  // Details
  details: {
    changes?: {             // For updates
      field: string;
      oldValue: any;
      newValue: any;
    }[];
    metadata?: any;
  };
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  timestamp: Timestamp;
}
```

### publishedResults Collection (New)

```typescript
{
  id: string;               // Auto-generated publication ID
  
  // Publication info
  academicYear: string;     // "2024-2025"
  term: string;             // "First Term", "Second Term", "Final", "Annual"
  publicationType: string;  // 'all' | 'selected_grades' | 'single_grade'
  
  // Grades included in publication
  grades: string[];         // ['K', '1', '2'] or ['all']
  
  // Publication status
  status: string;           // 'draft' | 'scheduled' | 'published' | 'unpublished'
  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  scheduledFor?: Timestamp;
  
  // Results data reference
  resultsSnapshot: {
    totalStudents: number;
    totalClasses: number;
    gradeWiseResults: {
      [grade: string]: {
        totalStudents: number;
        passCount: number;
        failCount: number;
        passPercentage: number;
        averageScore?: number;
        gradeDistribution?: {
          [letterGrade: string]: number;
        };
      };
    };
  };
  
  // Public display settings
  publicDisplay?: {
    enabled: boolean;
    showPassRates: boolean;
    showGradeDistribution: boolean;
    showToppers: boolean;      // With student consent
    anonymized: boolean;
  };
  
  // Notifications
  notificationsSent: boolean;
  notifiedAt?: Timestamp;
  notificationCount?: number;
  
  // Lock status
  gradesLocked: boolean;
  lockedAt?: Timestamp;
  
  // Publication metadata
  publishedBy: string;      // Admin UID
  notes?: string;           // Admin notes
  
  // Unpublish info (if applicable)
  unpublishInfo?: {
    reason: string;
    unpublishedBy: string;
    unpublishedAt: Timestamp;
    notes?: string;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### homework Collection (New)

```typescript
{
  id: string;               // Auto-generated homework submission ID
  
  // Student & Parent info
  studentId: string;
  parentId: string;        // Parent who uploaded
  
  // Class & Assignment info
  classId: string;
  teacherId: string;
  assignmentId?: string;    // Link to teacher's assignment (if applicable)
  subject: string;          // Math, Science, English, etc.
  
  // Academic context
  grade: string;            // Student's grade at time of submission
  academicYear: string;     // "2024-2025"
  week: number;             // Week number (1-32)
  
  // Submission details
  title: string;            // Homework title/description
  description?: string;     // Parent's notes/comments
  submittedAt: Timestamp;
  
  // Google Drive integration
  driveFileId: string;      // Google Drive file ID
  driveFileUrl: string;     // Direct link to file
  driveFolderId: string;    // Parent folder ID (Grade X / Week Y)
  fileName: string;
  fileType: string;         // PDF, image, document, etc.
  fileSize: number;         // bytes
  
  // Status
  status: string;           // 'submitted' | 'reviewed' | 'graded' | 'returned'
  
  // Teacher feedback
  teacherFeedback?: {
    comment: string;
    reviewedAt: Timestamp;
    reviewedBy: string;     // Teacher UID
    grade?: number;
    maxGrade?: number;
  };
  
  // Resubmission tracking
  isResubmission: boolean;
  originalSubmissionId?: string;
  resubmissionReason?: string;
  
  updatedAt: Timestamp;
}
```

### googleDriveFolders Collection (New)

```typescript
{
  id: string;               // Auto-generated ID
  
  // Student info
  studentId: string;
  studentName: string;
  
  // Parent info
  parentId: string;
  
  // Drive folder structure
  rootFolderId: string;     // Top-level student folder
  rootFolderUrl: string;
  
  // Grade-level folders
  gradeFolders: {
    [grade: string]: {      // "1", "2", "3", ... "8"
      folderId: string;
      folderUrl: string;
      weekFolders: {
        [week: string]: {   // "1", "2", "3", ... "32"
          folderId: string;
          folderUrl: string;
        };
      };
    };
  };
  
  // Permissions
  sharedWith: Array<{
    email: string;
    role: string;           // 'viewer' | 'editor' | 'writer'
    type: string;           // 'parent' | 'teacher' | 'admin'
  }>;
  
  // Status
  status: string;           // 'active' | 'archived'
  currentGrade: string;     // Current active grade
  
  // Metadata
  totalFiles: number;
  totalSize: number;        // Total storage used (bytes)
  lastUploadAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Permission Matrix

| Feature | Super Admin | Admin | Teacher | Parent | Student |
|---------|------------|-------|---------|--------|---------|
| **Admin Management** |
| Promote/demote admins | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs (all) | ✅ | Own actions | ❌ | ❌ | ❌ |
| System configuration | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** |
| Manage teachers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark teachers inactive/active | ✅ | ✅ | ❌ | ❌ | ❌ |
| View inactive teachers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reactivate teachers | ✅ | ✅ | ❌ | ❌ | ❌ |
| View students (all) | ✅ | ✅ | Assigned only | Own children | ❌ |
| Create/delete students | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit student details (all fields) | ✅ | ✅ | Limited (contact, notes) | ❌ | ❌ |
| Mark students inactive/active | ✅ | ✅ | ❌ | ❌ | ❌ |
| View inactive students | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reactivate students | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bulk import students | ✅ | ✅ | ❌ | ❌ | ❌ |
| Graduate/promote students | ✅ | ✅ | Recommend only | ❌ | ❌ |
| Manage parents | ✅ | ✅ | View assigned | ❌ | ❌ |
| Mark parents inactive/active | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Parent Self-Management** |
| Edit own profile | ✅ | ✅ | ✅ | ✅ (required) | ❌ |
| Complete profile (forced) | ❌ | ❌ | ❌ | ✅ (on first login) | ❌ |
| Close own account | ❌ | ❌ | ❌ | ✅ (soft delete) | ❌ |
| Add children | ❌ | ✅ (admin action) | ❌ | ✅ | ❌ |
| Edit own children | ✅ | ✅ | ❌ | ✅ (limited fields) | ❌ |
| Remove/unlink children | ❌ | ✅ | ❌ | ✅ (soft delete) | ❌ |
| Reactivate children | ❌ | ✅ | ❌ | ✅ (if inactive) | ❌ |
| View inactive children | ❌ | ✅ | ❌ | ✅ (own only) | ❌ |
| **Content Management** |
| Edit hero section | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish news | ✅ | ✅ | Submit (pending approval) | ❌ | ❌ |
| Manage calendar | ✅ | ✅ | Suggest (pending approval) | View + RSVP | View |
| Edit static pages | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage media library | ✅ | ✅ | Upload | ❌ | ❌ |
| **Communications** |
| Send announcements (all) | ✅ | ✅ | Own students only | ❌ | ❌ |
| Message parents | ✅ | ✅ | Assigned parents | ❌ | ❌ |
| Message teachers | ✅ | ✅ | ❌ | ✅ | ✅ (future) |
| **Academic - Attendance** |
| Record attendance | ✅ | ✅ | ✅ (own classes) | ❌ | ❌ |
| Edit attendance (same day) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit attendance (past) | ✅ | ✅ | Request approval | ❌ | ❌ |
| View attendance history | ✅ | ✅ | Own classes | Own children | Own (future) |
| Generate attendance reports | ✅ | ✅ | ✅ (own classes) | ❌ | ❌ |
| **Academic - Grades** |
| Create assignments | ✅ | ✅ | ✅ (own classes) | ❌ | ❌ |
| Post grades | ✅ | ✅ | ✅ (own classes) | ❌ | ❌ |
| Edit grades (before publish) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit grades (after publish) | ✅ | ✅ | Request approval | ❌ | ❌ |
| View all grades | ✅ | ✅ | Own classes | Own children | Own (future) |
| Publish final grades | ✅ | ✅ | ✅ (own classes) | ❌ | ❌ |
| **Academic - Reports** |
| Generate progress reports | ✅ | ✅ | ✅ (own students) | View only | View (future) |
| Generate report cards | ✅ | ✅ | ✅ (own students) | View only | View (future) |
| Publish report cards | ✅ | ✅ | ✅ (own students) | ❌ | ❌ |
| Edit published report cards | ✅ | ✅ (with reason) | Request approval | ❌ | ❌ |
| **Class Management** |
| Create/delete classes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage own classes | ✅ | ✅ | ✅ (materials, announcements) | ❌ | ❌ |
| Assign students to classes | ✅ | ✅ | Request (pending approval) | ❌ | ❌ |
| **Financial** |
| Process payments | ✅ | ✅ | ❌ | Make payment | ❌ |
| View payment history | ✅ | ✅ | ❌ | Own payments | ❌ |
| **Reports & Analytics** |
| System analytics | ✅ | ✅ | ❌ | ❌ | ❌ |
| Class performance reports | ✅ | ✅ | ✅ (own classes) | ❌ | ❌ |
| Student progress tracking | ✅ | ✅ | ✅ (assigned students) | Own children | Own (future) |
| Export data | ✅ | ✅ | Own data | Own data | Own data (future) |
| **Annual Results Publishing** |
| Review all final grades | ✅ | ✅ | Own classes only | ❌ | ❌ |
| Publish results (all grades) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish results (selected grades) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lock grades before publishing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Unpublish/republish results | ✅ | ✅ (with reason) | ❌ | ❌ | ❌ |
| View published results | ✅ | ✅ | Own classes | Own children (all years) | Own (future) |
| Publish public results display | ✅ | ✅ | ❌ | View only | View only |
| Results analytics (year-over-year) | ✅ | ✅ | Limited | ❌ | ❌ |
| **Homework & Google Drive** |
| Upload homework | ❌ | ❌ | ❌ | ✅ (own children) | ✅ (future) |
| View homework submissions | ✅ | ✅ | ✅ (own students) | ✅ (own children) | Own (future) |
| Grade homework | ✅ | ✅ | ✅ | ❌ | ❌ |
| Access student Google Drive | ✅ | ✅ | ✅ (assigned students) | ✅ (own children) | Own (future) |
| Manage Drive folder structure | ✅ | ✅ | View only | View only | View only |
| Create Drive folders (auto) | ✅ (system) | ✅ (system) | ❌ | Automatic on child add | ❌ |
| **Assessments** |
| View current year assessments | ✅ | ✅ | ✅ (own classes) | ✅ (own children) | Own (future) |
| View historical assessments | ✅ | ✅ | ✅ (own classes) | ❌ (current year only) | ❌ |
| View final results (all years) | ✅ | ✅ | ✅ (own classes) | ✅ (own children) | Own (future) |

---

## Implementation Phases

### Phase 1: Foundation & Admin Management (Weeks 1-4)
- [ ] Super admin vs. regular admin role separation
- [ ] Admin promotion/demotion API endpoints
- [ ] Enhanced user management UI
  - [ ] Teacher list with search/filter
  - [ ] Student CRUD operations
  - [ ] Parent management
- [ ] Audit logging system
- [ ] Basic admin dashboard

### Phase 2: Content Management System (Weeks 5-8)
- [x] Admin portal layout with header navigation and sidebar - **✅ Complete (Dec 2025)**
- [x] Hero section editor with real-time preview - **✅ Complete**
- [x] Hero section carousel (event + Thirukkural rotation) - **✅ Complete (Dec 2025)**
- [ ] News/announcement system
  - [ ] Rich text editor integration
  - [ ] Image upload and management
  - [ ] Publish/schedule/draft workflow
- [ ] Calendar management
  - [ ] Event CRUD operations
  - [ ] Recurring events
  - [ ] RSVP system
- [ ] Media library
  - [ ] File upload (images, documents)
  - [ ] Folder organization
  - [ ] Usage tracking
- [ ] Static page editor

### Phase 3: Class & Academic Management (Weeks 9-12)
- [ ] Class creation and management
- [ ] Teacher-class assignments
- [ ] Student-class enrollment
- [ ] Attendance tracking system
  - [ ] Daily attendance entry (teacher)
  - [ ] Attendance reports
  - [ ] Parent notifications
- [ ] Grade posting system
  - [ ] Assignment grades
  - [ ] Report cards
  - [ ] Grade analytics

### Phase 4: Communication Tools (Weeks 13-16)
- [ ] Announcement system with targeting
  - [ ] Role-based targeting
  - [ ] Grade/class filtering
  - [ ] Email integration (SendGrid/AWS SES)
  - [ ] SMS integration (Twilio)
  - [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Messaging system
  - [ ] Teacher-parent messaging
  - [ ] Thread management
  - [ ] Read receipts
  - [ ] Attachment support
- [ ] Notification preferences UI

### Phase 5: Parent Portal (Weeks 17-20)
- [ ] Student registration/enrollment flow
  - [ ] Multi-step form
  - [ ] Document uploads
  - [ ] Digital signatures
- [ ] Student dashboard
  - [ ] View grades
  - [ ] View attendance
  - [ ] View schedule
- [ ] Calendar integration
  - [ ] View school calendar
  - [ ] RSVP to events
  - [ ] Export to iCal
- [ ] Resource access
  - [ ] Download documents
  - [ ] View class materials

### Phase 6: Payment Integration (Weeks 21-24)
- [ ] Stripe integration
  - [ ] Payment intent creation
  - [ ] Webhook handling
  - [ ] Customer management
- [ ] Payment UI
  - [ ] Payment form
  - [ ] Saved payment methods
  - [ ] Auto-pay setup
- [ ] Invoice/receipt generation
- [ ] Payment history and reporting
- [ ] Payment reminders

### Phase 7: Teacher Portal Enhancements (Weeks 25-28)
- [ ] Class management dashboard
- [ ] Attendance entry UI
  - [ ] Quick entry for all students
  - [ ] Bulk operations
- [ ] Grade posting UI
  - [ ] Gradebook view
  - [ ] Bulk grade import
- [ ] Student roster management
- [ ] Class materials upload
- [ ] Parent communication interface

### Phase 8: Advanced Features (Weeks 29-32)
- [ ] Advanced analytics dashboard
  - [ ] User engagement metrics
  - [ ] Academic performance trends
  - [ ] Financial reports
- [ ] Bulk operations
  - [ ] Bulk user import (CSV)
  - [ ] Bulk email sending
  - [ ] Bulk grade import
- [ ] Approval workflows
  - [ ] Content approval (teacher-submitted)
  - [ ] Registration approval
- [ ] Mobile app (React Native)
  - [ ] Parent app
  - [ ] Teacher app

### Phase 9: Optimization & Polish (Weeks 33-36)
- [ ] Performance optimization
- [ ] SEO improvements
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Multi-language support
- [ ] Advanced caching
- [ ] Progressive Web App (PWA) features
- [ ] Comprehensive E2E testing
- [ ] Load testing and optimization

### Phase 10: Student Portal (Future)
- [ ] Student login system
- [ ] View assignments
- [ ] Submit assignments online
- [ ] View grades
- [ ] Message teachers
- [ ] Download materials
- [ ] View schedule

---

## Notes & Considerations

### Content Approval Workflow
- Teachers can submit news/events that require admin approval
- Implement a review queue in admin dashboard
- Email notifications to admins when new content submitted
- Version control for tracking changes

### Multi-language Support
- Store content translations in subcollections
- Language selector in user profile
- Default to English, support Spanish, Hindi, etc.
- Use i18n library (next-intl for Next.js)

### Notification Preferences
- Let users control which notifications they receive
- Channel preferences (email, SMS, push, in-app)
- Frequency settings (immediate, daily digest, weekly)
- Opt-out options per notification type

### Rate Limiting
- Prevent abuse of announcement system
- Limit bulk operations
- API rate limits per role
- Monitor and alert on unusual activity

### Data Export (GDPR Compliance)
- Users can request data export
- Automated export process
- Include all personal data and activity
- Support deletion requests

### Backup & Recovery
- Daily Firestore backups
- Point-in-time recovery
- Test recovery procedures quarterly
- Document recovery steps

### Security Best Practices
- Regular security audits
- Dependency updates
- Firebase security rules reviews
- Penetration testing
- OWASP Top 10 compliance

---

