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
- `heroContent` - Hero section content (Thirukkural/Event banners)
- `thirukkural` - Thirukkural collection (Tamil + English)
- `flashNews` - Flash news marquee items
- `newsArticles` - Detailed news articles/posts
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

**Static Website Content (Bilingual):**
- 🆕 **heroContent** - Hero section content
  - Thirukkural display (default)
  - Event banner override (time-based)
  - Bilingual: Tamil + English
  - Client-side cached with TTL
  - Real-time updates via Firestore listeners
  
- 🆕 **thirukkural** - Thirukkural collection
  - Tamil text (original)
  - English translation
  - Interpretation/meaning
  - Author/source attribution
  - Display sequence/rotation
  
- 🆕 **flashNews** - Flash news marquee items
  - Short bilingual text (Tamil + English)
  - Priority/urgency level
  - Start/end dates
  - Active status
  - Client-side cached with TTL (2-min default)
  - Force cache eviction on admin update
  
- 🆕 **newsArticles** - Detailed news posts
  - Full bilingual content (Tamil + English)
  - Rich text support
  - Images and attachments
  - Categories (Events, Academic, Sports, etc.)
  - Publish/draft status
  - Scheduled publishing

**Other CMS Content:**
- 🆕 **content** - General website pages/sections
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

### Content Management (11)
- [ ] heroContent
- [ ] thirukkural
- [ ] flashNews
- [ ] newsArticles
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

## Detailed Collection Schemas

### 1. heroContent

**Purpose**: Store hero section content - Thirukkural (default) or Event banners (temporary override)

**Collection**: `heroContent`

**Document Structure**:
```typescript
interface HeroContent {
  // Identity
  id: string;                      // Auto-generated document ID
  type: 'thirukkural' | 'event';   // Content type
  
  // Bilingual Content
  title: {
    en: string;                    // English title
    ta: string;                    // Tamil title (தமிழ்)
  };
  subtitle: {
    en: string;
    ta: string;
  };
  description?: {                  // Optional longer description
    en: string;
    ta: string;
  };
  
  // Media
  imageUrl?: string;               // Cloud Storage URL
  thumbnailUrl?: string;           // Optimized thumbnail
  
  // Call to Action (optional)
  ctaText?: {
    en: string;
    ta: string;
  };
  ctaLink?: string;                // URL or route path
  
  // Display Control
  isActive: boolean;               // Currently active/visible
  startDate?: Timestamp;           // Event start (for type: event)
  endDate?: Timestamp;             // Event end (auto-deactivate after)
  priority?: number;               // If multiple active, show highest priority
  
  // Thirukkural-specific (for type: thirukkural)
  thirukkuralNumber?: number;      // Reference to thirukkural collection
  thirukkuralCategory?: string;    // அறத்துப்பால், பொருட்பால், காமத்துப்பால்
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // User UID
  updatedBy?: string;
  publishedAt?: Timestamp;         // When it was made active
  publishedBy?: string;
  
  // Analytics (optional)
  views?: number;
  clicks?: number;
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "heroContent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "startDate", "order": "ASCENDING" }
  ]
}
```

**Security Rules**:
```javascript
match /heroContent/{contentId} {
  // Anyone can read active content
  allow read: if resource.data.isActive == true;
  
  // Only admins can create/update/delete
  allow create, update, delete: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);
}
```

**Sample Documents**:

