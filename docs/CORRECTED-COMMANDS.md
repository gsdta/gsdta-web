# Corrected GCloud & Firebase Commands

**Date**: December 7, 2024  
**Issue**: Some commands in documentation don't exist  
**Status**: ✅ CORRECTED

---

## ❌ Commands That DON'T Exist

### Firestore Collections

```bash
# ❌ WRONG - These commands don't exist:
gcloud firestore collections list
firebase firestore:list
```

---

## ✅ CORRECT Commands

### How to View Firestore Collections

#### Option 1: Firebase Console (Easiest)

```bash
# Open Firebase Console in browser
open https://console.firebase.google.com

# Then navigate to:
# 1. Select your project
# 2. Click "Firestore Database" in left sidebar
# 3. Click "Data" tab
# 4. All collections are visible in left sidebar
```

#### Option 2: Using Node.js Script (We Created This)

```bash
# For local emulator:
export FIRESTORE_EMULATOR_HOST="localhost:8889"
export PROJECT_ID="demo-gsdta"
node scripts/list-collections.js

# For production (requires service account key):
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export PROJECT_ID="your-production-project-id"
node scripts/list-collections.js
```

#### Option 3: Export Firestore (Indirect Way)

```bash
# Create export bucket (one-time)
gsutil mb gs://$PROJECT_ID-firestore-exports

# Export Firestore (will show all collections in metadata)
gcloud firestore export gs://$PROJECT_ID-firestore-exports/$(date +%Y%m%d)

# Check export metadata to see collections
gsutil cat gs://$PROJECT_ID-firestore-exports/EXPORT_DATE/EXPORT_METADATA_FILE
```

---

## ✅ Commands That DO Work

### Firestore Database

```bash
# List Firestore databases
gcloud firestore databases list

# Get database info
gcloud firestore databases describe --database="(default)"

# Create Firestore database
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native
```

### Firestore Indexes

```bash
# List composite indexes
gcloud firestore indexes composite list

# List field indexes
gcloud firestore indexes fields list
```

### Firestore Operations

```bash
# List operations
gcloud firestore operations list

# Export data
gcloud firestore export gs://YOUR_BUCKET/path

# Import data
gcloud firestore import gs://YOUR_BUCKET/path

# Bulk delete
gcloud firestore bulk-delete
```

### Firebase Firestore Commands

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Delete collection (DANGEROUS!)
firebase firestore:delete COLLECTION_PATH --recursive --yes

# Delete specific document
firebase firestore:delete COLLECTION_PATH/DOCUMENT_ID

# List indexes
firebase firestore:indexes

# List databases
firebase firestore:databases:list
```

---

## 📝 Summary

### To View Collections:

1. **Best way**: Firebase Console (GUI) ✅
2. **Programmatic**: Use our script (`scripts/list-collections.js`) ✅
3. **Alternative**: Export Firestore and check metadata ✅

### Collections Are Auto-Created:

You **DO NOT** need to manually create collections. They are automatically created when:
- First document is written to that collection
- Via application code (e.g., admin creates first hero content)
- Via seed script (`node scripts/seed-emulator.js`)

### Verify Collections Exist:

After using the app, collections should exist:
- `users` - After first user signup
- `students` - After admin adds first student
- `invites` - After admin invites first teacher
- `heroContent` - After admin creates first hero content

---

## 🔧 For GSDTA App

### Local Development (with emulators):

```bash
# Start emulators
npm run emulators

# Seed test data (creates all collections)
node scripts/seed-emulator.js

# List collections in emulator
export FIRESTORE_EMULATOR_HOST="localhost:8889"
export PROJECT_ID="demo-gsdta"
node scripts/list-collections.js
```

### Production:

```bash
# View collections via Firebase Console:
open https://console.firebase.google.com

# Or use the script with service account:
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
export PROJECT_ID="your-project-id"
node scripts/list-collections.js
```

---

## See Also

- [GCLOUD-COMMANDS.md](./GCLOUD-COMMANDS.md) - Updated with correct commands
- [INFRASTRUCTURE-SETUP.md](./INFRASTRUCTURE-SETUP.md) - Updated setup guide
- [HERO-CONTENT-README.md](../HERO-CONTENT-README.md) - Hero content feature guide

---

**Last Updated**: December 7, 2024
