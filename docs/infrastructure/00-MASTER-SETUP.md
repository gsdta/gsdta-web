# GSDTA Infrastructure Setup - Master Guide

**Project**: GSDTA Web Application  
**Purpose**: Complete infrastructure recreation for new GCP accounts  
**Last Updated**: December 7, 2024

---

## 🎯 Overview

This is the **master guide** for recreating the entire GSDTA infrastructure in a new Google Cloud account. Follow the guides in order.

---

## 📋 Prerequisites

### Required Tools

```bash
# 1. Google Cloud CLI
# Download: https://cloud.google.com/sdk/docs/install
gcloud version

# 2. Firebase CLI
npm install -g firebase-tools
firebase --version

# 3. Node.js LTS (v20+)
node --version

# 4. Docker Desktop (for local testing)
docker --version
```

### Required Access

- ✅ Google Cloud billing account access (owner/billing admin)
- ✅ GitHub repository admin access (for CI/CD secrets)
- ✅ AWS Route 53 access (for DNS management)
- ✅ Domain ownership verification (gsdta.com)

### Authenticate

```bash
# Google Cloud
gcloud auth login
gcloud auth application-default login

# Firebase
firebase login
```

---

## 📚 Setup Guides (Follow in Order)

### 1. Project & Initial Setup
**Guide**: [01-project-setup.md](./01-project-setup.md)

**What it covers**:
- Create GCP project
- Enable billing
- Set project variables
- Enable required APIs
- Add Firebase to project

**Time**: ~10 minutes

---

### 2. Firestore Database Setup
**Guide**: [02-firestore-setup.md](./02-firestore-setup.md)

**What it covers**:
- Create Firestore database (Native mode)
- Deploy security rules
- Deploy composite indexes
- Understand collections (auto-created)
- Verify database setup

**Time**: ~15 minutes

---

### 3. Firebase Authentication Setup
**Guide**: [03-firebase-auth-setup.md](./03-firebase-auth-setup.md)

**What it covers**:
- Create Firebase web app
- Configure authentication providers (Google, Email/Password)
- Set authorized domains
- Get Firebase config values
- Configure environment variables

**Time**: ~20 minutes (includes manual console steps)

---

### 4. Service Accounts & IAM
**Guide**: [04-service-accounts-iam.md](./04-service-accounts-iam.md)

**What it covers**:
- Create runtime service account (Cloud Run)
- Create CI/CD service account (GitHub Actions)
- Grant Firestore permissions
- Grant Secret Manager permissions
- Grant Artifact Registry permissions
- Generate service account keys (optional, local dev only)

**Time**: ~15 minutes

---

### 5. Secret Manager Setup
**Guide**: [05-secret-manager.md](./05-secret-manager.md)

**What it covers**:
- Create secrets for Firebase config
- Create secrets for API keys
- Grant service account access to secrets
- Verify secret access

**Time**: ~10 minutes

---

### 6. Artifact Registry Setup
**Guide**: [06-artifact-registry.md](./06-artifact-registry.md)

**What it covers**:
- Create Docker repository
- Configure Docker authentication
- Build and push first image
- Verify image registry

**Time**: ~10 minutes

---

### 7. Cloud Run Deployment
**Guide**: [07-cloud-run-deployment.md](./07-cloud-run-deployment.md)

**What it covers**:
- Deploy application to Cloud Run
- Configure environment variables
- Set scaling parameters
- Configure service account
- Get service URL

**Time**: ~15 minutes

---

### 8. Custom Domain & DNS
**Guide**: [08-custom-domain-dns.md](./08-custom-domain-dns.md)

**What it covers**:
- Map custom domain to Cloud Run
- Configure DNS records in AWS Route 53
- Verify domain mapping
- Enable HTTPS

**Time**: ~30 minutes (includes DNS propagation)

---

### 9. GitHub CI/CD Setup
**Guide**: [09-github-cicd.md](./09-github-cicd.md)

**What it covers**:
- Create GitHub secrets
- Configure workload identity federation
- Set up deployment workflow
- Test CI/CD pipeline

**Time**: ~20 minutes

---

### 10. Monitoring & Alerting
**Guide**: [10-monitoring-alerting.md](./10-monitoring-alerting.md)

**What it covers**:
- Set up Cloud Monitoring
- Configure log-based alerts
- Set up uptime checks
- Configure notification channels

**Time**: ~15 minutes

---

### 11. CloudFront CDN Setup (Optional)
**Guide**: [11-cloudfront-cdn-setup.md](./11-cloudfront-cdn-setup.md)

**What it covers**:
- Create CloudFront distribution with Cloud Run origin
- Configure cache behaviors for static assets
- Update Route 53 to point to CloudFront
- Set up automatic cache invalidation on deploy
- Add GitHub secrets for AWS access

**Time**: ~30 minutes

---

## 🔄 Quick Setup (Experienced Users)

If you've done this before and just need the commands:

