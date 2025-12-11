# Deploying Firestore to GCP - Step-by-Step Guide

**Last Updated**: December 11, 2025  
**For**: First-time Firestore deployment to GCP

---

## 🎯 Important: Collections vs Indexes

### Collections Are Created Automatically ✅

**You DON'T manually create collections!**

Firestore collections are created automatically when you write the first document to them. For example:

- `users` collection was created when the first user signed up
- `roleInvites` collection was created when admin sent first invite
- `heroContent` collection will be created when admin publishes first event banner

**You only need to deploy**:
1. ✅ Security Rules
2. ✅ Composite Indexes

---

## 📋 What You Need to Deploy

### Currently in GCP ✅

These already exist in your production environment:
- ✅ `users` collection (has data)
- ✅ `roleInvites` collection (has data)
- ✅ Security rules for above collections
- ✅ Indexes for above collections

### What's Missing 🆕

For the new `heroContent` feature:
- ❌ Security rules for `heroContent` (need to deploy)
- ❌ Composite indexes for `heroContent` (need to deploy)
- ⏳ Collection will be created when admin publishes first event

---

## 🚀 Quick Deploy (Do This Now)

### Step 1: Check Your Current Setup

```bash
# Make sure you're in the project root
cd /Users/guna/projects/gsdta-web

# Check if Firebase CLI is installed
firebase --version

# If not installed:
npm install -g firebase-tools

# Login to Firebase
firebase login

# List your projects
firebase projects:list
```

### Step 2: Select Your Project

```bash
# Set the active project (replace with your actual project ID)
firebase use gsdta-web

# Verify it's set
firebase projects:list
# Should show an asterisk (*) next to gsdta-web
```

### Step 3: Deploy Security Rules & Indexes

```bash
# This single command deploys BOTH rules and indexes
firebase deploy --only firestore

# If you want to deploy separately:
firebase deploy --only firestore:rules    # Deploy security rules
firebase deploy --only firestore:indexes  # Deploy composite indexes
```

**What this does**:
1. Reads `persistence/firestore.rules` → Deploys security rules to GCP
2. Reads `persistence/firestore.indexes.json` → Creates composite indexes in GCP
3. Takes 5-15 minutes for indexes to build

### Step 4: Monitor Index Build

```bash
# Check index status
firebase firestore:indexes

# Output will show:
# ┌─────────────────┬────────┬──────────────┬────────────┐
# │ Collection      │ Status │ Fields       │ Query Scope│
# ├─────────────────┼────────┼──────────────┼────────────┤
# │ heroContent     │ READY  │ isActive,... │ COLLECTION │
# └─────────────────┴────────┴──────────────┴────────────┘

# Wait until all show "READY" (not "CREATING")
```

---

## 📝 Detailed Explanation

### What Are Security Rules?

Security rules control who can read/write data:

```javascript
// Example from persistence/firestore.rules
match /heroContent/{docId} {
  // Anyone can read
  allow read: if true;
  
  // Only admins can write
  allow create, update, delete: if isAdmin();
}
```

**Location**: `persistence/firestore.rules`  
**Deploy**: `firebase deploy --only firestore:rules`

### What Are Composite Indexes?

Indexes speed up queries with multiple filters/sorts:

```typescript
// This query needs an index:
firestore.collection('heroContent')
  .where('isActive', '==', true)        // Filter 1
  .orderBy('priority', 'desc')          // Sort 1
  .orderBy('createdAt', 'desc')         // Sort 2
```

**Location**: `persistence/firestore.indexes.json`  
**Deploy**: `firebase deploy --only firestore:indexes`

### Why Do I Need to Deploy?

Local development uses Firebase Emulators (fake database). Your production GCP Firestore needs the real rules and indexes.

**Local** (Emulators):
- Rules from `persistence/firestore.rules` (auto-loaded)
- Indexes auto-created on first query
- Data is temporary

**Production** (GCP):
- Rules must be deployed
- Indexes must be deployed (manual creation not allowed)
- Data persists forever

---

## 🎬 Complete Walkthrough Example

Here's exactly what happens when you deploy:

### Before Deployment

**Your GCP Firestore has**:
```
Collections:
  └── users (2 docs)
  └── roleInvites (0 docs)

Rules:
  ✅ users (deployed)
  ✅ roleInvites (deployed)
  ❌ heroContent (missing)

Indexes:
  ✅ users: roles + updatedAt
  ✅ users: status + updatedAt
  ✅ roleInvites: status + expiresAt
  ❌ heroContent indexes (missing)
```

