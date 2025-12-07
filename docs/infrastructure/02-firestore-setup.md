# Firestore Database Setup

**Part 2 of GSDTA Infrastructure Setup**  
**Time Required**: ~15 minutes  
**Prerequisites**: [01-project-setup.md](./01-project-setup.md) completed

---

## 🎯 Overview

This guide covers:
- Creating Firestore database in Native mode
- Deploying security rules
- Deploying composite indexes
- Understanding collections (they auto-create!)
- Verifying database setup

---

## 📋 Prerequisites

```bash
# Verify project is set
gcloud config get-value project
# Should output: your-project-id

# Verify Firebase is added
firebase projects:list
# Should show your project

# Set variables (from Part 1)
export PROJECT_ID="your-project-id"
export REGION="us-central1"
```

---

## 1. Create Firestore Database

### Create Database in Native Mode

```bash
# Create Firestore database
gcloud firestore databases create \
  --location=$REGION \
  --type=firestore-native

# Expected output:
# Create request issued for: [(default)]
# Waiting for operation [projects/your-project/operations/...] to complete...done.
```

### Verify Database Created

```bash
# List databases
gcloud firestore databases list

# Get database details
gcloud firestore databases describe --database="(default)"

# Check location
gcloud firestore databases describe --database="(default)" \
  --format="value(locationId)"
# Should output: us-central1
```

---

## 2. Deploy Security Rules

### Review Security Rules

Security rules are in: `/persistence/firestore.rules`

**Current collections with rules**:
- `users` - User profiles (self-read, admin-write)
- `students` - Student records (admin/teacher-read, admin-write)
- `invites` - Teacher invitations (specific access patterns)
- `heroContent` - Event banners (public-read, admin-write)

### Deploy Rules

```bash
# From repository root
cd /path/to/gsdta-web

# Verify firebase.json exists
cat firebase.json

# Deploy security rules
firebase deploy --only firestore:rules

# Expected output:
# ✔  firestore: deployed indexes in firestore.rules successfully
```

### Verify Rules Deployed

```bash
# List rule releases
firebase firestore:rules list

# Or via gcloud
gcloud firestore rules releases list
```

---

## 3. Deploy Composite Indexes

### Review Indexes

Indexes are in: `/persistence/firestore.indexes.json`

**Current indexes**:
1. `users` collection:
   - `roles` (array) + `updatedAt` (descending)
   - `status` + `updatedAt` (descending)

2. `roleInvites` collection:
   - `status` + `expiresAt` (descending)
   - `email` + `status`

3. `heroContent` collection:
   - `isActive` + `priority` (desc) + `createdAt` (desc)
   - `priority` (desc) + `createdAt` (desc)

### Deploy Indexes

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Expected output:
# ✔  firestore: deployed indexes in firestore.indexes.json successfully
```

### Verify Indexes

```bash
# List composite indexes
gcloud firestore indexes composite list

# Expected output:
# INDEX_ID  COLLECTION_GROUP  QUERY_SCOPE  STATE
# ...       users            COLLECTION   READY
# ...       roleInvites      COLLECTION   READY
# ...       heroContent      COLLECTION   READY

# Check specific index status
gcloud firestore indexes composite list --format="table(name,queryScope,state)"
```

**Note**: Indexes may take a few minutes to build. Status will show:
- `CREATING` - Still building
- `READY` - Ready to use

---

## 4. Understand Collections (Auto-Created!)

### ⚠️ Important: Collections Are Auto-Created

**You DO NOT need to manually create collections!**

Firestore collections are automatically created when the first document is written.

### Collections Used by GSDTA App

1. **`users`** - User profiles
   - **Auto-created**: When first user signs up
   - **Fields**: `uid`, `email`, `name`, `roles`, `status`, `createdAt`, `updatedAt`
   - **Security**: Users can read own profile, admins can write

2. **`students`** - Student records
   - **Auto-created**: When admin adds first student
   - **Fields**: `id`, `firstName`, `lastName`, `parentId`, `grade`, `schoolName`, `dateOfBirth`, etc.
   - **Security**: Admins and teachers can read, admins can write

3. **`invites` or `roleInvites`** - Teacher invitations
   - **Auto-created**: When admin sends first invite
   - **Fields**: `token`, `email`, `role`, `status`, `expiresAt`, `invitedBy`, etc.
   - **Security**: Specific access patterns for invites

4. **`heroContent`** - Event banners for homepage
   - **Auto-created**: When admin creates first hero content
   - **Fields**: `id`, `type`, `title`, `subtitle`, `imageUrl`, `isActive`, `priority`, etc.
   - **Security**: Public read, admin write
   - **Added**: December 2024

5. **Future collections** (will auto-create as features are added):
   - `classes` - Class information
   - `attendance` - Attendance records
   - `grades` - Grade records
   - `announcements` - School announcements

### How Collections Are Created

**In Production**:
```
Admin logs in → Creates first hero content → heroContent collection created ✅
Admin invites teacher → invites collection created ✅
First user signs up → users collection created ✅
```

**In Local Development**:
```bash
# Start emulators
npm run emulators