```json
// Default Thirukkural
{
  "id": "thirukkural-default",
  "type": "thirukkural",
  "title": {
    "en": "Thirukkural - Verse of the Day",
    "ta": "இன்றைய திருக்குறள்"
  },
  "subtitle": {
    "en": "அன்புடைமை",
    "ta": "Affection"
  },
  "description": {
    "en": "The virtue of affection is the foundation of all righteous living.",
    "ta": "அன்பு என்பது அனைத்து நல்லொழுக்கங்களுக்கும் அடிப்படை."
  },
  "thirukkuralNumber": 77,
  "thirukkuralCategory": "அறத்துப்பால்",
  "isActive": true,
  "priority": 1,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "createdBy": "system"
}

// Christmas Event Banner
{
  "id": "event-christmas-2025",
  "type": "event",
  "title": {
    "en": "Christmas Celebration 2025",
    "ta": "கிறிஸ்துமஸ் விழா 2025"
  },
  "subtitle": {
    "en": "Join us for a festive celebration!",
    "ta": "உற்சாகமான கொண்டாட்டத்தில் எங்களுடன் சேருங்கள்!"
  },
  "imageUrl": "https://storage.googleapis.com/.../christmas-2025.jpg",
  "ctaText": {
    "en": "Register Now",
    "ta": "இப்போது பதிவு செய்யுங்கள்"
  },
  "ctaLink": "/events/christmas-2025",
  "isActive": true,
  "startDate": "2025-12-15T00:00:00Z",
  "endDate": "2025-12-26T23:59:59Z",
  "priority": 10,
  "createdAt": "2025-12-01T10:00:00Z",
  "updatedAt": "2025-12-01T10:00:00Z",
  "createdBy": "admin-uid-123",
  "publishedAt": "2025-12-15T00:00:00Z",
  "publishedBy": "admin-uid-123"
}
```

---

### 2. thirukkural

**Purpose**: Complete Thirukkural collection (1330 verses) with bilingual translations

**Collection**: `thirukkural`

**Document Structure**:
```typescript
interface Thirukkural {
  // Identity
  id: string;                      // e.g., "thirukkural-1", "thirukkural-77"
  number: number;                  // 1-1330
  
  // Categorization
  paal: string;                    // அறத்துப்பால், பொருட்பால், காமத்துப்பால்
  iyal: string;                    // இயல் (Chapter group)
  athigaram: string;               // அதிகாரம் (Chapter)
  athigaramNumber: number;         // 1-133
  
  // Tamil Original
  tamil: {
    line1: string;                 // First line in Tamil
    line2: string;                 // Second line in Tamil
    full: string;                  // Combined verse
  };
  
  // English Translation
  english: {
    translation: string;           // Literal translation
    interpretation: string;        // Meaning/explanation
    translatedBy?: string;         // Translator name
  };
  
  // Additional Translations (optional)
  transliteration?: string;        // Romanized Tamil
  
  // Display Properties
  isActive: boolean;               // Available for rotation
  displayPriority?: number;        // Higher = more frequent display
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  addedBy: string;                 // Who added this entry
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "thirukkural",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "number", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "thirukkural",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "paal", "order": "ASCENDING" },
    { "fieldPath": "athigaramNumber", "order": "ASCENDING" }
  ]
}
```

**Security Rules**:
```javascript
match /thirukkural/{kuralId} {
  // Anyone can read
  allow read: if true;
  
  // Only admins can create/update
  allow create, update: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);
  
  // Never allow delete
  allow delete: if false;
}
```

**Sample Document**:
```json
{
  "id": "thirukkural-77",
  "number": 77,
  "paal": "அறத்துப்பால்",
  "iyal": "இல்லறவியல்",
  "athigaram": "அன்புடைமை",
  "athigaramNumber": 8,
  "tamil": {
    "line1": "அன்பிற்கும் உண்டோ அடைக்குந்தாழ் ஆர்வலர்",
    "line2": "புன்கணீர் பூசல் தரும்",
    "full": "அன்பிற்கும் உண்டோ அடைக்குந்தாழ் ஆர்வலர்\nபுன்கணீர் பூசல் தரும்"
  },
  "english": {
    "translation": "What door can shut out love? The eyes of lovers in tears will break it open.",
    "interpretation": "True affection cannot be hidden or contained. The tears of loved ones reveal the depth of genuine love.",
    "translatedBy": "G.U. Pope"
  },
  "transliteration": "Anpirkum untō ataikkuntāḻ ārvalarpuṇkaṇīr pūsal tarum",
  "isActive": true,
  "displayPriority": 5,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "addedBy": "system"
}
```

---

### 3. flashNews

**Purpose**: Short bilingual news items displayed in scrolling marquee

**Collection**: `flashNews`

