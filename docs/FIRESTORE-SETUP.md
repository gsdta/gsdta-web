# Firestore Collections Setup Guide

**Project**: GSDTA Web Application  
**Purpose**: GCP Firestore collection creation and index deployment  
**Last Updated**: December 11, 2025

---

## Overview

This guide provides step-by-step instructions for setting up all Firestore collections in GCP for the GSDTA web application. Collections are organized by implementation phase to match feature rollout.

### Prerequisites

- GCP Project ID: `gsdta-web` (or your project ID)
- `gcloud` CLI installed and authenticated
- Firebase CLI installed (`npm install -g firebase-tools`)
- Project location: `us-central1`

---

## Current State (Production)

### ✅ Collections Currently in GCP

Based on your production environment, only these collections exist:

1. **users** - User accounts and profiles
2. **roleInvites** - Teacher/admin invitation system

### 🆕 Collections Implemented (Not Yet in GCP)

3. **heroContent** - Event banners for homepage hero section

---

## Quick Setup Commands

### 1. Deploy Firestore Rules & Indexes

```bash
# Authenticate with Firebase
firebase login

# Set your project
firebase use gsdta-web  # Replace with your project ID

# Deploy security rules and indexes together
firebase deploy --only firestore

# Or deploy separately
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

**What this does**:
- Deploys `persistence/firestore.rules` → Security rules
- Deploys `persistence/firestore.indexes.json` → Composite indexes
- Creates all indexes defined (takes 5-15 minutes)

---

## Phase 1: Foundation Collections (Current Features)

### Collection 1: `users`

**Purpose**: User accounts for all roles (admin, teacher, parent)

**Document Structure**:
```typescript
{
  uid: string;              // Firebase Auth UID (document ID)
  email: string;            // User email
  displayName: string;      // Full name
  roles: string[];          // ['admin'] | ['teacher'] | ['parent']
  status: string;           // 'active' | 'inactive' | 'pending'
  createdAt: Timestamp;     // Account creation
  updatedAt: Timestamp;     // Last update
  profilePhotoURL?: string; // Optional profile photo
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "users",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
}
```

**GCloud Commands**:
```bash
# No manual creation needed - collection created automatically
# when first document is written via Firebase SDK

# Verify collection exists
gcloud firestore databases list --project=gsdta-web

