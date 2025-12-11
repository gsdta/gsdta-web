# 🚀 Firestore Deployment - Quick Start

**For**: Deploying heroContent feature to GCP  
**Time**: 5-15 minutes

---

## ⚡ Super Quick Deploy

```bash
# 1. Login
firebase login

# 2. Select project
firebase use gsdta-web

# 3. Deploy rules + indexes
firebase deploy --only firestore

# 4. Wait for indexes (repeat until all show READY)
firebase firestore:indexes
```

**Done!** 🎉 Now create your first event banner in the admin UI.

---

## 📋 What This Does

✅ Deploys security rules for `heroContent`  
✅ Creates composite indexes for `heroContent`  
✅ Takes 5-15 minutes for indexes to build  
❌ Does NOT create collections (those are auto-created)

---

## 🎯 After Deployment

1. Wait for indexes to show **READY** status
2. Go to production admin UI
3. Navigate to `/admin/content/hero`
4. Create your first event banner
5. Verify it appears on homepage carousel

---

## ❓ Common Questions

### "Where do I run these commands?"

In your project root: `/Users/guna/projects/gsdta-web`

### "Do I need to create the heroContent collection?"

**NO!** It's created automatically when you publish your first event banner.

### "How do I know when it's done?"

Run `firebase firestore:indexes` - wait until all show "READY" (not "CREATING").

### "What if I get errors?"

See detailed guide: [docs/DEPLOY-FIRESTORE-GUIDE.md](./docs/DEPLOY-FIRESTORE-GUIDE.md)

---

## 🆘 Quick Troubleshooting

**Error: "No projects found"**
```bash
firebase login --reauth
firebase projects:list
```

**Error: "Permission denied"**
```bash
firebase login --reauth
```

**Indexes stuck in "CREATING"**  
Wait up to 24 hours (usually done in 15 minutes)

---

**Full Guide**: [docs/DEPLOY-FIRESTORE-GUIDE.md](./docs/DEPLOY-FIRESTORE-GUIDE.md)