### Run Deployment

```bash
firebase deploy --only firestore
```

**Output**:
```
=== Deploying to 'gsdta-web'...

i  deploying firestore
i  firestore: reading indexes from persistence/firestore.indexes.json...
i  firestore: reading rules from persistence/firestore.rules...
✔  firestore: rules file persistence/firestore.rules compiled successfully
i  firestore: uploading rules persistence/firestore.rules...
✔  firestore: released rules persistence/firestore.rules to 
   cloud.firestore
i  firestore: creating indexes...
✔  firestore: indexes created successfully

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/gsdta-web/overview
```

### After Deployment (Immediate)

**Your GCP Firestore has**:
```
Collections:
  └── users (2 docs)
  └── roleInvites (0 docs)
  └── heroContent (0 docs - will appear when first doc added)

Rules:
  ✅ users
  ✅ roleInvites
  ✅ heroContent (NEW - deployed!)

Indexes:
  ✅ users: roles + updatedAt
  ✅ users: status + updatedAt
  ✅ roleInvites: status + expiresAt
  ⏳ heroContent: isActive + priority + createdAt (CREATING...)
  ⏳ heroContent: priority + createdAt (CREATING...)
```

### After 5-15 Minutes

Check status:
```bash
firebase firestore:indexes
```

**Output**:
```
┌──────────────┬────────┬──────────────────────────────┬─────────────┐
│ Collection   │ Status │ Fields                       │ Query Scope │
├──────────────┼────────┼──────────────────────────────┼─────────────┤
│ heroContent  │ READY  │ isActive,priority,createdAt  │ COLLECTION  │
│ heroContent  │ READY  │ priority,createdAt           │ COLLECTION  │
│ users        │ READY  │ roles,updatedAt              │ COLLECTION  │
│ users        │ READY  │ status,updatedAt             │ COLLECTION  │
│ roleInvites  │ READY  │ status,expiresAt             │ COLLECTION  │
│ roleInvites  │ READY  │ email,status                 │ COLLECTION  │
└──────────────┴────────┴──────────────────────────────┴─────────────┘

All indexes ready! ✅
```

Now your production app can query `heroContent` efficiently!

---

## 🧪 Testing After Deployment

### Step 1: Verify Rules Deployed

Go to Firebase Console:
1. Visit https://console.firebase.google.com
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. You should see rules for `heroContent`

### Step 2: Verify Indexes Deployed

In same console:
1. Go to **Firestore Database** → **Indexes**
2. Look for `heroContent` indexes
3. Status should be "Enabled" (not "Building")

### Step 3: Create First Hero Content

1. Log in to your production admin UI
2. Go to `/admin/content/hero`
3. Create an event banner
4. Publish it

This will:
- ✅ Create `heroContent` collection (automatically!)
- ✅ Add first document
- ✅ Make it visible on homepage carousel

---

## 🔧 Troubleshooting

### Error: "No projects found"

```bash
# Login again
firebase login

# List projects
firebase projects:list

# If your project isn't listed, add it:
firebase use --add
# Then select your project from the list
```

### Error: "Permission denied"

```bash
# Make sure you're logged in with correct account
firebase login

# Check current user
firebase login:list

# Use correct account
firebase login --reauth
```

### Error: "Index already exists"

This is fine! It means indexes were already deployed. Your deployment succeeded.

### Error: "Index build failed"

```bash
# Delete the failed index
firebase firestore:indexes:delete <index-id>

# Re-deploy
firebase deploy --only firestore:indexes

# Check status
firebase firestore:indexes
```

### Indexes stuck in "CREATING" for hours

- This is rare but can happen with large datasets
- Usually resolves within 24 hours
- Contact Firebase support if stuck > 24 hours

---

## 📋 Deployment Checklist

Before you start:
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in (`firebase login`)
- [ ] Project selected (`firebase use gsdta-web`)
- [ ] In project root directory

Deploy:
- [ ] Run `firebase deploy --only firestore`
- [ ] Wait 5-15 minutes for indexes
- [ ] Verify with `firebase firestore:indexes`
- [ ] All indexes show "READY"