**Document Structure**:
```typescript
interface FlashNews {
  // Identity
  id: string;
  
  // Bilingual Content
  text: {
    en: string;                    // English text (keep short: 100 chars max)
    ta: string;                    // Tamil text
  };
  
  // Display Control
  isActive: boolean;
  isUrgent: boolean;               // Show with ⚠️ icon, faster scroll
  priority: number;                // Display order (higher first)
  
  // Scheduling
  startDate: Timestamp;            // When to start showing
  endDate: Timestamp;              // When to stop showing (auto-hide)
  
  // Optional Link
  linkUrl?: string;                // External link or internal route
  linkText?: {
    en: string;
    ta: string;
  };
  
  // Styling (optional)
  backgroundColor?: string;        // Hex color for urgent items
  textColor?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  publishedAt?: Timestamp;
  publishedBy?: string;
  
  // Analytics
  impressions?: number;            // How many times shown
  clicks?: number;                 // If linkUrl provided
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "flashNews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "startDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "flashNews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "endDate", "order": "ASCENDING" }
  ]
}
```

**Security Rules**:
```javascript
match /flashNews/{newsId} {
  // Anyone can read active news
  allow read: if resource.data.isActive == true
    && resource.data.startDate <= request.time
    && resource.data.endDate >= request.time;
  
  // Only admins can create/update/delete
  allow create, update, delete: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);
}
```

**Sample Documents**:
```json
// Regular announcement
{
  "id": "flash-news-1",
  "text": {
    "en": "New academic year begins January 15, 2025. Registration now open!",
    "ta": "புதிய கல்வியாண்டு ஜனவரி 15, 2025 அன்று தொடங்குகிறது. பதிவு இப்போது திறந்துள்ளது!"
  },
  "isActive": true,
  "isUrgent": false,
  "priority": 5,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-14T23:59:59Z",
  "linkUrl": "/registration",
  "linkText": {
    "en": "Register Now",
    "ta": "இப்போது பதிவு செய்யுங்கள்"
  },
  "createdAt": "2024-12-20T10:00:00Z",
  "updatedAt": "2024-12-20T10:00:00Z",
  "createdBy": "admin-uid-123",
  "publishedAt": "2025-01-01T00:00:00Z"
}

// Urgent announcement
{
  "id": "flash-news-urgent-1",
  "text": {
    "en": "⚠️ School closed tomorrow due to weather conditions",
    "ta": "⚠️ வானிலை காரணமாக நாளை பள்ளி மூடப்பட்டுள்ளது"
  },
  "isActive": true,
  "isUrgent": true,
  "priority": 100,
  "startDate": "2025-01-10T18:00:00Z",
  "endDate": "2025-01-11T23:59:59Z",
  "backgroundColor": "#ff0000",
  "textColor": "#ffffff",
  "createdAt": "2025-01-10T18:00:00Z",
  "updatedAt": "2025-01-10T18:00:00Z",
  "createdBy": "admin-uid-123",
  "publishedAt": "2025-01-10T18:00:00Z"
}
```

---

### 4. newsArticles

**Purpose**: Detailed bilingual news posts/articles with rich content

**Collection**: `newsArticles`

**Document Structure**:
```typescript
interface NewsArticle {
  // Identity
  id: string;
  slug: string;                    // URL-friendly (for /news/:slug)
  
  // Bilingual Content
  title: {
    en: string;
    ta: string;
  };
  summary: {                       // Short preview
    en: string;
    ta: string;
  };
  body: {                          // Rich text / HTML
    en: string;
    ta: string;
  };
  
  // Media
  featuredImage?: string;          // Main image URL
  images?: string[];               // Additional images
  attachments?: Array<{
    name: string;
    url: string;
    type: string;                  // 'pdf', 'doc', 'image', etc.
  }>;
  
  // Categorization
  category: string;                // 'Events', 'Academic', 'Sports', 'Cultural', etc.
  tags?: string[];                 // ['exam', 'registration', 'festival']
  
  // Publishing
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  isPinned: boolean;               // Pin to top of list
  priority: number;                // Sort order
  
  // Scheduling
  publishDate: Timestamp;          // When to publish (can be future)
  expiryDate?: Timestamp;          // Auto-archive after this date
  
  // SEO & Metadata
  metaDescription?: {
    en: string;
    ta: string;
  };
  metaKeywords?: string[];
  
  // Author
  authorId: string;                // User UID
  authorName: string;
  authorRole: string;              // 'Admin', 'Teacher', etc.
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  publishedBy?: string;
  
  // Analytics
  views: number;
  likes: number;
  shares: number;
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "newsArticles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "isPinned", "order": "DESCENDING" },
    { "fieldPath": "publishDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "newsArticles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "publishDate", "order": "DESCENDING" }
  ]
}
```