# View documents (not recommended for production with real data)
# Use Firebase Console instead: https://console.firebase.google.com
```

---

### Collection 2: `roleInvites`

**Purpose**: Teacher and admin invitation system

**Document Structure**:
```typescript
{
  token: string;            // Unique invite token (document ID)
  email: string;            // Invitee email
  role: string;             // 'teacher' | 'admin'
  status: string;           // 'pending' | 'accepted' | 'expired'
  createdBy: string;        // Admin UID who created invite
  createdAt: Timestamp;     // Invite creation time
  expiresAt: Timestamp;     // Expiration time (72 hours default)
  acceptedAt?: Timestamp;   // When invite was accepted
  acceptedBy?: string;      // UID of user who accepted
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "roleInvites",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "roleInvites",
  "fields": [
    { "fieldPath": "email", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**GCloud Commands**:
```bash
# Collection created automatically when admin creates first invite
# No manual setup required

# Check if collection exists
firebase firestore:get roleInvites --limit=1
```

---

### Collection 3: `heroContent`

**Purpose**: Event banners for homepage hero section (alternates with Thirukkural)

**Document Structure**:
```typescript
{
  id: string;               // Document ID
  type: 'event';            // Content type
  title: {
    en: string;             // English title
    ta: string;             // Tamil title
  };
  subtitle: {
    en: string;
    ta: string;
  };
  description?: {
    en: string;
    ta: string;
  };
  imageUrl?: string;        // Event image URL
  ctaText?: {
    en: string;
    ta: string;
  };
  ctaLink?: string;         // Call-to-action link
  startDate?: Timestamp;    // Event start date/time
  endDate?: Timestamp;      // Event end date/time
  isActive: boolean;        // Is currently active
  priority: number;         // Display priority (higher = first)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;        // Admin UID
  updatedBy: string;
}
```

**Indexes Required**:
```json
{
  "collectionGroup": "heroContent",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "heroContent",
  "fields": [
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Deploy to GCP**:
```bash
# 1. Ensure indexes are in persistence/firestore.indexes.json
#    (Already done - see file)

# 2. Deploy indexes
firebase deploy --only firestore:indexes --project=gsdta-web

# 3. Wait for index creation (5-15 minutes)
firebase firestore:indexes --project=gsdta-web

# 4. Collection will be created when admin publishes first event banner
```

---

## Phase 2: Student & Class Management (Upcoming)

### Collection 4: `students`

**Purpose**: Student master records

**Document Structure**:
```typescript
{
  id: string;               // Auto-generated document ID
  firstName: string;
  lastName: string;
  dateOfBirth: string;      // ISO 8601: YYYY-MM-DD
  gender: string;           // 'Male' | 'Female' | 'Other'
  grade: string;            // Current grade level
  enrollmentDate: Timestamp;
  status: string;           // 'active' | 'inactive' | 'withdrawn'
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  parentUIDs: string[];     // Array of parent user IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;        // Admin UID
}
```

**Indexes Needed**:
```json
{
  "collectionGroup": "students",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "lastName", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "students",
  "fields": [
    { "fieldPath": "grade", "order": "ASCENDING" },
    { "fieldPath": "lastName", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "students",
  "fields": [
    { "fieldPath": "parentUIDs", "arrayConfig": "CONTAINS" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**Deploy Commands**:
```bash
# 1. Add indexes to persistence/firestore.indexes.json
# 2. Deploy
firebase deploy --only firestore:indexes --project=gsdta-web

# 3. Wait for index build
firebase firestore:indexes --project=gsdta-web
```

---

### Collection 5: `classes`

**Purpose**: Class definitions (Math 101, Tamil 202, etc.)

**Document Structure**:
```typescript
{
  id: string;               // Auto-generated
  name: string;             // Class name (e.g., "Tamil 101")
  grade: string;            // Grade level
  subject: string;          // Subject (Tamil, Math, etc.)
  academicYear: string;     // "2025-2026"
  teacherUID?: string;      // Assigned teacher
  schedule: {
    dayOfWeek: string;      // 'Sunday' | 'Monday' | ...
    startTime: string;      // "09:00"
    endTime: string;        // "10:30"
  };
  maxStudents: number;      // Class capacity
  enrolledCount: number;    // Current enrollment
  status: string;           // 'active' | 'inactive'
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

**Indexes Needed**:
```json
{
  "collectionGroup": "classes",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "grade", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "classes",
  "fields": [
    { "fieldPath": "teacherUID", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

### Collection 6: `studentClassEnrollments`

**Purpose**: Track student enrollment in classes

**Document Structure**:
```typescript
{
  id: string;               // Auto-generated
  studentId: string;        // Reference to students collection
  classId: string;          // Reference to classes collection
  academicYear: string;     // "2025-2026"
  enrollmentDate: Timestamp;
  status: string;           // 'active' | 'dropped' | 'completed'
  finalGrade?: string;      // Final grade for completed courses
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes Needed**:
```json
{
  "collectionGroup": "studentClassEnrollments",
  "fields": [
    { "fieldPath": "studentId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "studentClassEnrollments",
  "fields": [
    { "fieldPath": "classId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

## Complete Deployment Script

### Step-by-Step GCP Setup

```bash
#!/bin/bash
# deploy-firestore.sh - Complete Firestore setup for GCP

PROJECT_ID="gsdta-web"  # Replace with your project ID

echo "🔧 Deploying Firestore configuration to GCP..."

# 1. Set project
firebase use "$PROJECT_ID"

# 2. Deploy security rules
echo "📋 Deploying security rules..."
firebase deploy --only firestore:rules --project="$PROJECT_ID"

# 3. Deploy indexes
echo "📊 Deploying composite indexes..."
firebase deploy --only firestore:indexes --project="$PROJECT_ID"

# 4. Check index status
echo "⏳ Checking index build status..."
firebase firestore:indexes --project="$PROJECT_ID"

echo "✅ Deployment complete!"
echo ""
echo "⚠️  Note: Indexes may take 5-15 minutes to build"
echo "Check status: firebase firestore:indexes --project=$PROJECT_ID"
echo ""
echo "📝 Collections will be created automatically when first document is written"
echo "   - users: Created on user signup/invite accept"
echo "   - roleInvites: Created when admin sends first invite"
echo "   - heroContent: Created when admin publishes first event banner"
echo "   - students: Will be created when student management feature is deployed"
echo "   - classes: Will be created when class management feature is deployed"
```

Save this as `deploy-firestore.sh` and run:
```bash
chmod +x deploy-firestore.sh
./deploy-firestore.sh
```

---

## Verification Commands

### Check Collections in GCP

```bash
# List all collections (requires data)
firebase firestore:list --project=gsdta-web

# Check specific collection
firebase firestore:get users --limit=5 --project=gsdta-web
firebase firestore:get roleInvites --limit=5 --project=gsdta-web
firebase firestore:get heroContent --limit=5 --project=gsdta-web

# Check index status
firebase firestore:indexes --project=gsdta-web
```

### View in Firebase Console

1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to **Firestore Database**
4. View collections and documents

---

## Index Build Status

After deploying indexes, monitor their status:

```bash
# Check all indexes
firebase firestore:indexes --project=gsdta-web

# Output will show:
# - CREATING: Index is being built
# - READY: Index is ready to use
# - ERROR: Index build failed
```

**Expected build time**: 5-15 minutes per index

---

## Security Rules Deployment

Security rules are in `persistence/firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules --project=gsdta-web
```

**Current rules protect**:
- Users can only read/write their own profile
- Only admins can create invites
- Only admins can manage hero content
- Role-based access enforced

---

## Troubleshooting

### Issue: Index build failed

```bash
# Delete failed index
firebase firestore:indexes:delete <index-id> --project=gsdta-web

# Re-deploy
firebase deploy --only firestore:indexes --project=gsdta-web
```

### Issue: Collection not showing

- Collections only appear after first document is created
- Run seed script in emulator, then deploy to prod via admin UI

### Issue: Permission denied

```bash
# Check if you're authenticated
gcloud auth list

# Re-authenticate
gcloud auth login
firebase login
```

---

## Production Seed Data

**⚠️ DO NOT use seed script in production!**

For production, use the admin UI to:
1. Create first admin user manually via Firebase Console
2. Use admin UI to:
   - Send teacher invites
   - Create hero content (event banners)
   - Add students (when feature is ready)
   - Create classes (when feature is ready)

---

## Next Steps

After deploying Firestore configuration:

1. ✅ Verify indexes are built (all show READY)
2. ✅ Test security rules in Firebase Console
3. ✅ Create first admin user in Firebase Authentication
4. ✅ Add admin role to user document in Firestore
5. ✅ Test admin login and hero content creation
6. ✅ Send first teacher invite and verify acceptance flow

---

## Summary

**Current Collections (3)**:
- ✅ `users` - Already in GCP
- ✅ `roleInvites` - Already in GCP  
- 🆕 `heroContent` - **Deploy indexes now** (feature implemented)

**Upcoming Collections (3)**:
- ⏳ `students` - When student management is deployed
- ⏳ `classes` - When class management is deployed
- ⏳ `studentClassEnrollments` - When enrollment feature is deployed

**Quick Deploy**:
```bash
firebase deploy --only firestore --project=gsdta-web
```

This deploys both rules and indexes for all collections! 🚀