# Seed test data (creates all collections)
node scripts/seed-emulator.js
```

### View Collections

**Option 1: Firebase Console (Easiest)**
```bash
# Open Firebase Console
open https://console.firebase.google.com

# Navigate to:
# 1. Select your project
# 2. Click "Firestore Database"
# 3. Click "Data" tab
# 4. Collections visible in left sidebar (after first document written)
```

**Option 2: Using Helper Script**
```bash
# From repository root
export PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
node scripts/list-collections.js
```

**Option 3: Export Firestore**
```bash
# Create export bucket (one-time)
gsutil mb gs://$PROJECT_ID-firestore-exports

# Export (will show collections in metadata)
gcloud firestore export gs://$PROJECT_ID-firestore-exports/$(date +%Y%m%d)
```

---

## 5. Verify Database Setup

### Verification Checklist

```bash
# 1. Database exists
gcloud firestore databases list
# Should show: (default) database

# 2. Rules deployed
firebase firestore:rules list
# Should show: latest rule release

# 3. Indexes deployed
gcloud firestore indexes composite list
# Should show: indexes for users, roleInvites, heroContent

# 4. Indexes are READY
gcloud firestore indexes composite list --format="table(name,state)"
# State should be: READY (wait if CREATING)
```

### Test Database Access (Optional)

Create a test document to verify:

```bash
# Create test document
cat > /tmp/test-doc.json << 'TESTDOC'
{
  "fields": {
    "test": {
      "stringValue": "Hello Firestore"
    },
    "timestamp": {
      "timestampValue": "2024-12-07T00:00:00Z"
    }
  }
}
TESTDOC

# Write test document (requires authenticated user or service account)
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @/tmp/test-doc.json \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/test_collection"

# Verify in console:
open https://console.firebase.google.com

# Delete test collection
firebase firestore:delete test_collection --recursive --yes
```

---

## 6. Database Configuration Summary

After completion, your Firestore setup:

```
Database:
  ✅ Name: (default)
  ✅ Type: Firestore Native
  ✅ Location: us-central1
  ✅ Mode: Production

Security Rules:
  ✅ Deployed from: /persistence/firestore.rules
  ✅ Collections covered: users, students, invites, heroContent
  ✅ Public read: heroContent
  ✅ Admin write: all collections

Indexes:
  ✅ Deployed from: /persistence/firestore.indexes.json
  ✅ users: 2 indexes (roles+updatedAt, status+updatedAt)
  ✅ roleInvites: 2 indexes (status+expiresAt, email+status)
  ✅ heroContent: 2 indexes (isActive+priority+createdAt, priority+createdAt)

Collections:
  ⏳ Auto-created on first write (not manually created)
  ⏳ Will appear after application runs
```

---

## 🔧 Troubleshooting

### Issue: Database Already Exists

```bash
# Error: Database (default) already exists
# Solution: This is OK! Verify it's configured correctly
gcloud firestore databases describe --database="(default)"
```

### Issue: Rules Deployment Fails

```bash
# Error: Permission denied
# Solution: Check Firebase project is correct
firebase use --add
firebase projects:list

# Re-deploy
firebase deploy --only firestore:rules
```

### Issue: Indexes Not Building

```bash
# Check index status
gcloud firestore indexes composite list --format="table(name,state)"

# If stuck in CREATING for >10 minutes:
# 1. Check Cloud Console for errors
# 2. Verify indexes are valid in firestore.indexes.json
# 3. Try deleting and re-creating:
#    gcloud firestore indexes composite delete INDEX_ID
#    firebase deploy --only firestore:indexes
```

### Issue: Can't See Collections

```bash
# This is NORMAL if no documents exist yet!
# Collections only appear after first document is written

# Solution 1: Use the app to create first documents
# Solution 2: Run seed script locally (emulator)
# Solution 3: Wait for application deployment and usage
```

---

## 📚 Next Steps

✅ Firestore database is now set up!

**Next**: [03-firebase-auth-setup.md](./03-firebase-auth-setup.md) - Configure Firebase Authentication

---

## 🔗 Related Documentation

- [GCLOUD-COMMANDS.md](../GCLOUD-COMMANDS.md) - Firestore commands reference
- [CORRECTED-COMMANDS.md](../CORRECTED-COMMANDS.md) - Command corrections
- `/persistence/firestore.rules` - Security rules file
- `/persistence/firestore.indexes.json` - Indexes configuration
- `/scripts/list-collections.js` - Helper script to list collections

---

**Completion Time**: ~15 minutes  
**Next Guide**: Firebase Authentication Setup