**Security Rules**:
```javascript
match /newsArticles/{articleId} {
  // Anyone can read published articles
  allow read: if resource.data.status == 'published'
    && resource.data.isActive == true
    && resource.data.publishDate <= request.time;
  
  // Admins can read all (including drafts)
  allow read: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);
  
  // Only admins can create/update/delete
  allow create, update, delete: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);
}
```

**Sample Document**:
```json
{
  "id": "news-christmas-celebration-2025",
  "slug": "christmas-celebration-2025",
  "title": {
    "en": "Annual Christmas Celebration - December 23, 2025",
    "ta": "ஆண்டு கிறிஸ்துமஸ் விழா - டிசம்பர் 23, 2025"
  },
  "summary": {
    "en": "Join us for our annual Christmas celebration featuring cultural performances, carol singing, and more!",
    "ta": "கலாச்சார நிகழ்ச்சிகள், கிறிஸ்துமஸ் பாடல்கள் மற்றும் பலவற்றைக் கொண்ட எங்கள் ஆண்டு கிறிஸ்துமஸ் கொண்டாட்டத்தில் எங்களுடன் சேருங்கள்!"
  },
  "body": {
    "en": "<p>We are excited to invite all families to our annual Christmas celebration...</p>",
    "ta": "<p>எங்கள் ஆண்டு கிறிஸ்துமஸ் கொண்டாட்டத்திற்கு அனைத்து குடும்பங்களையும் அழைக்க மகிழ்ச்சியடைகிறோம்...</p>"
  },
  "featuredImage": "https://storage.googleapis.com/.../christmas-featured.jpg",
  "images": [
    "https://storage.googleapis.com/.../christmas-1.jpg",
    "https://storage.googleapis.com/.../christmas-2.jpg"
  ],
  "attachments": [
    {
      "name": "Event Schedule",
      "url": "https://storage.googleapis.com/.../schedule.pdf",
      "type": "pdf"
    }
  ],
  "category": "Events",
  "tags": ["christmas", "cultural", "celebration", "2025"],
  "status": "published",
  "isActive": true,
  "isPinned": true,
  "priority": 10,
  "publishDate": "2025-12-01T08:00:00Z",
  "expiryDate": "2025-12-26T23:59:59Z",
  "authorId": "admin-uid-123",
  "authorName": "John Doe",
  "authorRole": "Admin",
  "createdAt": "2025-11-25T10:00:00Z",
  "updatedAt": "2025-12-01T07:00:00Z",
  "publishedAt": "2025-12-01T08:00:00Z",
  "publishedBy": "admin-uid-123",
  "views": 245,
  "likes": 18,
  "shares": 5
}
```

---

## Implementation Notes for Static Content

### Client-Side Caching Strategy

1. **heroContent**: 5-minute TTL, real-time listeners
2. **flashNews**: 2-minute TTL, real-time listeners  
3. **newsArticles**: 10-minute TTL for list, no cache for individual articles
4. **thirukkural**: 24-hour TTL (rarely changes)

### Force Cache Eviction

When admin publishes/updates content:
- Firestore real-time listeners automatically notify all connected clients
- Clients update localStorage cache immediately
- No manual refresh needed

### Bilingual Best Practices

1. **Always provide both languages** when creating content
2. **Fallback to English** if Tamil translation missing
3. **Use appropriate fonts** (Noto Sans Tamil for Tamil text)
4. **Test with both languages** before publishing
5. **Character limits** account for Tamil being more verbose

### Performance Considerations

- Use Firestore composite indexes for efficient queries
- Implement pagination for newsArticles list
- Optimize images before upload (WebP format preferred)
- Use CDN for static assets
- Pre-render critical static content at build time

---

**Document Version**: 1.0  
**Maintained By**: GSDTA Development Team