Test:
- [ ] Check Firebase Console (rules + indexes visible)
- [ ] Create first hero content in admin UI
- [ ] Verify it appears on homepage
- [ ] Test carousel functionality

---

## 🎯 Summary

**You need to deploy**: Security rules + Indexes  
**You DON'T create**: Collections (auto-created)  
**Command**: `firebase deploy --only firestore`  
**Time**: 5-15 minutes for indexes to build  
**Verify**: `firebase firestore:indexes` shows all READY  

**After deployment**:
- Admin can create hero content
- Homepage carousel will work
- All queries will be fast (indexes ready)

---

## 🆘 Still Confused?

Run these commands in order:

```bash
# 1. Make sure you're in project root
cd /Users/guna/projects/gsdta-web

# 2. Login
firebase login

# 3. Select project (replace with your project ID if different)
firebase use gsdta-web

# 4. Deploy everything
firebase deploy --only firestore

# 5. Wait and check (repeat every minute until all READY)
firebase firestore:indexes

# 6. When all ready, test in production admin UI
```

That's it! 🎉

---

## 📊 Visual Guide: What Gets Deployed

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR LOCAL PROJECT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  persistence/                                                   │
│  ├── firestore.rules  ─────────┐                              │
│  │   (Security Rules)           │                              │
│  │                               │                              │
│  └── firestore.indexes.json ────┼───┐                          │
│      (Composite Indexes)         │   │                          │
│                                  │   │                          │
│                                  │   │                          │
│         firebase deploy          │   │                          │
│         --only firestore         │   │                          │
│                                  │   │                          │
│                                  ▼   ▼                          │
└─────────────────────────────────────────────────────────────────┘
                                  │   │
                                  │   │
                    DEPLOYS TO    │   │
                                  │   │
                                  ▼   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GCP FIRESTORE (Production)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Security Rules: ✅                                             │
│  ├── users rules                                                │
│  ├── roleInvites rules                                          │
│  └── heroContent rules (NEW!)                                   │
│                                                                 │
│  Composite Indexes: ✅                                          │
│  ├── users indexes (2 indexes)                                  │
│  ├── roleInvites indexes (2 indexes)                            │
│  └── heroContent indexes (2 NEW indexes) ⏳ Building...         │
│                                                                 │
│  Collections: (Auto-created when first doc written)            │
│  ├── users (exists - has 2+ docs)                              │
│  ├── roleInvites (exists - may be empty)                       │
│  └── heroContent (will appear when admin creates first event)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts Explained

### Concept 1: Collections Are NOT Pre-Created