```bash
# Set variables
export PROJECT_ID="your-new-project-id"
export REGION="us-central1"
export RUNTIME_SA="gsdta-api-runner"
export CICD_SA="github-actions"
export GAR_REPO="web-apps"

# Run all setup scripts in order
bash docs/infrastructure/scripts/01-create-project.sh
bash docs/infrastructure/scripts/02-setup-firestore.sh
bash docs/infrastructure/scripts/03-setup-firebase-auth.sh
bash docs/infrastructure/scripts/04-setup-service-accounts.sh
bash docs/infrastructure/scripts/05-setup-secrets.sh
bash docs/infrastructure/scripts/06-setup-artifact-registry.sh
bash docs/infrastructure/scripts/07-deploy-cloud-run.sh
bash docs/infrastructure/scripts/08-setup-custom-domain.sh
bash docs/infrastructure/scripts/09-setup-github-cicd.sh
```

---

## ✅ Verification Checklist

After completing all guides, verify:

### Project & Billing
- [ ] GCP project exists: `gcloud projects describe $PROJECT_ID`
- [ ] Billing enabled: Check Cloud Console
- [ ] All APIs enabled: `gcloud services list --enabled`

### Firestore
- [ ] Database created: `gcloud firestore databases list`
- [ ] Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Indexes deployed: `firebase deploy --only firestore:indexes`
- [ ] Collections auto-created when app runs

### Firebase Auth
- [ ] Web app created: `firebase apps:list`
- [ ] Google auth enabled: Check Firebase Console
- [ ] Email/Password enabled: Check Firebase Console
- [ ] Authorized domains configured

### Service Accounts
- [ ] Runtime SA exists: `gcloud iam service-accounts list`
- [ ] CI/CD SA exists: `gcloud iam service-accounts list`
- [ ] Permissions granted: `gcloud projects get-iam-policy $PROJECT_ID`

### Secrets
- [ ] Firebase secrets created: `gcloud secrets list`
- [ ] Service account has access: `gcloud secrets get-iam-policy SECRET_NAME`

### Artifact Registry
- [ ] Repository created: `gcloud artifacts repositories list`
- [ ] Image pushed: `gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO`

### Cloud Run
- [ ] Service deployed: `gcloud run services list`
- [ ] Service healthy: `curl $(gcloud run services describe gsdta-web --region=$REGION --format='value(status.url)')/api/v1/health`
- [ ] Environment variables set

### Custom Domain
- [ ] Domain mapped: `gcloud run domain-mappings list`
- [ ] DNS records configured in Route 53
- [ ] HTTPS working: `curl https://app.gsdta.com`

### CI/CD
- [ ] GitHub secrets configured
- [ ] Workflow runs successfully
- [ ] Auto-deployment working

---

## 📊 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       User's Browser                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  app.gsdta.com (AWS Route 53)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              AWS CloudFront (CDN - Optional)                 │
│              Caches: /_next/static/*, /images/*              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Google Cloud Run (gsdta-web)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Container (UI + API)                                │   │
│  │  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │   Next.js    │  │  Node.js API │                │   │
│  │  │   (Port 3000)│  │  (Port 8080) │                │   │
│  │  └──────────────┘  └──────────────┘                │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┬─────────────┐
         │                           │             │
         ↓                           ↓             ↓
┌─────────────────┐      ┌──────────────────┐  ┌────────────────┐
│   Firestore     │      │  Firebase Auth   │  │ Secret Manager │
│   (Database)    │      │  (User Auth)     │  │  (API Keys)    │
└─────────────────┘      └──────────────────┘  └────────────────┘

         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (CI/CD)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Build → Test → Deploy → Invalidate CloudFront      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: API not enabled
```bash
# Solution: Enable all required APIs
bash docs/infrastructure/scripts/01-enable-apis.sh
```

**Issue**: Permission denied
```bash
# Solution: Check IAM bindings
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com"
```

**Issue**: Collections not showing
```bash
# Solution: Collections are auto-created on first write
# Use app to create data, or run seed script:
node scripts/seed-emulator.js  # For local
# For production, use the app to create first documents
```

**Issue**: Deployment fails
```bash
# Solution: Check Cloud Run logs
gcloud run services logs read gsdta-web --region=$REGION --limit=50
```

---

## 📞 Support

- **Documentation Issues**: Check individual guide files
- **GCP Issues**: https://cloud.google.com/support
- **Firebase Issues**: https://firebase.google.com/support
- **Application Issues**: Check `/docs/ROLES.md` for features

---

## 🔗 Related Documentation

- [GCLOUD-COMMANDS.md](../GCLOUD-COMMANDS.md) - Command reference
- [CORRECTED-COMMANDS.md](../CORRECTED-COMMANDS.md) - Command corrections
- [PRODUCTION-READINESS.md](../PRODUCTION-READINESS.md) - Pre-deployment checklist
- [HERO-CONTENT-FEATURE.md](../HERO-CONTENT-FEATURE.md) - Feature documentation

---

**Total Time**: ~2-3 hours for complete setup  
**Difficulty**: Intermediate  
**Prerequisites**: Basic GCP knowledge, command line familiarity

---

**Next**: Start with [01-project-setup.md](./01-project-setup.md)
