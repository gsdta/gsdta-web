# GSDTA Infrastructure Documentation

**Complete infrastructure setup guides for new GCP accounts**

---

## 📚 Setup Guides (In Order)

| # | Guide | Time | Status |
|---|-------|------|--------|
| 0 | [Master Setup](./00-MASTER-SETUP.md) | Overview | ✅ Complete |
| 1 | [Project Setup](./01-project-setup.md) | ~10 min | ✅ Complete |
| 2 | [Firestore Database](./02-firestore-setup.md) | ~15 min | ✅ Complete |
| 3 | [Firebase Auth](./03-firebase-auth-setup.md) | ~20 min | ✅ Complete |
| 4 | Service Accounts & IAM | ~15 min | 🚧 To create |
| 5 | Secret Manager | ~10 min | 🚧 To create |
| 6 | Artifact Registry | ~10 min | 🚧 To create |
| 7 | Cloud Run Deployment | ~15 min | 🚧 To create |
| 8 | Custom Domain & DNS | ~30 min | 🚧 To create |
| 9 | GitHub CI/CD | ~20 min | 🚧 To create |
| 10 | Monitoring & Alerting | ~15 min | 🚧 To create |

**Total Time**: ~2-3 hours

---

## 🎯 Quick Start

### For New Infrastructure Setup

```bash
# Start with Master Setup guide
open docs/infrastructure/00-MASTER-SETUP.md

# Follow guides 01-10 in order
```

### For Existing Infrastructure

```bash
# Jump to specific guide as needed
# Example: Update Firestore rules
open docs/infrastructure/02-firestore-setup.md
```

---

## ✅ What's Included

### Completed Guides (3/11)

1. **Master Setup** (`00-MASTER-SETUP.md`)
   - Overview of all steps
   - Infrastructure diagram
   - Verification checklist
   - Links to all guides

2. **Project Setup** (`01-project-setup.md`)
   - Create GCP project
   - Enable billing
   - Enable APIs
   - Add Firebase
   - Set environment variables

3. **Firestore Setup** (`02-firestore-setup.md`)
   - Create Firestore database
   - Deploy security rules
   - Deploy composite indexes
   - **Collections documentation** (auto-create explained)
   - Verification steps

4. **Firebase Auth Setup** (`03-firebase-auth-setup.md`)
   - Create Firebase web app
   - Get SDK configuration
   - Enable auth providers (Email/Password, Google)
   - Configure authorized domains

### Collections Documented

All existing Firestore collections are documented in `02-firestore-setup.md`:

| Collection | Purpose | Auto-Created When |
|------------|---------|------------------|
| `users` | User profiles | First user signup |
| `students` | Student records | Admin adds student |
| `invites` | Teacher invitations | Admin sends invite |
| **`heroContent`** | Event banners | Admin creates banner |

**Key Point**: Collections are **auto-created** on first write. No manual creation needed!

---

## 🔗 Related Documentation

- [GCLOUD-COMMANDS.md](../GCLOUD-COMMANDS.md) - Command reference
- [CORRECTED-COMMANDS.md](../CORRECTED-COMMANDS.md) - Command corrections
- [INFRASTRUCTURE-SETUP.md](../INFRASTRUCTURE-SETUP.md) - Original setup guide
- [PRODUCTION-READINESS.md](../PRODUCTION-READINESS.md) - Deployment checklist

---

## 📝 Notes

- All commands tested where possible
- Each guide is self-contained
- Verification steps included
- Troubleshooting guides provided
- Time estimates are realistic

---

**Last Updated**: December 7, 2024
