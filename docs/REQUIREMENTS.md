# GSDTA Web Application - Requirements Document

**Version**: 1.2
**Classification**: Master Reference Document
**Last Updated**: January 2, 2026 (Updated with Feature Flags and Dashboard Improvements)
**Purpose**: This document serves as the definitive source of truth for all features and capabilities of the GSDTA Tamil School Management System.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [User Roles and Access Levels](#user-roles-and-access-levels)
4. [Feature Inventory](#feature-inventory)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Data Model](#data-model)
7. [Security and Authentication](#security-and-authentication)
8. [Non-Functional Requirements](#non-functional-requirements)
9. [Known Limitations](#known-limitations)
10. [Future Roadmap](#future-roadmap)

---

## Executive Summary

### What is GSDTA Web?

GSDTA Web is a comprehensive school management system designed for a non-profit Tamil educational organization. It manages students, classes, teachers, grades, and school operations across multiple user roles.

### Key Capabilities

| Capability | Status | Description |
|------------|--------|-------------|
| User Authentication | COMPLETE | Firebase-based email/password and Google OAuth |
| Role-Based Access Control | COMPLETE | Super Admin, Admin, Teacher, Parent roles with distinct permissions |
| Feature Flags | COMPLETE | Dynamic feature toggling per role with UI hiding |
| Super Admin Portal | COMPLETE | Admin management, audit logs, security, system config, data recovery |
| Teacher Onboarding | COMPLETE | Invite-based teacher registration system |
| Parent Portal | COMPLETE | Student registration, profile management, tile-based dashboard |
| Teacher Portal | COMPLETE | Dashboard, class roster, attendance tracking, tile-based navigation |
| Admin Portal | COMPLETE | User management, class management, content management, tile-based dashboard |
| Hero Content | COMPLETE | Event banners with bilingual support |
| Grades & Classes | COMPLETE | Grade levels and class management |
| Public Website | COMPLETE | Bilingual (Tamil/English) public-facing pages |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes, Node.js 20 |
| Database | Google Cloud Firestore (Native mode) |
| Authentication | Firebase Authentication |
| Hosting | Google Cloud Run |
| CI/CD | GitHub Actions |
| DNS/CDN | AWS Route 53, CloudFront (optional) |

---

## System Overview

### Architecture

```
                    ┌─────────────────────────────────────┐
                    │           User Browser              │
                    └─────────────────┬───────────────────┘
                                      │ HTTPS
                                      ▼
                    ┌─────────────────────────────────────┐
                    │     app.gsdta.com (Route 53)        │
                    │         CNAME → Cloud Run           │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                Google Cloud Run Container                       │
    │  ┌─────────────────────────────────────────────────────────┐   │
    │  │                 Supervisor (Process Manager)             │   │
    │  │   ┌───────────────────┐      ┌───────────────────┐      │   │
    │  │   │   Next.js UI      │      │   Next.js API     │      │   │
    │  │   │   Port 3000       │      │   Port 8080       │      │   │
    │  │   └───────────────────┘      └───────────────────┘      │   │
    │  └─────────────────────────────────────────────────────────┘   │
    └────────────────────────────┬────────────────────────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
    ┌─────────────┐     ┌─────────────────┐    ┌──────────────┐
    │  Firestore  │     │  Firebase Auth  │    │   Secret     │
    │  Database   │     │                 │    │   Manager    │
    └─────────────┘     └─────────────────┘    └──────────────┘
```

### Deployment Model

- **Single Container**: UI and API run together, managed by Supervisor
- **Port Mapping**: UI exposed on port 3000 (Cloud Run default), API on 8080 (internal)
- **Autoscaling**: 0-10 instances based on traffic
- **Zero-Downtime**: Rolling deployments via Cloud Run

---

## User Roles and Access Levels

### Role Hierarchy

| Role | Access Level | Onboarding Method |
|------|--------------|-------------------|
| Super Admin | Highest | Manual seed (first user) |
| Admin | Full management | Promoted by Super Admin |
| Teacher | Class-specific | Invite from Admin |
| Parent | Personal data | Self-registration |
| Student | View-only (future) | Linked by Parent |

### Role Capabilities Matrix

#### Super Admin Capabilities

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Admin Users | Promote | All | All | Demote |
| Teachers | Invite | All | All | Deactivate |
| Students | Manual/Bulk | All | All | Deactivate |
| Parents | - | All | All | Deactivate |
| Classes | Yes | All | All | Deactivate |
| Grades | Yes | All | All | Deactivate |
| Hero Content | Yes | All | All | Yes |
| System Config | - | All | Yes | - |
| Audit Logs | - | All | - | - |
| Security Events | - | All | Resolve | - |
| Deleted Data | - | All | Restore | - |
| Data Export | Yes | All | - | - |
| Suspensions | Yes | All | Lift | - |

#### Admin Capabilities

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Teachers | Invite | All | All | Deactivate |
| Students | Manual/Bulk | All | All | Deactivate |
| Parents | - | All | All | Deactivate |
| Classes | Yes | All | All | Deactivate |
| Grades | Yes | All | All | Deactivate |
| Hero Content | Yes | All | All | Yes |
| Textbooks | Yes | All | All | Yes |
| Volunteers | Yes | All | All | Yes |

#### Teacher Capabilities

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Assigned Classes | - | Own | Limited | - |
| Class Roster | - | Own students | - | - |
| Attendance | Yes (own) | Own classes | Yes (7 days) | - |
| Student Details | - | Assigned | Contact only | - |

#### Parent Capabilities

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Profile | - | Own | Yes | Request close |
| Students (children) | Register | Own | Limited | Unlink |
| Attendance | - | Own children | - | - |
| Announcements | - | Targeted | - | - |

---

## Feature Inventory

### 1. Authentication & Authorization

**Status**: COMPLETE

#### Features

- Email/Password authentication via Firebase
- Google OAuth sign-in
- Email verification support
- Role-based route protection
- Custom claims in Firebase tokens
- Session management with automatic token refresh
- Status-based access control (active/pending/suspended/inactive)

#### Implementation Details

| Component | Technology |
|-----------|------------|
| Identity Provider | Firebase Authentication |
| Token Format | Firebase ID Token (JWT) |
| Session Storage | Browser sessionStorage |
| Token Expiry | 1 hour (auto-refresh) |

### 2. Teacher Invite System

**Status**: COMPLETE

#### Features

- Admin creates teacher invites with email
- Unique secure token generation (UUID)
- Token expiration (72 hours default)
- Email verification on acceptance
- Role automatically assigned on acceptance
- Rate limiting on invite endpoints

#### Flow

```
Admin → Create Invite → Token Generated → Teacher Clicks Link
→ Verify Token → Sign In/Sign Up → Accept Invite → Role Assigned
```

### 3. Admin Portal

**Status**: COMPLETE

#### 3.1 Layout & Navigation

- Header navigation with dropdown menus
- Three main sections: Teachers, Classes, Content
- Two-pane layout (sidebar + main content)
- Mobile-responsive with hamburger menu
- Active section and page highlighting

#### 3.2 Teacher Management

| Feature | Status |
|---------|--------|
| View all teachers | COMPLETE |
| Search by name/email | COMPLETE |
| Filter by status | COMPLETE |
| Pagination (50/page) | COMPLETE |
| Create teacher invite | COMPLETE |
| View teacher details | COMPLETE |
| Edit teacher profile | COMPLETE |

#### 3.3 Grades Management

| Feature | Status |
|---------|--------|
| 11 default grades (PS-1 to Grade-8) | COMPLETE |
| View all grades | COMPLETE |
| Edit grade display name | COMPLETE |
| Edit display order | COMPLETE |
| Activate/deactivate grades | COMPLETE |
| Seed default grades | COMPLETE |

#### 3.4 Classes Management

| Feature | Status |
|---------|--------|
| List all classes | COMPLETE |
| Filter by grade | COMPLETE |
| Create new class | COMPLETE |
| Edit class details | COMPLETE |
| Assign primary teacher | COMPLETE |
| Assign assistant teachers | COMPLETE |
| Remove teacher from class | COMPLETE |
| Set capacity/schedule | COMPLETE |
| Soft delete (deactivate) | COMPLETE |

#### 3.5 Hero Content Management

| Feature | Status |
|---------|--------|
| Create event banners | COMPLETE |
| Bilingual content (Tamil/English) | COMPLETE |
| Set display date range | COMPLETE |
| Set priority | COMPLETE |
| Add CTA button with link | COMPLETE |
| Activate/deactivate toggle | COMPLETE |
| Auto-carousel on homepage | COMPLETE |
| 5-minute client-side caching | COMPLETE |

#### 3.6 Student Management

| Feature | Status |
|---------|--------|
| View all students | COMPLETE |
| Filter by status/grade/class | COMPLETE |
| Search students | COMPLETE |
| View student details | COMPLETE |
| Admit pending students | COMPLETE |
| Assign class to student | COMPLETE |

#### 3.7 Super Admin Portal

**Status**: COMPLETE (December 2025)

Super Admins have the highest level of access and control over the entire system. They have all capabilities of regular admins plus elevated permissions.

##### Admin User Management

| Feature | Status |
|---------|--------|
| View all admin users | COMPLETE |
| Search admin users | COMPLETE |
| View promotable non-admin users | COMPLETE |
| Promote user to admin role | COMPLETE |
| Demote admin to regular user | COMPLETE |
| Role badges and status display | COMPLETE |
| Promotion/demotion with reason | COMPLETE |
| Cannot demote super_admin users | COMPLETE |

##### Audit Logging System

| Feature | Status |
|---------|--------|
| Comprehensive audit trail | COMPLETE |
| Log all admin actions | COMPLETE |
| Filter by user/action/resource | COMPLETE |
| Filter by severity level | COMPLETE |
| Date range filtering | COMPLETE |
| Pagination support | COMPLETE |
| Export audit logs to CSV | COMPLETE |
| Severity levels (info/warning/critical) | COMPLETE |

##### Security Monitoring

| Feature | Status |
|---------|--------|
| Security events dashboard | COMPLETE |
| Failed login tracking | COMPLETE |
| Rate limit violation monitoring | COMPLETE |
| Unauthorized access attempts | COMPLETE |
| Suspicious activity detection | COMPLETE |
| Event filtering by type | COMPLETE |
| Security statistics view | COMPLETE |

##### System Configuration

| Feature | Status |
|---------|--------|
| Enable/disable maintenance mode | COMPLETE |
| Bilingual maintenance messages (EN/TA) | COMPLETE |
| Maintenance mode scheduling | COMPLETE |
| Role-based access during maintenance | COMPLETE |
| Configure rate limits (invite/login/API) | COMPLETE |
| Backup schedule configuration | COMPLETE |
| Backup frequency (daily/weekly) | COMPLETE |
| Retention days configuration | COMPLETE |

##### Emergency Actions & Data Recovery

| Feature | Status |
|---------|--------|
| Emergency user suspension | COMPLETE |
| Suspension severity (warning/temp/permanent) | COMPLETE |
| Suspension duration for temporary | COMPLETE |
| Lift user suspension | COMPLETE |
| Suspension history tracking | COMPLETE |
| Soft delete with 90-day retention | COMPLETE |
| View deleted data by collection | COMPLETE |
| Restore deleted data | COMPLETE |
| Prevent overwriting existing docs | COMPLETE |

##### System Data Export

| Feature | Status |
|---------|--------|
| Full system export (all collections) | COMPLETE |
| Users export | COMPLETE |
| Students export | COMPLETE |
| Audit logs export | COMPLETE |
| Classes export | COMPLETE |
| Export job tracking | COMPLETE |
| Download link generation | COMPLETE |
| 24-hour download expiry | COMPLETE |
| Export progress tracking | COMPLETE |

##### Firestore Collections (Super Admin)

| Collection | Purpose |
|------------|---------|
| adminPromotions | Tracks all admin promotions/demotions |
| auditLog | Comprehensive action audit trail |
| securityEvents | Security event logging |
| systemConfig | System configuration (maintenance, rate limits, backup) |
| deletedData | Soft-deleted records (90-day retention) |
| suspensions | User suspension records |
| exportJobs | Data export job tracking |

##### API Endpoints (Super Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/super-admin/users/admins` | List all admin users |
| POST | `/api/v1/super-admin/users/:uid/promote` | Promote user to admin |
| POST | `/api/v1/super-admin/users/:uid/demote` | Demote admin to user |
| GET | `/api/v1/super-admin/audit-log` | Query audit logs |
| GET | `/api/v1/super-admin/security` | Security events/stats |
| GET/POST | `/api/v1/super-admin/config` | System configuration |
| POST | `/api/v1/super-admin/users/:uid/emergency-suspend` | Emergency suspend |
| GET | `/api/v1/super-admin/deleted-data` | List deleted data |
| POST | `/api/v1/super-admin/deleted-data/:id/restore` | Restore data |
| POST | `/api/v1/super-admin/export` | Create export job |
| GET | `/api/v1/super-admin/export/:jobId` | Get export status |

### 4. Parent Portal

**Status**: COMPLETE

#### 4.1 Dashboard

- Welcome message with personalized greeting
- Quick stats (total students, active students)
- Quick action links

#### 4.2 Profile Management

| Feature | Status |
|---------|--------|
| View profile | COMPLETE |
| Edit display name | COMPLETE |
| Edit phone number | COMPLETE |
| Edit address | COMPLETE |
| Set language preference | COMPLETE |
| Notification settings | COMPLETE |

#### 4.3 Student Management

| Feature | Status |
|---------|--------|
| View linked students | COMPLETE |
| Register new student | COMPLETE |
| Update student info | COMPLETE |
| View student status | COMPLETE |

### 5. Teacher Portal

**Status**: COMPLETE

#### 5.1 Dashboard

| Feature | Status |
|---------|--------|
| Overview of assigned classes | COMPLETE |
| Today's schedule | COMPLETE |
| Quick action buttons | COMPLETE |
| Summary statistics | COMPLETE |

#### 5.2 Classes

| Feature | Status |
|---------|--------|
| List assigned classes | COMPLETE |
| View class details | COMPLETE |
| View class roster | COMPLETE |
| Search students in class | COMPLETE |

#### 5.3 Attendance

| Feature | Status |
|---------|--------|
| Mark attendance (present/absent/late/excused) | COMPLETE |
| Bulk create attendance records | COMPLETE |
| Edit attendance (within 7 days) | COMPLETE |
| View attendance history | COMPLETE |
| Date range filtering | COMPLETE |
| Edit history tracking | COMPLETE |

### 6. Public Website

**Status**: COMPLETE

#### Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing with Thirukkural rotator, hero carousel |
| About | `/about` | Organization information |
| Calendar | `/calendar` | School calendar and events |
| Contact | `/contact` | Contact form and information |
| Donate | `/donate` | Donation information |
| Team | `/team` | Team member profiles |
| Textbooks | `/textbooks` | Textbook catalog with filtering |
| Documents | `/documents` | Public documents with PDF viewer |
| Classes | `/classes` | Public class schedule |

#### Features

- Bilingual support (Tamil + English)
- Responsive design (mobile-first)
- PDF.js integration for document viewing
- Thirukkural verse rotator (1330 verses)
- Event banner carousel

### 7. Textbooks Management

**Status**: COMPLETE

| Feature | Status |
|---------|--------|
| List textbooks | COMPLETE |
| Filter by grade | COMPLETE |
| Filter by type | COMPLETE |
| Create textbook | COMPLETE |
| Update inventory | COMPLETE |

### 8. Volunteers Management

**Status**: COMPLETE

| Feature | Status |
|---------|--------|
| List volunteers | COMPLETE |
| Filter by type/status | COMPLETE |
| Create volunteer | COMPLETE |
| Assign to class | COMPLETE |
| Track volunteer hours | COMPLETE |

### 9. Feature Flags System

**Status**: COMPLETE (January 2026)

The feature flags system allows Super Admins to dynamically enable or disable features for different user roles without code deployment.

#### 9.1 Feature Flag Configuration

| Role | Available Features |
|------|-------------------|
| Admin | Students, Teachers, Classes, Grades, Textbooks, Volunteers, AttendanceAnalytics, HeroContent, Calendar |
| Teacher | Classes, Attendance, Messaging |
| Parent | Students, StudentRegistration, Messaging, Profile, Settings |

#### 9.2 UI Behavior

| Behavior | Description |
|----------|-------------|
| Navigation Hiding | Disabled features are hidden from sidebar navigation |
| Dashboard Tiles | Disabled features are hidden from dashboard tile cards |
| Query Parameter Support | Paths with query params (e.g., `/admin/students?status=pending`) correctly map to features |
| Empty States | Shows appropriate message when features are disabled (e.g., "Registration not available") |
| API Protection | Backend returns 403 "feature/disabled" for disabled feature endpoints |

#### 9.3 Caching Strategy

| Layer | Cache Duration | Storage |
|-------|---------------|---------|
| Frontend | 5 minutes | localStorage |
| Backend | 5 minutes | In-memory |
| Persistent | N/A | Firestore (`systemConfig/featureFlags`) |

#### 9.4 Super Admin Feature Management

| Feature | Status |
|---------|--------|
| View all feature flags by role | COMPLETE |
| Toggle individual features | COMPLETE |
| Feature descriptions for UI | COMPLETE |
| Real-time flag updates | COMPLETE |
| Default all-enabled configuration | COMPLETE |

### 10. Dashboard Tile Navigation

**Status**: COMPLETE (January 2026)

All portals now feature a consistent tile-based navigation system on their dashboards.

#### 10.1 Admin Dashboard Tiles

| Section | Tiles |
|---------|-------|
| Students | All Students, Pending Review |
| Teachers | All Teachers, Invite Teacher, Assign to Classes |
| Classes | All Classes, Create Class, Grades |
| Resources | Textbooks |
| Volunteers | All Volunteers |
| Analytics | Attendance Analytics |
| Content | Hero Content |
| Calendar | All Events, Create Event |

#### 10.2 Teacher Dashboard Tiles

| Tile | Description |
|------|-------------|
| My Classes | View all assigned classes |
| Mark Attendance | Record today's attendance |
| Attendance History | View past attendance records |
| Messages | Communicate with parents |

#### 10.3 Parent Dashboard Tiles

| Tile | Description |
|------|-------------|
| My Students | View linked students |
| Register Student | Add a new student |
| Messages | Communicate with teachers |
| My Profile | View and update profile |
| Settings | Manage preferences |

---

## API Endpoints Reference

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/docs` | API documentation |
| GET | `/api/v1/openapi.json` | OpenAPI specification |
| GET | `/api/v1/hero-content` | Active hero banners |
| GET | `/api/v1/invites/verify?token=` | Verify teacher invite |

### Authenticated Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/me` | Current user profile | Any |
| PUT | `/api/v1/me` | Update user profile | Any |
| GET | `/api/v1/me/students` | Parent's linked students | Parent |
| POST | `/api/v1/me/students` | Register student | Parent |
| POST | `/api/v1/invites/accept` | Accept teacher invite | Any |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/grades` | List all grades |
| POST | `/api/v1/admin/grades` | Create grade |
| POST | `/api/v1/admin/grades/seed` | Seed default grades |
| GET/PATCH | `/api/v1/admin/grades/:id` | Get/update grade |
| GET | `/api/v1/admin/classes` | List all classes |
| POST | `/api/v1/admin/classes` | Create class |
| GET/PATCH | `/api/v1/admin/classes/:id` | Get/update class |
| POST | `/api/v1/admin/classes/:id/teachers` | Assign teacher |
| PUT | `/api/v1/admin/classes/:id/teachers/:tid` | Update teacher role |
| DELETE | `/api/v1/admin/classes/:id/teachers/:tid` | Remove teacher |
| GET | `/api/v1/admin/students` | List students |
| POST | `/api/v1/admin/students` | Create student |
| GET/PATCH | `/api/v1/admin/students/:id` | Get/update student |
| POST | `/api/v1/admin/students/:id/admit` | Admit student |
| POST | `/api/v1/admin/students/:id/assign-class` | Assign class |
| GET | `/api/v1/admin/teachers` | List teachers |
| POST | `/api/v1/admin/teachers` | Create teacher invite |
| GET/PATCH | `/api/v1/admin/teachers/:uid` | Get/update teacher |
| GET/POST/PATCH | `/api/v1/admin/textbooks` | Textbook CRUD |
| GET/POST/PATCH | `/api/v1/admin/volunteers` | Volunteer CRUD |
| GET/POST/PATCH | `/api/v1/admin/hero-content` | Hero content CRUD |

### Feature Flags Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/v1/feature-flags` | Get feature flags (public, cached) | Any |
| GET | `/api/v1/super-admin/feature-flags` | Get feature flags with descriptions | Super Admin |
| PUT | `/api/v1/super-admin/feature-flags` | Update feature flags | Super Admin |

### Teacher Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/teacher/dashboard` | Dashboard data |
| GET | `/api/v1/teacher/classes` | Assigned classes |
| GET | `/api/v1/teacher/classes/:id` | Class details |
| GET | `/api/v1/teacher/classes/:id/roster` | Class roster |
| GET | `/api/v1/teacher/classes/:id/attendance` | Attendance history |
| POST | `/api/v1/teacher/classes/:id/attendance` | Mark attendance |
| GET | `/api/v1/teacher/classes/:id/attendance/:rid` | Get attendance record |
| PUT | `/api/v1/teacher/classes/:id/attendance/:rid` | Edit attendance |

---

## Data Model

### Core Collections

#### users

```typescript
{
  id: string;                    // Firebase UID
  email: string;                 // Normalized lowercase
  displayName?: string;
  roles: string[];               // ['admin'], ['teacher'], ['parent']
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  emailVerified: boolean;
  phone?: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### students

```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;           // YYYY-MM-DD
  gender?: 'Boy' | 'Girl' | 'Other';
  parentId: string;              // Parent's user UID
  parentEmail?: string;
  address?: { street, city, zipCode };
  contacts?: {
    mother?: { name, email, phone, employer };
    father?: { name, email, phone, employer };
  };
  schoolName?: string;
  schoolDistrict?: string;
  enrollingGrade?: string;
  classId?: string;
  className?: string;
  medicalNotes?: string;
  photoConsent: boolean;
  status: 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn';
  admittedAt?: Timestamp;
  admittedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### grades

```typescript
{
  id: string;                    // "ps-1", "grade-5"
  name: string;                  // "PS-1", "Grade-5"
  displayName: string;           // "Pre-School 1"
  displayOrder: number;          // 1-11
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### classes

```typescript
{
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  section?: string;              // "A", "B"
  room?: string;                 // "B01"
  day: string;                   // "Saturday"
  time: string;                  // "10:00 AM - 12:00 PM"
  capacity: number;
  enrolled: number;
  teachers: {
    teacherId: string;
    teacherName: string;
    teacherEmail?: string;
    role: 'primary' | 'assistant';
    assignedAt: Timestamp;
    assignedBy: string;
  }[];
  status: 'active' | 'inactive';
  academicYear?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### attendance

```typescript
{
  id: string;
  classId: string;
  className: string;
  date: string;                  // YYYY-MM-DD
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  arrivalTime?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: Timestamp;
  lastEditedBy?: string;
  lastEditedAt?: Timestamp;
  editHistory?: {
    previousStatus: string;
    newStatus: string;
    editedBy: string;
    editedAt: Timestamp;
    reason?: string;
  }[];
  docStatus: 'active' | 'deleted';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### roleInvites

```typescript
{
  id: string;
  email: string;
  role: 'teacher' | 'admin';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  acceptedAt?: Timestamp;
  acceptedBy?: string;
}
```

#### heroContent

```typescript
{
  id: string;
  title: { en: string; ta: string };
  subtitle: { en: string; ta: string };
  description?: { en: string; ta: string };
  imageUrl: string;
  thumbnailUrl?: string;
  ctaText?: { en: string; ta: string };
  ctaLink?: string;
  isActive: boolean;
  startDate: Timestamp;
  endDate: Timestamp;
  priority: number;
  views?: number;
  clicks?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

---

## Security and Authentication

### Authentication Flow

```
1. User enters credentials on login page
2. Firebase Auth verifies credentials
3. On success, ID token issued (JWT)
4. Token stored in sessionStorage
5. Token included in Authorization header for API calls
6. API verifies token via Firebase Admin SDK
7. User profile fetched from Firestore
8. Role and status checked for authorization
```

### Authorization Rules

| Check | Implementation |
|-------|----------------|
| Token Validity | Firebase Admin SDK `verifyIdToken()` |
| Role Check | User document `roles` array |
| Status Check | User document `status` field |
| Resource Access | Business logic per endpoint |

### Security Features

| Feature | Implementation |
|---------|----------------|
| HTTPS | Enforced by Cloud Run |
| CORS | Whitelist production origins |
| Rate Limiting | Per-IP, in-memory |
| Input Validation | Zod schemas |
| SQL Injection | N/A (NoSQL) |
| XSS | React auto-escaping |
| CSRF | Same-origin + token auth |

### Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Invite Verification | 20 req/min/IP |
| Invite Acceptance | 10 req/min/IP |
| Invite Creation | 30 req/hour/IP |
| General API | Default Cloud Run |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 3s | ~2s |
| API Response Time | < 500ms | ~200ms |
| Time to Interactive | < 5s | ~3s |

### Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Recovery Time | < 15 minutes |
| Backup Frequency | Daily (Firestore) |

### Scalability

| Dimension | Capacity |
|-----------|----------|
| Concurrent Users | 1000+ |
| Cloud Run Instances | 0-10 (auto) |
| Firestore Operations | 10,000+ writes/sec |

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Mobile Chrome | 90+ |
| Mobile Safari | 14+ |

---

## Known Limitations

### 1. firebase-admin Bundling Issue

**Issue**: Adding new API routes can cause `firebase-admin` to fail bundling in Next.js standalone builds.

**Impact**: Production 500 errors on authenticated endpoints.

**Workaround**:
- Test standalone builds locally before pushing
- Add routes incrementally
- Keep CORS logic inline (avoid shared modules)

**Reference**: `docs/KNOWN-ISSUES.md`

### 2. Single Container Architecture

**Limitation**: UI and API run in same container, limiting independent scaling.

**Mitigation**: Cloud Run autoscaling handles most load scenarios.

### 3. In-Memory Rate Limiting

**Limitation**: Rate limiting doesn't persist across instances.

**Impact**: Limits reset when new instances spawn.

**Future**: Implement Redis-backed rate limiting.

---

## Future Roadmap

### Phase 1: Academic Features (Planned)

- [ ] Student-class enrollment management
- [ ] Assignment creation and grading
- [ ] Report card generation
- [ ] Progress tracking dashboard

### Phase 2: Communication (Planned)

- [ ] Email notification system
- [ ] SMS notifications (Twilio)
- [ ] In-app messaging
- [ ] Push notifications

### Phase 3: Mobile App (Planned)

- [ ] React Native mobile app
- [ ] Shared code with web (packages/shared-core)
- [ ] Offline capability
- [ ] Push notifications

### Phase 4: Advanced Features (Planned)

- [ ] Two-factor authentication
- [ ] Payment integration
- [ ] Advanced analytics
- [ ] Multi-region deployment

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 27, 2025 | Claude | Initial release |
| 1.1 | Dec 27, 2025 | Claude | Added Super Admin features |
| 1.2 | Jan 2, 2026 | Claude | Added Feature Flags system, Dashboard tile navigation |

---

**This document is the authoritative source for GSDTA Web application requirements and capabilities.**