❌ **WRONG WAY** (doesn't work):
```bash
# These commands don't exist:
gcloud firestore create-collection heroContent  # ❌ Not a thing
firebase firestore:create heroContent           # ❌ Not a thing
```

✅ **RIGHT WAY** (automatic):
```typescript
// Collections appear when you write first document
await firestore.collection('heroContent').add({
  title: "Annual Day",
  isActive: true,
  // ... rest of data
});
// ↑ This creates the "heroContent" collection automatically!
```

### Concept 2: Indexes MUST Be Deployed

**Why?** Compound queries need indexes:

```typescript
// This query needs an index:
firestore
  .collection('heroContent')
  .where('isActive', '==', true)   // ← Filter
  .orderBy('priority', 'desc')     // ← Sort 1
  .orderBy('createdAt', 'desc')    // ← Sort 2

// Without index → Error: "The query requires an index"
// With index → Fast query! ⚡
```

**How to deploy**:
```bash
firebase deploy --only firestore:indexes
```

### Concept 3: Rules Protect Your Data

**Without rules** → Anyone can read/write everything! 😱

**With rules** → Only authorized users can access:

```javascript
// From firestore.rules
match /heroContent/{docId} {
  // Anyone can read hero content (public homepage)
  allow read: if true;
  
  // Only admins can create/edit/delete
  allow write: if request.auth != null 
               && get(/databases/$(database)/documents/users/$(request.auth.uid))
                  .data.roles.hasAny(['admin']);
}
```

---

## 🎬 Real-World Example

Let's say you just deployed and want to create your first event banner:

### Step 1: Deploy (one-time setup)

```bash
cd /Users/guna/projects/gsdta-web
firebase deploy --only firestore
```

**Result**:
- Rules deployed ✅
- Indexes start building ⏳ (5-15 min)

### Step 2: Wait for indexes

```bash
firebase firestore:indexes

# Keep checking until you see:
# heroContent  │ READY  │ isActive,priority,createdAt  │ COLLECTION
# heroContent  │ READY  │ priority,createdAt           │ COLLECTION
```

### Step 3: Create first event in production

1. Go to your production app (e.g., https://gsdta-web.com)
2. Log in as admin
3. Navigate to `/admin/content/hero`
4. Fill out the form:
   ```
   Title (EN): Annual Day Celebration 2024
   Title (TA): ஆண்டு விழா 2024
   Start Date: 2024-12-15
   End Date: 2025-01-31
   Active: ✅ Yes
   ```
5. Click "Save"

**What happens behind the scenes**:

```typescript
// Your app runs this code:
const docRef = await firestore.collection('heroContent').add({
  id: 'evt_2024_annual_day',
  type: 'event',
  title: { en: 'Annual Day...', ta: 'ஆண்டு விழா...' },
  isActive: true,
  priority: 10,
  startDate: Timestamp.fromDate(new Date('2024-12-15')),
  endDate: Timestamp.fromDate(new Date('2025-01-31')),
  createdAt: Timestamp.now(),
  createdBy: 'admin_uid_here'
});

// 1. Firestore sees "heroContent" collection doesn't exist
// 2. Firestore automatically creates "heroContent" collection
// 3. Document is added to the new collection
// 4. Collection now appears in Firebase Console!
```

### Step 4: Verify it works

1. Go to homepage (https://gsdta-web.com)
2. You should see the carousel alternating:
   - Slide 1: Your event banner
   - Slide 2: Random Thirukkural
3. Auto-switches every 10 seconds
4. Manual navigation works with dots

---

## 🆘 Quick Troubleshooting

### "I deployed but don't see heroContent collection"

**This is NORMAL!** The collection only appears after you create the first document. Go to admin UI and create your first event banner.

### "Query requires an index"

**Solution**: Wait for indexes to finish building
```bash
firebase firestore:indexes
# Wait until status = READY (not CREATING)
```

### "Permission denied"

**Possible causes**:
1. Rules didn't deploy → Re-run `firebase deploy --only firestore:rules`
2. User not admin → Check user's `roles` field in Firestore
3. Not logged in → Make sure you're authenticated

### "I don't know my project ID"

```bash
# List all your Firebase projects
firebase projects:list

# Output shows:
# ┌─────────────┬───────────────┬────────────────┬──────────────┐
# │ Project ID  │ Display Name  │ Resource Name  │ Status       │
# ├─────────────┼───────────────┼────────────────┼──────────────┤
# │ gsdta-web   │ GSDTA Web     │ ...            │ ACTIVE       │
# └─────────────┴───────────────┴────────────────┴──────────────┘

# Use the "Project ID" column
firebase use gsdta-web
```

---

## ✅ Success Checklist

After running `firebase deploy --only firestore`:

### Immediate (< 1 minute)
- [ ] Command completed without errors
- [ ] Saw "✔ firestore: rules compiled successfully"
- [ ] Saw "✔ firestore: indexes created successfully"

### After 5-15 minutes
- [ ] `firebase firestore:indexes` shows all indexes as READY
- [ ] Firebase Console shows heroContent indexes
- [ ] Firebase Console shows heroContent rules

### After creating first event
- [ ] Admin UI successfully saves event banner
- [ ] Homepage carousel shows the event
- [ ] Carousel alternates between event and Thirukkural
- [ ] Manual navigation works

---

## 📞 Need More Help?

**Documentation**:
- [FIRESTORE-SETUP.md](./FIRESTORE-SETUP.md) - Technical details
- [FIRESTORE-COLLECTIONS.md](./FIRESTORE-COLLECTIONS.md) - Data models

**Firebase Docs**:
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

**Support**:
- Firebase Support: https://firebase.google.com/support
- Firebase Discord: https://discord.gg/firebase

---

## 🎓 TL;DR (Too Long, Didn't Read)

**What you need to know**:
1. Collections are created automatically (don't create manually)
2. Deploy rules + indexes: `firebase deploy --only firestore`
3. Wait for indexes to build (5-15 min)
4. Create first event in admin UI
5. Collection appears automatically

**What you need to run**:
```bash
firebase login
firebase use gsdta-web
firebase deploy --only firestore
firebase firestore:indexes  # Wait until all READY
```

**That's it!** 🎉

