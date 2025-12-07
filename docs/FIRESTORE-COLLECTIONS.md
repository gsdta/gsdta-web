# Firestore Collection Structures

**Project**: GSDTA Web Application  
**Purpose**: Comprehensive data model for all collections  
**Last Updated**: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Collection Priority](#collection-priority)
3. [Admin Flow Collections](#admin-flow-collections)
4. [Teacher Flow Collections](#teacher-flow-collections)
5. [Parent Flow Collections](#parent-flow-collections)
6. [Shared/Common Collections](#sharedcommon-collections)
7. [System Collections](#system-collections)

---

## Overview

This document outlines all Firestore collections needed for the GSDTA web application, organized by user flow and priority for implementation.

### Database Type
- **Firestore Native Mode** (not Datastore mode)
- **Location**: us-central1
- **Security**: Firestore Security Rules enforced
- **Indexes**: Composite indexes defined in firestore.indexes.json

---

## Collection Priority

### Phase 1: Foundation (Weeks 1-4)
- `users` - User accounts and authentication
- `roleInvites` - Teacher/admin invitations (already implemented)
- `auditLog` - System audit trail
- `systemConfig` - System-wide configuration

### Phase 2: User Management (Weeks 5-8)
- `students` - Student records
- `parentStudentLinks` - Parent-student relationships
- `classes` - Class definitions
- `teacherClassAssignments` - Teacher-class assignments
- `studentClassEnrollments` - Student-class enrollments

### Phase 3: Content Management (Weeks 9-12)
- `content` - Website content (hero, news, pages)
- `calendar` - School events and calendar
- `announcements` - Targeted announcements
- `media` - Media library
- `galleries` - Photo galleries

### Phase 4: Academic Management (Weeks 13-20)
- `attendance` - Daily attendance records
- `assignments` - Teacher assignments
- `grades` - Student grades
- `homework` - Homework submissions
- `googleDriveFolders` - Google Drive folder tracking
- `assessments` - Assessment definitions
- `assessmentResults` - Assessment scores

### Phase 5: Communication & Payments (Weeks 21-28)
- `messages` - Teacher-parent messaging
- `notifications` - System notifications
- `payments` - Payment records
- `invoices` - Generated invoices

### Phase 6: Results & Analytics (Weeks 29-32)
- `publishedResults` - Published annual results
- `reportCards` - Generated report cards
- `progressReports` - Progress reports
- `analyticsEvents` - Usage analytics

---

## Admin Flow Collections

Below are the collections required for admin workflows, organized by functionality:

### 1. Core User Management
- ✅ **users** - User accounts (all roles: admin, teacher, parent)
- ✅ **roleInvites** - Teacher/admin invitation system (already implemented)
- 🆕 **userStatusHistory** - Track status changes (inactive/active)
- �� **parentStudentLinks** - Many-to-many parent-student relationships

### 2. Student Management
- 🆕 **students** - Student master records
- 🆕 **studentDocuments** - Uploaded documents (birth cert, records, etc.)
- 🆕 **studentMedicalInfo** - Medical information (separate for security)
- 🆕 **studentEmergencyContacts** - Emergency contact details
- 🆕 **studentStatusHistory** - Track enrollment, withdrawals, reactivations

### 3. Class & Academic Structure
- 🆕 **classes** - Class definitions (Math 101, English 202, etc.)
- 🆕 **academicYears** - Academic year configurations (2024-2025, etc.)
- 🆕 **terms** - Term definitions (First Term, Mid-Year, Final, etc.)
- 🆕 **subjects** - Subject master list (Math, Science, English, etc.)
- 🆕 **grades** - Grade level definitions (K, 1, 2, ..., 12)
- 🆕 **teacherClassAssignments** - Which teachers teach which classes
- 🆕 **studentClassEnrollments** - Which students are in which classes

### 4. Content Management System
- 🆕 **content** - Website content (hero, news, pages)
- 🆕 **contentVersions** - Version history for content rollback
- 🆕 **contentApprovals** - Teacher-submitted content pending approval
- 🆕 **media** - Media library (images, videos, documents)
- 🆕 **mediaFolders** - Media organization structure
- 🆕 **galleries** - Photo gallery collections
- 🆕 **galleryImages** - Images within galleries

### 5. Calendar & Events
- 🆕 **calendar** - School events and calendar
- 🆕 **eventRSVPs** - RSVP tracking per event
- 🆕 **eventReminders** - Scheduled reminder configurations
- 🆕 **recurringEventTemplates** - Templates for recurring events

### 6. Communication System
- 🆕 **announcements** - Targeted announcements
- 🆕 **announcementRecipients** - Who received each announcement
- 🆕 **announcementTemplates** - Reusable announcement templates
- 🆕 **messages** - Direct teacher-parent messages
- 🆕 **messageThreads** - Message conversation threads
- 🆕 **notifications** - System notifications (email, SMS, push, in-app)
- 🆕 **notificationPreferences** - User notification settings

### 7. Annual Results Publishing
- 🆕 **publishedResults** - Published annual results metadata
- 🆕 **resultSnapshots** - Frozen grade data at publication time
- 🆕 **resultPublicDisplay** - Public-facing result displays
- 🆕 **resultAnalytics** - Year-over-year analytics

### 8. Reports & Analytics
- 🆕 **reportDefinitions** - Custom report templates
- 🆕 **generatedReports** - Generated report instances
- 🆕 **scheduledReports** - Automated report schedules
- 🆕 **dashboardMetrics** - Pre-calculated dashboard metrics

### 9. System Administration
- 🆕 **auditLog** - Complete audit trail
- 🆕 **systemConfig** - System-wide configuration
- 🆕 **featureFlags** - Feature flag toggles
- 🆕 **scheduledJobs** - Background job tracking
- 🆕 **errorLogs** - Application error logs

---

## Collection Details Summary

### Total Collections: ~50

**By Category:**
- Core User Management: 4 collections
- Student Management: 5 collections
- Class & Academic Structure: 7 collections
- Content Management: 7 collections
- Calendar & Events: 4 collections
- Communication: 7 collections
- Annual Results: 4 collections
- Reports & Analytics: 4 collections
- System Administration: 5 collections
- Teacher Flow (additional): ~5 collections
- Parent Flow (additional): ~3 collections

---

## Admin Flow - Collection Checklist

Here's the complete list of collections needed specifically for **Admin workflows**:

### User Management (4)
- [ ] users
- [ ] roleInvites (already exists)
- [ ] userStatusHistory
- [ ] parentStudentLinks

### Student Management (5)
- [ ] students
- [ ] studentDocuments
- [ ] studentMedicalInfo
- [ ] studentEmergencyContacts
- [ ] studentStatusHistory

### Class Structure (7)
- [ ] classes
- [ ] academicYears
- [ ] terms
- [ ] subjects
- [ ] grades
- [ ] teacherClassAssignments
- [ ] studentClassEnrollments

### Content Management (7)
- [ ] content
- [ ] contentVersions
- [ ] contentApprovals
- [ ] media
- [ ] mediaFolders
- [ ] galleries
- [ ] galleryImages

### Calendar (4)
- [ ] calendar
- [ ] eventRSVPs
- [ ] eventReminders
- [ ] recurringEventTemplates

### Communication (7)
- [ ] announcements
- [ ] announcementRecipients
- [ ] announcementTemplates
- [ ] messages
- [ ] messageThreads
- [ ] notifications
- [ ] notificationPreferences

### Results Publishing (4)
- [ ] publishedResults
- [ ] resultSnapshots
- [ ] resultPublicDisplay
- [ ] resultAnalytics

### Reports & System (9)
- [ ] reportDefinitions
- [ ] generatedReports
- [ ] scheduledReports
- [ ] dashboardMetrics
- [ ] auditLog
- [ ] systemConfig
- [ ] featureFlags
- [ ] scheduledJobs
- [ ] errorLogs

---

## Next Steps

We'll work through each collection one at a time, defining:

1. **Fields & Structure** - Complete field definitions with types
2. **Indexes** - Required composite indexes
3. **Security Rules** - Firestore security rules
4. **Relationships** - Foreign keys and data relationships
5. **Sample Data** - Example documents
6. **Migration Notes** - Data migration considerations

**Ready to start with the first collection!** Which one would you like to detail first?

Suggested starting order:
1. users (enhance existing)
2. students (core data model)
3. classes (academic structure)
4. content (CMS foundation)
5. Continue from there...

---

**Document Version**: 1.0  
**Maintained By**: GSDTA Development Team
