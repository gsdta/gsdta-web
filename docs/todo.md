# GSDTA Web Application - Pending Features

**Last Updated**: December 27, 2025
**Purpose**: Comprehensive list of all pending features extracted from requirements.md and roles.md

---

## Table of Contents

1. [Super Admin (Remaining)](#1-super-admin-remaining)
2. [Admin - Teacher Management](#2-admin---teacher-management)
3. [Admin - Student Management](#3-admin---student-management)
4. [Admin - Parent Management](#4-admin---parent-management)
5. [Website Content Management](#5-website-content-management)
6. [Communication Tools](#6-communication-tools)
7. [Class Management (Advanced)](#7-class-management-advanced)
8. [Reports & Analytics](#8-reports--analytics)
9. [Annual Assessment Results Publishing](#9-annual-assessment-results-publishing)
10. [Parent Portal Features](#10-parent-portal-features)
11. [Teacher Portal Features](#11-teacher-portal-features)
12. [Student Portal (Future)](#12-student-portal-future)
13. [Mobile App](#13-mobile-app)
14. [Infrastructure & Platform](#14-infrastructure--platform)

---

## 1. Super Admin (Remaining)

### System Configuration (Future)
- [ ] Manage API keys and integrations
- [ ] Configure email/SMS providers

### Disaster Recovery (Future)
- [ ] Rollback content changes
- [ ] Database backup/restore controls

---

## 2. Admin - Teacher Management

### View & Search (Partial - needs enhancement)
- [ ] View teacher details (classes, students, activity)
- [ ] Edit teacher profile information
- [ ] Edit teacher contact details
- [ ] Update teacher qualifications/certifications
- [ ] Assign teachers to classes (bulk assignment page)
- [ ] Reassign teachers between classes
- [ ] View teacher activity logs
- [ ] View teacher performance metrics

### Teacher Status Management
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

### Teacher Invite Management
- [ ] Resend invite links
- [ ] View invite history and status
- [ ] Cancel pending invites
- [ ] Extend invite expiration
- [ ] Revoke invite access

---

## 3. Admin - Student Management

### View & Search
- [ ] View all students (list with pagination) - enhanced version
- [ ] Search students by name - enhanced
- [ ] Filter by grade, class, status, enrollment date - enhanced
- [ ] Advanced search (parent name, teacher name)
- [ ] Sort by multiple fields
- [ ] Saved filter presets

### Create & Edit
- [ ] Add students manually (comprehensive form)
- [x] Bulk import students (CSV upload with validation) ✅ Implemented
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

### Student Status Management
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

### Student Academic Management
- [x] Assign students to classes ✅ Implemented
- [ ] Transfer students between classes
- [ ] Unassign students from classes
- [x] Bulk assign students to classes ✅ Implemented
- [ ] Graduate students to next grade
- [ ] Promote/retain students
- [ ] Link students to parent accounts
- [ ] Unlink parent-student relationships
- [ ] View student enrollment status
- [ ] Set enrollment date
- [ ] Set expected graduation date

### Student Reports & Data
- [ ] Generate comprehensive student reports
- [ ] Export student list (CSV, PDF, Excel)
- [ ] View student attendance history (all classes)
- [ ] View student grades/progress (all classes)
- [ ] View student behavioral records
- [ ] View student documents (birth cert, records, etc.)
- [ ] View student payment history
- [ ] View complete student timeline

---

## 4. Admin - Parent Management

- [ ] View all parents (list with search/filter)
- [ ] View parent details (linked students, contact info)
- [ ] Edit parent profile information
- [ ] Link parents to students (family associations)
- [ ] Unlink parent-student relationships
- [ ] View parent engagement metrics
- [ ] Suspend/activate parent accounts
- [ ] Send messages to specific parents
- [ ] Export parent contact list

### General User Management
- [ ] Global user search (across all roles)
- [ ] Advanced filters (status, role, date joined, activity)
- [ ] Bulk operations (bulk email, bulk status updates)
- [ ] View user activity timeline
- [ ] Export user data (GDPR compliance)
- [ ] Merge duplicate accounts

---

## 5. Website Content Management

### Flash News Marquee
- [ ] Create flash news items (short text, bilingual: Tamil + English)
- [ ] Set display priority/order
- [ ] Set start and end dates (auto-show/hide)
- [ ] Mark as urgent (different styling/speed)
- [ ] Preview marquee before publishing
- [ ] Publish/unpublish toggle (immediate effect)
- [ ] Force cache eviction on publish
- [ ] Client-side caching with TTL (configurable)
- [ ] Automatic cache refresh when admin updates

### News Post Management
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
- [ ] Archive old news
- [ ] View news analytics (views, engagement)
- [ ] Approve/reject teacher-submitted news

### School Calendar Management
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

### Static Page Editor
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

### Media Library
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

### Photo Galleries
- [ ] Create photo galleries
- [ ] Upload photos to galleries
- [ ] Organize photos in albums
- [ ] Set gallery visibility (public/internal)
- [ ] Add captions to photos
- [ ] Download galleries
- [ ] Share gallery links

### Hero Content (UI Enhancement)
- [ ] Preview banner before publishing
- [ ] Duplicate event banner as template

---

## 6. Communication Tools

### Announcement System
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

### Messaging System
- [x] Teacher-parent direct messaging ✅ Implemented (PR #221)
- [x] Thread management ✅ Implemented (PR #221)
- [ ] Read receipts
- [ ] Attachment support
- [ ] Archive old conversations

---

## 7. Class Management (Advanced)

- [x] Assign students to classes ✅ Implemented
- [ ] View class rosters (admin)
- [ ] Transfer students between classes
- [x] Bulk assign students to classes ✅ Implemented

---

## 8. Reports & Analytics

### User Metrics
- [ ] Total users by role
- [ ] New signups over time (chart)
- [ ] Active vs. inactive users
- [ ] User engagement metrics
- [ ] Login frequency by user
- [ ] Role distribution

### Content Metrics
- [ ] Most viewed pages
- [ ] Most clicked announcements
- [ ] News engagement (views, time spent)
- [ ] Calendar event participation
- [ ] Download statistics

### Academic Metrics
- [x] Attendance rates by class ✅ Implemented (PR #221)
- [x] Attendance trends over time ✅ Implemented (PR #221)
- [ ] Grade distribution
- [ ] Student progress reports

### System Health
- [ ] API usage statistics
- [ ] Error rates and logs
- [ ] Storage usage
- [ ] Performance metrics (page load times)
- [ ] Email delivery rates

### Export Options
- [ ] Export reports as PDF
- [ ] Export reports as CSV
- [ ] Schedule automated reports
- [ ] Email reports to stakeholders

---

## 9. Annual Assessment Results Publishing

### Results Compilation
- [ ] View all final grades by grade level
- [ ] View all final grades by class
- [ ] View all final grades by teacher
- [ ] Filter results by academic year/term
- [ ] Review grade completion status
- [ ] Identify missing grades or incomplete data
- [ ] Generate grade statistics and summaries

### Publish Annual Results
- [ ] Publish results for all grades at once
- [ ] Publish results for selected grades
- [ ] Publish results grade-by-grade
- [ ] Set publication date and time
- [ ] Schedule results for future publication
- [ ] Preview results before publishing
- [ ] Require admin approval before publishing

### Grade-wise Publishing
- [ ] Select specific grades to publish (multi-select)
- [ ] Publish kindergarten results separately
- [ ] Publish elementary grades (K-5)
- [ ] Publish middle school grades (6-8)
- [ ] Publish high school grades (9-12)
- [ ] Publish results for graduating class first
- [ ] Stagger publication by grade level

### Publication Controls
- [ ] Lock grades before publishing (prevent teacher edits)
- [ ] Send notification to parents when results published
- [ ] Send notification to teachers when results published
- [ ] Make results visible on parent portal
- [ ] Make results visible on public website (optional, anonymized)
- [ ] Download published results (PDF, Excel)
- [ ] Generate result analytics (pass rates, distribution, etc.)

### Published Results Management
- [ ] View publication history
- [ ] View who published what and when
- [ ] Unpublish results (with reason/justification)
- [ ] Republish corrected results
- [ ] Send correction notifications
- [ ] Archive published results by year
- [ ] Compare results across years

### Public Results Display
- [ ] Publish school-wide pass rates
- [ ] Publish grade-wise pass rates
- [ ] Publish subject-wise performance
- [ ] Publish topper lists (with consent)
- [ ] Publish achievement awards
- [ ] Display grade distributions (anonymized)
- [ ] Set visibility controls (public vs. internal)
- [ ] Generate press release summaries

### Results Analytics
- [ ] Compare year-over-year performance
- [ ] Grade-wise performance trends
- [ ] Subject-wise performance analysis
- [ ] Teacher-wise performance comparison
- [ ] Identify improvement areas
- [ ] Generate board presentation reports
- [ ] Export results for accreditation

---

## 10. Parent Portal Features

### Profile Management (Enhanced)
- [ ] Edit personal information (First name, Last name, Phone - required)
- [ ] Edit address details (Street, City, State, ZIP - required)
- [ ] Set preferred contact method
- [ ] Set preferred language
- [ ] Update emergency contact information
- [ ] View profile completion status
- [ ] Validate required fields before saving
- [ ] Detect incomplete profile on login
- [ ] Show profile completion modal/page (blocking)
- [ ] Highlight required fields
- [ ] Validate data before allowing access
- [ ] Mark profile as complete
- [ ] Auto-save draft progress

### Close Account
- [ ] Request account closure
- [ ] Confirm account closure (multi-step verification)
- [ ] Soft delete parent account (mark as inactive)
- [ ] Retain student data (unlink parent association)
- [ ] Send confirmation email
- [ ] Specify closure reason (optional)
- [ ] Set effective closure date
- [ ] Download all personal data before closure (GDPR)
- [ ] Notify admins of account closure

### Children/Student Management
- [ ] Add new child (manual entry with comprehensive form)
- [ ] Check for existing student by name + DOB
- [ ] Option to reactivate existing (inactive) student
- [ ] Update existing student details on reactivation
- [ ] Link reactivated student to parent account
- [ ] Auto-create Google Drive folder structure on add
- [ ] Send confirmation notification on add
- [ ] Edit child details (limited fields)
- [ ] Request admin approval for critical changes (name, DOB, grade)
- [ ] View edit history
- [ ] Update Google Drive folder if grade changes
- [ ] Soft delete child from parent account (unlink)
- [ ] Specify removal reason
- [ ] Mark student as inactive in backend
- [ ] View previously removed children
- [ ] Reactivate child if rejoining school
- [ ] Restore Google Drive folder access

### View Current Year Assessments
- [ ] View ongoing assessments published by teachers
- [ ] Filter by child/class/subject
- [ ] View assessment details (name, type, date, max score)
- [ ] View assessment scores (if graded)
- [ ] View teacher feedback/comments
- [ ] View assessment rubrics
- [ ] Track assessment completion status
- [ ] View upcoming assessments
- [ ] Download assessment reports

### View Final Assessment Results
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

### Progress Tracking
- [ ] View real-time grade updates
- [ ] Track assignment completion
- [ ] View attendance trends
- [ ] Monitor academic progress over time
- [ ] View strengths and areas for improvement
- [ ] Set learning goals (with teacher collaboration)
- [ ] Receive alerts for low grades or missing assignments

### Homework Submission (Google Drive Integration)
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

### Google Drive Integration
- [ ] Auto-create folder structure on child enrollment
- [ ] Create folders for grades 1-8
- [ ] Create 32 week folders per grade
- [ ] Upload homework to appropriate week folder
- [ ] Auto-detect current grade and week
- [ ] Organize by subject within week folder
- [ ] Set proper permissions (parent + teachers + admin)
- [ ] Generate shareable links
- [ ] Sync with parent's Google account
- [ ] Handle grade promotion (move to next grade folder)

### Homework Management
- [ ] View uploaded homework history
- [ ] Filter by child/grade/week/subject
- [ ] Download previously uploaded homework
- [ ] Delete uploaded homework (before teacher review)
- [ ] View teacher feedback on homework
- [ ] View homework grades/scores
- [ ] Track homework completion rate
- [ ] Receive reminders for pending homework
- [ ] View upcoming homework deadlines

### Communication
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

### Calendar & Events
- [ ] View school calendar
- [ ] Filter calendar by student's grade/class
- [ ] View event details
- [ ] RSVP to events (Yes/No/Maybe)
- [ ] Add events to personal calendar (iCal export)
- [ ] Sync with Google Calendar
- [ ] Receive event reminders
- [ ] View past events
- [ ] Download event attachments

### Payments & Fees
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

### Resources & Documents
- [ ] Access class materials shared by teachers
- [ ] Download forms and documents
- [ ] View school handbook
- [ ] View school policies
- [ ] Download lunch menu
- [ ] Download school calendar PDF
- [ ] Access parent resources
- [ ] View FAQs

### News & Announcements (Parent View)
- [ ] View all announcements
- [ ] Filter announcements by category
- [ ] View pinned announcements
- [ ] Read news articles
- [ ] View photo galleries
- [ ] Share announcements (if public)
- [ ] Mark announcements as read

### Personal Profile (Parent)
- [ ] Update profile information
- [ ] Update contact details (phone, email, address)
- [ ] Update emergency contacts
- [ ] Update profile photo
- [ ] Manage linked students
- [ ] Set notification preferences
- [ ] Change password
- [ ] Enable two-factor authentication
- [ ] View login history

---

## 11. Teacher Portal Features

### Class Management
- [ ] View assigned classes
- [ ] View class schedules
- [ ] View class locations
- [ ] View class capacity and enrollment
- [ ] Post class announcements
- [ ] Share class materials (PDFs, links, videos)
- [ ] Organize materials by topic/date
- [ ] Create class calendar events
- [ ] View class performance metrics

### Student Management (Teacher View)
- [ ] View complete student roster for assigned classes
- [ ] Search students by name
- [ ] Filter students by grade/class
- [ ] View student profiles (photo, contact, emergency info)
- [ ] View student schedules
- [ ] View student enrollment status
- [ ] Edit student contact information
- [ ] Update student emergency contacts
- [ ] Add/update student photos
- [ ] Add student notes (behavior, learning style, etc.)
- [ ] Update student medical information
- [ ] Update dietary restrictions
- [ ] Flag special needs or accommodations
- [ ] Update parent contact preferences

### Attendance Management
- [ ] Record daily attendance for all classes
- [ ] Quick entry mode (mark all present, then exceptions)
- [ ] Bulk attendance entry (entire class at once)
- [ ] Mark students as: Present, Absent, Late, Excused
- [ ] Record late arrival time
- [ ] Add attendance notes per student
- [ ] View real-time attendance status
- [ ] View attendance history by student
- [ ] View attendance history by class
- [ ] View attendance patterns and trends
- [ ] Generate attendance reports (daily, weekly, monthly)
- [ ] Export attendance data (CSV, PDF)
- [ ] View attendance statistics (% present, late, absent)
- [ ] Identify students with poor attendance
- [ ] Flag chronic absenteeism
- [ ] Auto-notify parents of absences
- [ ] Send attendance summaries to parents (weekly)
- [ ] View attendance notification history

### Assessment & Grading
- [ ] Create assignments (homework, quiz, test, project)
- [ ] Set assignment details (name, type, due date, max score)
- [ ] Set assignment weights and categories
- [ ] Post grades for individual students
- [ ] Post grades for entire class (bulk entry)
- [ ] Add grading rubrics
- [ ] Record extra credit
- [ ] Record participation scores
- [ ] View gradebook (all students, all assignments)
- [ ] Edit posted grades (with audit trail)
- [ ] Delete grades (with reason/approval)
- [ ] Import grades from CSV
- [ ] Export grades to CSV
- [ ] Calculate weighted averages
- [ ] Apply grade curves
- [ ] Set grading scale (A, B, C, etc.)
- [ ] View grade distribution (histogram)
- [ ] View class average by assignment
- [ ] View student grade trends over time
- [ ] Identify students at risk (failing, declining)
- [ ] Compare student performance to class average
- [ ] View assignment completion rates
- [ ] Add detailed feedback per assignment
- [ ] Add general progress comments
- [ ] Use comment templates/snippets
- [ ] Attach files to feedback
- [ ] Private notes (not visible to parents)

### Student Reports & Progress
- [ ] Generate individual student progress reports
- [ ] Generate class progress reports
- [ ] Create custom report cards
- [ ] Generate mid-term reports
- [ ] Generate end-of-term reports
- [ ] Include narrative comments
- [ ] Include attendance summary
- [ ] Include grade breakdown
- [ ] View student academic history
- [ ] View all grades and assignments
- [ ] View attendance record
- [ ] View behavioral notes
- [ ] View parent-teacher communication history
- [ ] Track student improvement over time
- [ ] View student strengths and weaknesses
- [ ] Set learning goals per student
- [ ] Track progress toward goals
- [ ] Flag students needing intervention
- [ ] Schedule parent conferences for at-risk students
- [ ] Document intervention strategies
- [ ] Monitor intervention effectiveness

### Publish Final Results
- [ ] Review all grades for completeness
- [ ] Calculate final grades (weighted average)
- [ ] Assign letter grades
- [ ] Write final comments/narratives
- [ ] Preview report cards before publishing
- [ ] Submit grades for admin review (if required)
- [ ] Publish final grades to parents
- [ ] Lock grades after publishing (no further edits)
- [ ] Generate final report cards
- [ ] Include term summary
- [ ] Include attendance summary
- [ ] Include teacher comments
- [ ] Include recommendations for next term
- [ ] Preview before sending to parents
- [ ] Publish report cards (make visible to parents)
- [ ] Send notification when published
- [ ] Download report cards (PDF)
- [ ] Submit final grades by deadline
- [ ] View submission status
- [ ] Request grade change after publishing (with justification)
- [ ] View published grade history
- [ ] Archive grades for past terms
- [ ] Recommend student for promotion
- [ ] Flag student for retention
- [ ] Provide justification/notes
- [ ] Submit recommendation to admin

### Content Contribution
- [ ] Submit news items (pending admin approval)
- [ ] Suggest calendar events (pending admin approval)
- [ ] Upload teaching materials to shared library
- [ ] Create class-specific resources
- [ ] Share external learning resources

### Communication (Teacher)
- [ ] Message parents of students in their classes
- [ ] Reply to parent inquiries
- [ ] View communication history with parents
- [ ] Send class-wide announcements
- [ ] Schedule meeting requests
- [ ] View parent contact information
- [ ] Mark messages as read/unread
- [ ] Archive old conversations

### Reports & Analytics (Teacher)
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

### Personal Profile (Teacher)
- [ ] Update profile information
- [ ] Update profile photo
- [ ] Set notification preferences
- [ ] View own schedule
- [ ] Manage personal calendar

---

## 12. Student Portal (Future)

### Academic
- [ ] View class schedule
- [ ] View assignments
- [ ] Submit assignments online
- [ ] View grades
- [ ] Download class materials
- [ ] Access learning resources
- [ ] View feedback from teachers
- [ ] Track academic progress

### Communication
- [ ] Message teachers
- [ ] View class announcements
- [ ] Participate in class discussions (moderated)
- [ ] Receive notifications

### Calendar
- [ ] View personal schedule
- [ ] View assignment due dates
- [ ] View school events
- [ ] Set reminders

### Profile
- [ ] View profile
- [ ] Update avatar/photo
- [ ] View achievements/badges
- [ ] View attendance record

---

## 13. Mobile App

### React Native Mobile App
- [ ] Parent app
- [ ] Teacher app
- [ ] Offline capability
- [ ] Push notifications
- [ ] Shared code with web (packages/shared-core)

---

## 14. Infrastructure & Platform

### Security & Authentication
- [ ] Two-factor authentication
- [ ] Advanced rate limiting (per user, not just IP)
- [ ] Role expiration and renewal
- [ ] Fine-grained permissions system

### Performance & Scalability
- [ ] Advanced caching (Redis-backed)
- [ ] Performance optimization
- [ ] Load testing and optimization
- [ ] Multi-region deployment

### Developer Experience
- [ ] Workload Identity Federation (replace service account keys)
- [ ] Multi-tenancy support

### Compliance & Accessibility
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Multi-language support (beyond Tamil/English)
- [ ] GDPR data export improvements

### Integrations
- [ ] Payment integration (Stripe)
- [ ] Email notification system (SendGrid/AWS SES)
- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Google Calendar sync
- [ ] iCal export

### PWA Features
- [ ] Progressive Web App (PWA) features
- [ ] Offline capability for web

---

## Priority Recommendations

### High Priority (Core Functionality)
1. ~~Admin - Student bulk import (CSV)~~ ✅ Done
2. ~~Admin - Student class assignment~~ ✅ Done
3. ~~Communication system (parent-teacher messaging)~~ ✅ Done (PR #221)
4. ~~Attendance enhancements (edit history, reports)~~ ✅ Done (PR #221)
5. Payment integration

### Medium Priority (User Experience)
1. Flash News Marquee
2. Calendar management
3. Parent profile completion flow
4. Teacher gradebook
5. Mobile app (parent + teacher)

### Lower Priority (Nice to Have)
1. Photo galleries
2. Student portal
3. Advanced analytics
4. Multi-language support beyond Tamil/English

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 27, 2025 | Claude | Initial creation |
| 1.1 | Dec 27, 2025 | Claude | Marked completed: Student bulk import, class assignment, messaging, attendance analytics |

---

**This document tracks all pending features for the GSDTA Web application.**
