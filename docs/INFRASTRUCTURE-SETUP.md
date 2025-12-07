# Infrastructure Setup Guide

**Project**: GSDTA Web Application  
**Purpose**: Complete infrastructure recreation guide for migrating from personal Google Cloud account to non-profit Google Cloud account  
**Last Updated**: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GCP Project Setup](#gcp-project-setup)
4. [Firebase Setup](#firebase-setup)
5. [Artifact Registry Setup](#artifact-registry-setup)
6. [Service Accounts & IAM](#service-accounts--iam)
7. [Secret Manager Configuration](#secret-manager-configuration)
8. [Cloud Run Deployment](#cloud-run-deployment)
9. [Custom Domain Setup](#custom-domain-setup)
10. [DNS Configuration (AWS Route 53)](#dns-configuration-aws-route-53)
11. [GitHub CI/CD Setup](#github-cicd-setup)
12. [Verification & Testing](#verification--testing)
13. [Reference Configuration](#reference-configuration)

---

## Overview

This application consists of:
- **UI**: Next.js 15 (React 19) on port 3000
- **API**: Node.js/TypeScript on port 8080
- **Auth**: Firebase Authentication
- **Database**: Firestore (Native mode)
- **Hosting**: Google Cloud Run (single container with both UI and API)
- **CI/CD**: GitHub Actions
- **DNS**: AWS Route 53
- **Domain**: app.gsdta.com (mapped via Cloud Run)

The UI proxies API requests from `/api/*` to the API's `/v1/*` endpoints within the same container.

---

## Prerequisites

### Required Tools

Install the following on your local machine:

```bash
# Google Cloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# Node.js LTS (v20+)
# Download from: https://nodejs.org/

# Firebase CLI
npm install -g firebase-tools

# Docker Desktop (for local testing)
# Download from: https://www.docker.com/products/docker-desktop
```

### Required Access

- **Google Cloud**: Billing admin and project owner/editor role
- **GitHub**: Repository admin access for secrets configuration
- **AWS Route 53**: DNS management access for domain (gsdta.com)
- **Firebase Console**: Admin access

### Authenticate Tools

```bash
# Google Cloud
gcloud auth login
gcloud config set project YOUR_NEW_PROJECT_ID

# Firebase
firebase login
```

---

## GCP Project Setup

### 1. Create New GCP Project

```bash
# Set your project ID variable (replace with your non-profit project ID)
export PROJECT_ID="your-nonprofit-project-id"
export REGION="us-central1"

# If project doesn't exist, create it
gcloud projects create $PROJECT_ID --name="GSDTA Non-Profit"

# Set as active project
gcloud config set project $PROJECT_ID

# Link billing account (get billing account ID from console)
gcloud beta billing projects link $PROJECT_ID --billing-account=XXXXXX-XXXXXX-XXXXXX
```

### 2. Enable Required APIs

```bash
# Core APIs
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firestore.googleapis.com

# Deployment & CI/CD APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable iamcredentials.googleapis.com

# Wait 1-2 minutes for APIs to propagate
```

---

## Firebase Setup

### 1. Add Firebase to GCP Project

```bash
# Add Firebase to your existing GCP project
firebase projects:addfirebase $PROJECT_ID

# Wait 1-2 minutes for propagation
# Verify at: https://console.firebase.google.com
```

### 2. Create Firestore Database

```bash
# Create Firestore in Native mode
gcloud firestore databases create \
  --location=$REGION \
  --type=firestore-native

# If already exists, command will report it (safe to continue)
```

### 3. Create Firebase Web App

```bash
# Create web app
firebase apps:create web "GSDTA Web UI" --project $PROJECT_ID

# List apps to get Web App ID
firebase apps:list --project $PROJECT_ID

# Get SDK config (copy Web App ID from previous command)
export WEB_APP_ID="1:XXXXX:web:XXXXXX"
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID

# Save config to file for reference
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID > firebase-config.json

# Save these values - you'll need them for Secret Manager:
# - apiKey
# - authDomain
# - projectId
# - appId
```

### 4. Configure Firebase Authentication

**Manual steps in Firebase Console:**

1. Go to: https://console.firebase.google.com → Select your project
2. Navigate to: **Authentication** → **Sign-in method**
3. Enable providers:
   - **Google** (add authorized domains)
   - **Email/Password**
4. Go to: **Authentication** → **Settings** → **Authorized domains**
5. Add domains:
   - `localhost` (for local dev)
   - `app.gsdta.com` (production)
   - Your Cloud Run URL (e.g., `gsdta-web-xxx-uc.a.run.app`)

### 5. Deploy Firestore Rules & Indexes

```bash
# From repository root
firebase use $PROJECT_ID

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 6. Firestore Collections Setup

**Important**: Firestore collections are **auto-created** on first write. You **DO NOT** need to manually create them.

#### Collections Used by GSDTA App

The application uses the following Firestore collections:

1. **`users`** - User profiles (linked to Firebase Auth)
   - Auto-created when users sign up
   - Fields: `uid`, `email`, `name`, `roles`, `status`, `createdAt`, `updatedAt`

2. **`students`** - Student records
   - Auto-created when admin adds students
   - Fields: `id`, `name`, `parentId`, `grade`, `schoolName`, `dateOfBirth`, etc.

3. **`invites`** (or `roleInvites`) - Teacher invites
   - Auto-created when admin invites teachers
   - Fields: `token`, `email`, `role`, `status`, `expiresAt`, etc.

4. **`heroContent`** - Event banners for homepage
   - Auto-created when admin creates hero content
   - Fields: `id`, `type`, `title`, `subtitle`, `imageUrl`, `isActive`, `priority`, etc.
   - **NEW** as of December 2024

5. **Additional collections** (as features are added):
   - `classes` - Class information
   - `attendance` - Attendance records
   - `grades` - Grade records
   - `announcements` - School announcements
   - etc.

#### How Collections Are Created

Collections are automatically created when:
1. **First document is written** to that collection
2. Via application code (e.g., admin creates first hero content)
3. Via seed script for local development

#### Seed Data for Local Development

```bash
# Start emulators
npm run emulators

# In another terminal, seed test data
node scripts/seed-emulator.js

# This creates all collections with sample data
```

#### Manual Collection Creation (NOT REQUIRED)

You **do not** need to manually create collections in production. However, if you want to pre-create them:

**Option 1: Via Firebase Console**
1. Go to: https://console.firebase.google.com
2. Navigate to: **Firestore Database**
3. Click: **Start collection**
4. Enter collection ID (e.g., `heroContent`)
5. Add first document (can be a placeholder)

**Option 2: Via gcloud (using Admin SDK)**
```bash
# Not recommended - collections auto-create on first write
# Just deploy the app and let it create collections naturally
```

#### Verify Collections

After deploying and using the app:

**Option 1: Firebase Console (Recommended)**
1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to: **Firestore Database** → **Data**
4. Collections will be visible in the left sidebar

**Option 2: Using a Node.js Script**
```javascript
// scripts/list-collections.js
const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.PROJECT_ID });

async function listCollections() {
  const collections = await admin.firestore().listCollections();
  collections.forEach(collection => {
    console.log('Collection:', collection.id);
  });
}

listCollections().then(() => process.exit(0));
```

Run with:
```bash
export PROJECT_ID="your-project-id"
node scripts/list-collections.js
```

**Option 3: Export Firestore Data**
```bash
# Export shows all collections in metadata
gcloud firestore export gs://YOUR_BUCKET/firestore-export
```

**Note**: There is no direct `gcloud firestore collections list` command. Collections are best viewed via Firebase Console.

---

## Artifact Registry Setup

### Create Docker Repository

```bash
export GAR_REPO="web-apps"

# Create repository
gcloud artifacts repositories create $GAR_REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="GSDTA web application images"

# Verify
gcloud artifacts repositories list --location=$REGION
```

---

## Service Accounts & IAM

### 1. Runtime Service Account (Cloud Run)

```bash
export RUNTIME_SA="gsdta-api-runner"

# Create service account
gcloud iam service-accounts create $RUNTIME_SA \
  --display-name="GSDTA API Runtime Service Account"

# Grant Firestore access (read/write)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Secret Manager access (read secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify
gcloud iam service-accounts list
```

**Optional - Local Development Key:**

```bash
# Only for local testing (never commit to git)
gcloud iam service-accounts keys create sa-runtime-key.json \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# Use locally:
# export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/sa-runtime-key.json
```

### 2. CI/CD Service Account (GitHub Actions)

```bash
export CI_SA="gsdta-web-ci"

# Create service account
gcloud iam service-accounts create $CI_SA \
  --display-name="GSDTA Web CI/CD"

# Grant Artifact Registry write access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Cloud Run admin access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant service account user role (required for deploying with custom runtime SA)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Secret Manager access (to read secrets during build)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CI_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create JSON key for GitHub Actions
gcloud iam service-accounts keys create ci-sa-key.json \
  --iam-account=$CI_SA@$PROJECT_ID.iam.gserviceaccount.com

# IMPORTANT: Copy the contents of ci-sa-key.json
# You'll add it to GitHub Secrets in a later step
cat ci-sa-key.json

# Delete the key file after copying (security best practice)
rm ci-sa-key.json
```

---

## Secret Manager Configuration

### 1. Create Firebase Secrets

```bash
# Get values from firebase-config.json saved earlier
export FIREBASE_API_KEY="AIzaSy..."
export FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export FIREBASE_PROJECT_ID="your-nonprofit-project-id"
export FIREBASE_APP_ID="1:xxx:web:xxx"

# Create secrets
echo -n "$FIREBASE_API_KEY" | gcloud secrets create FIREBASE_API_KEY \
  --data-file=- \
  --project=$PROJECT_ID

echo -n "$FIREBASE_AUTH_DOMAIN" | gcloud secrets create FIREBASE_AUTH_DOMAIN \
  --data-file=- \
  --project=$PROJECT_ID

echo -n "$FIREBASE_PROJECT_ID" | gcloud secrets create FIREBASE_PROJECT_ID \
  --data-file=- \
  --project=$PROJECT_ID

echo -n "$FIREBASE_APP_ID" | gcloud secrets create FIREBASE_APP_ID \
  --data-file=- \
  --project=$PROJECT_ID

# Verify secrets
gcloud secrets list --project=$PROJECT_ID
```

### 2. Grant Runtime Service Account Access to Secrets

```bash
# Grant access to each secret
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
done

# Verify one secret's IAM policy
gcloud secrets get-iam-policy FIREBASE_API_KEY --project=$PROJECT_ID
```

---

## Cloud Run Deployment

### Initial Manual Deployment (Optional)

This is optional for initial testing. Skip to GitHub CI/CD Setup for automated deployments.

```bash
export SERVICE_NAME="gsdta-web"

# Configure Docker for Artifact Registry
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# Build Docker image locally
export COMMIT=$(git rev-parse --short HEAD)
export VERSION=$(git describe --tags --always 2>/dev/null || echo "v1.0.0")
export BUILDTIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/$SERVICE_NAME:$COMMIT"

docker build \
  --build-arg VERSION=$VERSION \
  --build-arg COMMIT=$COMMIT \
  --build-arg BUILDTIME=$BUILDTIME \
  --build-arg NEXT_PUBLIC_AUTH_MODE=firebase \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  --build-arg NEXT_PUBLIC_USE_MSW=false \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=$FIREBASE_APP_ID \
  -t $IMAGE_URI .

# Push image
docker push $IMAGE_URI

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_URI \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --service-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NEXT_TELEMETRY_DISABLED=1,NODE_ENV=production,NEXT_PUBLIC_AUTH_MODE=firebase,NEXT_PUBLIC_API_BASE_URL=/api,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NEXT_PUBLIC_USE_MSW=false,USE_GO_API=false,NEXT_PUBLIC_SITE_URL=https://app.gsdta.com \
  --set-secrets NEXT_PUBLIC_FIREBASE_API_KEY=FIREBASE_API_KEY:latest,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,NEXT_PUBLIC_FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,NEXT_PUBLIC_FIREBASE_APP_ID=FIREBASE_APP_ID:latest

# Get service URL
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
```

---

## Custom Domain Setup

### 1. Create Domain Mapping in Cloud Run

```bash
# Install beta components (required for domain mappings)
gcloud components install beta

# Create domain mapping
gcloud beta run domain-mappings create \
  --service $SERVICE_NAME \
  --domain app.gsdta.com \
  --region $REGION

# Get DNS records needed
gcloud beta run domain-mappings describe \
  --domain app.gsdta.com \
  --region $REGION

# Output will show DNS records like:
# name: app
# type: CNAME
# rrdata: ghs.googlehosted.com.
```

### 2. Verify Domain Ownership

If you haven't already, verify domain ownership with Google:

1. Go to: https://search.google.com/search-console
2. Add property: `https://app.gsdta.com`
3. Choose verification method (DNS TXT record recommended)
4. Add TXT record to Route 53 as instructed

---

## DNS Configuration (AWS Route 53)

### 1. Add CNAME Record for Subdomain

In AWS Route 53 Console:

1. Navigate to: **Route 53** → **Hosted zones** → **gsdta.com**
2. Click: **Create record**
3. Configure:
   - **Record name**: `app`
   - **Record type**: `CNAME`
   - **Value**: `ghs.googlehosted.com` (without trailing dot)
   - **TTL**: `300`
4. Click: **Create records**

### 2. Verify DNS Propagation

```bash
# Check CNAME record
nslookup -type=CNAME app.gsdta.com 8.8.8.8

# Expected output:
# app.gsdta.com canonical name = ghs.googlehosted.com
```

### 3. Wait for SSL Certificate Provisioning

```bash
# Check domain mapping status
gcloud beta run domain-mappings describe \
  --domain app.gsdta.com \
  --region $REGION

# Wait until status shows: Ready/Active (can take 15-30 minutes)
# Then test: https://app.gsdta.com
```

### 4. (Optional) Apex Domain Redirect

To redirect `gsdta.com` → `https://app.gsdta.com`:

**Create S3 Bucket for Redirect:**

```bash
# In AWS Console or CLI
aws s3api create-bucket \
  --bucket gsdta.com \
  --region us-west-2

aws s3api put-bucket-website \
  --bucket gsdta.com \
  --website-configuration '{
    "RedirectAllRequestsTo": {
      "HostName": "app.gsdta.com",
      "Protocol": "https"
    }
  }'
```

**Create ACM Certificate (us-east-1 for CloudFront):**

```bash
# Request certificate
aws acm request-certificate \
  --region us-east-1 \
  --domain-name gsdta.com \
  --subject-alternative-names www.gsdta.com \
  --validation-method DNS

# Add DNS validation records in Route 53 as provided by ACM
```

**Create CloudFront Distribution:**

1. Origin: S3 website endpoint (`http://gsdta.com.s3-website-us-west-2.amazonaws.com`)
2. Viewer protocol: Redirect HTTP to HTTPS
3. Alternate domain names: `gsdta.com`, `www.gsdta.com`
4. SSL certificate: Select ACM cert from us-east-1

**Add Route 53 Alias Record:**

- Record name: (blank for apex)
- Type: A - IPv4
- Alias: Yes → CloudFront distribution
- Select your distribution

---

## GitHub CI/CD Setup

### 1. Add GitHub Secrets

Navigate to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**

Add the following repository secrets:

| Secret Name | Value | Source |
|------------|-------|---------|
| `GCP_SA_KEY` | Full JSON content of CI service account key | From ci-sa-key.json created earlier |

**Example secret value format:**
```json
{
  "type": "service_account",
  "project_id": "your-nonprofit-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "gsdta-web-ci@your-nonprofit-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 2. Update GitHub Workflows

**Edit `.github/workflows/deploy.yml`:**

Update the environment variables at the top:

```yaml
env:
  NODE_VERSION: 20
  GCP_PROJECT_ID: your-nonprofit-project-id  # UPDATE THIS
  GAR_LOCATION: us-central1
  GAR_REPO: web-apps
  SERVICE_NAME: gsdta-web
```

**Edit `.github/workflows/ci.yml`:**

No changes needed - uses demo project for emulators.

### 3. Update Firebase Config

**Edit `.firebaserc`:**

```json
{
  "projects": {
    "default": "your-nonprofit-project-id"
  }
}
```

### 4. Trigger Deployment

```bash
# Commit and push to main branch
git add .firebaserc .github/workflows/deploy.yml
git commit -m "chore: update infrastructure to non-profit GCP account"
git push origin main

# Or manually trigger via GitHub Actions UI
# Actions → Deploy → Run workflow
```

---

## Verification & Testing

### 1. Check Deployment Status

```bash
# Cloud Run service status
gcloud run services describe $SERVICE_NAME --region $REGION

# View logs
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --limit 100

# Or stream logs
gcloud run services logs tail $SERVICE_NAME --region $REGION
```

### 2. Test Endpoints

```bash
# Health check (API)
curl https://app.gsdta.com/api/health

# Version endpoint
curl https://app.gsdta.com/api/version

# Home page (UI)
curl -I https://app.gsdta.com/

# Test in browser
open https://app.gsdta.com
```

### 3. Verify Firebase Integration

1. Open: https://app.gsdta.com
2. Click: **Sign In** or **Get Started**
3. Test Google Sign-In flow
4. Verify in Firebase Console → Authentication → Users
5. Check Firestore Console → Data (should see created records)

### 4. Monitor Cloud Run

- **Cloud Console**: https://console.cloud.google.com/run
- Navigate to: **Cloud Run** → **gsdta-web**
- Check:
  - Revisions (should show latest deployment)
  - Metrics (requests, latency, memory)
  - Logs (real-time)

### 5. Test CI/CD Pipeline

```bash
# Make a small change
echo "# Test" >> README.md

# Commit to develop branch (triggers CI)
git checkout -b test-ci
git add README.md
git commit -m "test: CI pipeline"
git push origin test-ci

# Create PR and merge to main (triggers deploy)
# Check GitHub Actions for pipeline status
```

---

## Reference Configuration

### Environment Variables (Production Cloud Run)

**Public (baked at build time):**
- `NEXT_PUBLIC_AUTH_MODE=firebase`
- `NEXT_PUBLIC_API_BASE_URL=/api`
- `NEXT_PUBLIC_USE_MSW=false`
- `NEXT_PUBLIC_SITE_URL=https://app.gsdta.com`

**Runtime:**
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `GOOGLE_CLOUD_PROJECT=your-nonprofit-project-id`
- `USE_GO_API=false`

**Secrets (injected from Secret Manager):**
- `NEXT_PUBLIC_FIREBASE_API_KEY` ← FIREBASE_API_KEY:latest
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` ← FIREBASE_AUTH_DOMAIN:latest
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ← FIREBASE_PROJECT_ID:latest
- `NEXT_PUBLIC_FIREBASE_APP_ID` ← FIREBASE_APP_ID:latest

### Project Structure

```
gsdta-web/
├── api/                      # Node.js API (port 8080)
├── ui/                       # Next.js UI (port 3000)
├── persistence/              # Firestore rules & indexes
│   ├── firestore.rules
│   └── firestore.indexes.json
├── scripts/                  # Data seeding scripts
├── .github/workflows/
│   ├── ci.yml               # CI pipeline (develop branch)
│   └── deploy.yml           # Deployment pipeline (main branch)
├── firebase.json            # Firebase & emulator config
├── .firebaserc              # Firebase project ID
├── Dockerfile               # Production Docker build
└── docker-compose.local.yml # Local development
```

### Key URLs

| Service | URL | Notes |
|---------|-----|-------|
| Production App | https://app.gsdta.com | Primary domain |
| Cloud Run Service | https://gsdta-web-xxx-uc.a.run.app | Auto-generated |
| Firebase Console | https://console.firebase.google.com | Select project |
| GCP Console | https://console.cloud.google.com | Select project |
| Cloud Run Logs | https://console.cloud.google.com/run | Select service |
| Artifact Registry | https://console.cloud.google.com/artifacts | Select repository |

### Port Configuration

- **Production (Cloud Run)**: Single container, UI on port 3000, API on port 8080 (internal)
- **Local Development**: 
  - UI: http://localhost:3000
  - API: http://localhost:8080
  - Firebase Auth Emulator: http://localhost:9099
  - Firestore Emulator: http://localhost:8889
  - Emulator UI: http://localhost:4445

---

## Common Issues & Troubleshooting

### Issue: "Permission denied" when accessing secrets

**Solution:**
```bash
# Verify runtime SA has secretAccessor role
gcloud secrets get-iam-policy FIREBASE_API_KEY --project=$PROJECT_ID

# Re-grant if missing
gcloud secrets add-iam-policy-binding FIREBASE_API_KEY \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### Issue: Domain mapping certificate pending

**Solution:**
```bash
# Verify DNS is correct
nslookup -type=CNAME app.gsdta.com 8.8.8.8

# Check for conflicting records
nslookup -type=A app.gsdta.com 8.8.8.8

# If CAA records exist, add Google:
# CAA 0 issue "pki.goog"
```

### Issue: 404 on /api/* routes

**Solution:**
Ensure Docker build includes correct API base URL:
```bash
--build-arg NEXT_PUBLIC_API_BASE_URL=/api
```

### Issue: CORS errors in production

**Solution:**
Set `NEXT_PUBLIC_SITE_URL` environment variable:
```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars NEXT_PUBLIC_SITE_URL=https://app.gsdta.com
```

### Issue: GitHub Actions deployment fails

**Checklist:**
1. Verify `GCP_SA_KEY` secret is set correctly
2. Check CI service account has all required roles
3. Verify secrets exist in Secret Manager
4. Check workflow file has correct project ID
5. Review GitHub Actions logs for specific errors

---

## Migration Checklist

Use this checklist when migrating to the non-profit account:

- [ ] Create new GCP project with billing enabled
- [ ] Enable all required APIs
- [ ] Add Firebase to project
- [ ] Create Firestore database
- [ ] Create Firebase web app and get config
- [ ] Enable Firebase Authentication providers
- [ ] Add authorized domains in Firebase
- [ ] Deploy Firestore rules and indexes
- [ ] Create Artifact Registry repository
- [ ] Create runtime service account with proper roles
- [ ] Create CI/CD service account with proper roles
- [ ] Create Firebase secrets in Secret Manager
- [ ] Grant secret access to runtime SA
- [ ] Add `GCP_SA_KEY` to GitHub Secrets
- [ ] Update `.firebaserc` with new project ID
- [ ] Update `.github/workflows/deploy.yml` with new project ID
- [ ] Create domain mapping for app.gsdta.com
- [ ] Update Route 53 CNAME record
- [ ] Wait for SSL certificate provisioning
- [ ] Deploy via GitHub Actions
- [ ] Test authentication flow
- [ ] Verify Firestore read/write operations
- [ ] Check Cloud Run logs for errors
- [ ] Set up CloudFront redirect for apex domain (optional)
- [ ] Update team documentation with new project ID

---

## Security Best Practices

1. **Service Account Keys**: Never commit SA keys to git. Delete local copies after adding to GitHub Secrets.
2. **Secrets Rotation**: Rotate service account keys regularly (every 90 days recommended).
3. **Least Privilege**: Service accounts have minimal required permissions.
4. **Firestore Rules**: Review and test security rules before deployment.
5. **HTTPS Only**: All production traffic uses HTTPS (enforced by Cloud Run).
6. **Authentication**: Firebase Authentication required for protected routes.
7. **Environment Isolation**: Local development uses Firebase emulators (not production data).

---

## Support & Resources

### Documentation Links
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)

### Local Repository Docs
- [docs/gcp-deploy.md](docs/gcp-deploy.md) - Detailed deployment guide
- [docs/custom-domain.md](docs/custom-domain.md) - Domain setup details
- [docs/ci-cd.md](docs/ci-cd.md) - CI/CD pipeline documentation
- [docs/cloud-run-env-vars.md](docs/cloud-run-env-vars.md) - Environment variable reference
- [infra/gcloud-bootstrap.md](infra/gcloud-bootstrap.md) - Windows CLI reference

### Quick Reference Commands

```bash
# View all services
gcloud run services list --region $REGION

# View service details
gcloud run services describe $SERVICE_NAME --region $REGION

# View recent logs
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50

# Stream logs
gcloud run services logs tail $SERVICE_NAME --region $REGION

# List secrets
gcloud secrets list --project $PROJECT_ID

# View secret value
gcloud secrets versions access latest --secret=FIREBASE_API_KEY --project=$PROJECT_ID

# Redeploy service (force new revision)
gcloud run services update $SERVICE_NAME --region $REGION

# Delete service (cleanup)
gcloud run services delete $SERVICE_NAME --region $REGION
```

---

**Document Version**: 1.0  
**Infrastructure Version**: Production-ready  
**Last Tested**: December 2025  
**Maintained By**: GSDTA Development Team
