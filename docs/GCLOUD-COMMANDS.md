# GCloud Commands Reference

**Project**: GSDTA Web Application  
**Purpose**: Quick reference for all gcloud/firebase infrastructure commands  
**Last Updated**: December 7, 2024

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Firestore Database](#firestore-database)
3. [Firestore Collections](#firestore-collections)
4. [Firestore Rules & Indexes](#firestore-rules--indexes)
5. [Cloud Run Deployment](#cloud-run-deployment)
6. [Service Accounts](#service-accounts)
7. [Secret Manager](#secret-manager)
8. [Artifact Registry](#artifact-registry)
9. [Monitoring & Logs](#monitoring--logs)
10. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Set Project Variables

```bash
# Set these variables for all commands
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export GAR_REPO="web-apps"
export RUNTIME_SA="gsdta-api-runner"

# Verify
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
```

### Authenticate

```bash
# Google Cloud CLI
gcloud auth login
gcloud config set project $PROJECT_ID

# Firebase CLI
firebase login
firebase use $PROJECT_ID
```

### Enable APIs

```bash
# Core Firebase APIs
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firestore.googleapis.com

# Deployment & CI/CD APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable iamcredentials.googleapis.com

# List enabled APIs
gcloud services list --enabled
```

---

## Firestore Database

### Create Firestore Database

```bash
# Create Firestore in Native mode (production)
gcloud firestore databases create \
  --location=$REGION \
  --type=firestore-native

# Verify
gcloud firestore databases list
```

### Check Firestore Info

```bash
# Get database details
gcloud firestore databases describe --database="(default)"

# Check location
gcloud firestore databases describe --database="(default)" --format="value(locationId)"
```

---

## Firestore Collections

### ⚠️ Important: Collections Auto-Create

**Collections are automatically created on first document write.**  
You do NOT need to manually create them.

### View Collections

**Option 1: Firebase Console (Recommended)**
```bash
# Open Firebase Console in browser
open https://console.firebase.google.com

# Navigate to: Firestore Database → Data
# Collections will be visible in the left sidebar
```

**Option 2: Using Firebase Admin SDK Script**
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

listCollections();
```

**Option 3: Export and Inspect**
```bash
# Create GCS bucket first (if needed)
gsutil mb gs://$PROJECT_ID-firestore-exports

# Export Firestore data (shows all collections)
gcloud firestore export gs://$PROJECT_ID-firestore-exports/$(date +%Y%m%d)

# The export metadata will list all collections
```

### Query Collection Documents

```bash
# There's no direct gcloud command to list collections
# Use Firebase Console or Admin SDK instead

# For querying specific documents, use the REST API:
# See: https://firebase.google.com/docs/firestore/reference/rest
```

### Delete Collection (Dangerous!)

```bash
# ⚠️ WARNING: This deletes all documents in the collection
firebase firestore:delete COLLECTION_PATH --recursive --yes

# Example: Delete all hero content
firebase firestore:delete heroContent --recursive --yes

# Delete specific document
firebase firestore:delete heroContent/hero-1
```

### Expected Collections

After app deployment and usage, these collections should exist:

- `users` - User profiles
- `students` - Student records  
- `invites` or `roleInvites` - Teacher invitations
- `heroContent` - Homepage event banners
- `classes` - Class information (future)
- `attendance` - Attendance records (future)

---

## Firestore Rules & Indexes

### Deploy Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Validate rules (dry-run)
firebase deploy --only firestore:rules --dry-run

# View deployed rules
gcloud firestore rules releases list
```

### Deploy Indexes

```bash
# Deploy composite indexes
firebase deploy --only firestore:indexes

# List indexes
gcloud firestore indexes composite list

# Check index status
gcloud firestore indexes composite describe INDEX_ID
```

### Check Index Build Status

```bash
# List all indexes with status
gcloud firestore indexes composite list --format="table(name,queryScope,state)"

# Filter by collection
gcloud firestore indexes composite list --filter="collectionGroup:heroContent"
```

---

## Cloud Run Deployment

### Deploy Service

```bash
# Deploy from Artifact Registry image
gcloud run deploy gsdta-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web:latest \
  --platform=managed \
  --region=$REGION \
  --service-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="NODE_ENV=production" \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1

# Get service URL
gcloud run services describe gsdta-web --region=$REGION --format="value(status.url)"
```

### Update Service

```bash
# Update environment variables
gcloud run services update gsdta-web \
  --region=$REGION \
  --set-env-vars="KEY=VALUE"

# Update image
gcloud run services update gsdta-web \
  --region=$REGION \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web:TAG

# Scale service
gcloud run services update gsdta-web \
  --region=$REGION \
  --min-instances=1 \
  --max-instances=20
```

### Map Custom Domain

```bash
# Map domain to service
gcloud run domain-mappings create \
  --service=gsdta-web \
  --domain=app.gsdta.com \
  --region=$REGION

# List domain mappings
gcloud run domain-mappings list --region=$REGION

# Get DNS records to configure
gcloud run domain-mappings describe app.gsdta.com --region=$REGION
```

### Service Info

```bash
# List all services
gcloud run services list

# Describe service
gcloud run services describe gsdta-web --region=$REGION

# Get service URL
gcloud run services describe gsdta-web --region=$REGION --format="value(status.url)"

# Get latest revision
gcloud run revisions list --service=gsdta-web --region=$REGION --limit=1
```

---

## Service Accounts

### Create Service Account

```bash
# Runtime service account (for Cloud Run)
gcloud iam service-accounts create $RUNTIME_SA \
  --display-name="GSDTA API Runtime Service Account"

# CI/CD service account (for GitHub Actions)
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD"
```

### Grant Permissions

```bash
# Firestore access (read/write)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Secret Manager access (read secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Artifact Registry read (for pulling images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

### List Service Accounts

```bash
# List all service accounts
gcloud iam service-accounts list

# Get service account details
gcloud iam service-accounts describe $RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# List IAM policy for service account
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com"
```

### Create Service Account Key (Local Dev Only)

```bash
# ⚠️ Only for local testing - NEVER commit to git
gcloud iam service-accounts keys create sa-runtime-key.json \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# List keys
gcloud iam service-accounts keys list \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# Delete key (when done)
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com
```

---

## Secret Manager

### Create Secrets

```bash
# Create from stdin
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME \
  --data-file=-

# Create from file
gcloud secrets create SECRET_NAME --data-file=/path/to/secret

# Create with labels
gcloud secrets create SECRET_NAME \
  --data-file=- \
  --labels=app=gsdta,env=prod <<< "secret-value"
```

### Update Secrets

```bash
# Add new version
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Disable version
gcloud secrets versions disable VERSION_ID --secret=SECRET_NAME

# Destroy version (permanent)
gcloud secrets versions destroy VERSION_ID --secret=SECRET_NAME
```

### Access Secrets

```bash
# List secrets
gcloud secrets list

# Get latest version
gcloud secrets versions access latest --secret=SECRET_NAME

# Get specific version
gcloud secrets versions access VERSION_ID --secret=SECRET_NAME

# List versions
gcloud secrets versions list SECRET_NAME
```

### Grant Access to Service Account

```bash
# Grant secret accessor role
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify access
gcloud secrets get-iam-policy SECRET_NAME
```

---

## Artifact Registry

### Create Repository

```bash
# Create Docker repository
gcloud artifacts repositories create $GAR_REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="GSDTA web application images"

# List repositories
gcloud artifacts repositories list --location=$REGION
```

### Push Image

```bash
# Tag image
docker tag gsdta-web:latest $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web:latest

# Configure Docker auth
gcloud auth configure-docker $REGION-docker.pkg.dev

# Push image
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web:latest
```

### List Images

```bash
# List all images in repository
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO

# List tags for specific image
gcloud artifacts docker tags list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web

# Get image details
gcloud artifacts docker images describe \
  $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web:latest
```

### Delete Images

```bash
# Delete specific tag
gcloud artifacts docker images delete \
  $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web:TAG --quiet

# Delete untagged images (cleanup)
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO \
  --include-tags --filter='-tags:*' --format='get(package)' | \
  xargs -I {} gcloud artifacts docker images delete {} --quiet
```

---

## Monitoring & Logs

### Cloud Run Logs

```bash
# Stream logs
gcloud run services logs tail gsdta-web --region=$REGION

# Recent logs
gcloud run services logs read gsdta-web --region=$REGION --limit=50

# Filter logs
gcloud run services logs read gsdta-web \
  --region=$REGION \
  --filter='severity>=ERROR' \
  --limit=100
```

### Metrics

```bash
# Get service metrics (via gcloud monitoring)
gcloud monitoring time-series list \
  --filter='resource.labels.service_name="gsdta-web"' \
  --format=json

# Check request count
# (View in Cloud Console: Monitoring → Metrics Explorer)
```

### Audit Logs

```bash
# List recent admin activity
gcloud logging read "resource.type=cloud_run_revision AND logName=projects/$PROJECT_ID/logs/cloudaudit.googleapis.com%2Factivity" \
  --limit=20 \
  --format=json

# Firestore operations audit
gcloud logging read "resource.type=datastore_database" \
  --limit=20 \
  --format=json
```

---

## Troubleshooting

### Check Service Health

```bash
# Get service status
gcloud run services describe gsdta-web --region=$REGION --format="value(status.conditions[0].status)"

# Test endpoint
curl -I $(gcloud run services describe gsdta-web --region=$REGION --format="value(status.url)")

# Check revision traffic
gcloud run services describe gsdta-web --region=$REGION --format="table(status.traffic[].revisionName,status.traffic[].percent)"
```

### Debug Failed Deployment

```bash
# Get latest revision
LATEST_REVISION=$(gcloud run revisions list --service=gsdta-web --region=$REGION --limit=1 --format="value(name)")

# Check revision logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.revision_name=$LATEST_REVISION" --limit=50

# Check build logs (if using Cloud Build)
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

### Firestore Connection Issues

```bash
# Test Firestore access
gcloud firestore documents list "projects/$PROJECT_ID/databases/(default)/documents/users" --limit=1

# Check IAM permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# Verify service account has datastore.user role
```

### Check Quotas

```bash
# Check Cloud Run quotas
gcloud run quotas list --region=$REGION

# Check Firestore quotas
gcloud firestore indexes composite describe INDEX_ID
```

---

## Quick Reference

### Common Commands

```bash
# Deploy rules + indexes
firebase deploy --only firestore:rules,firestore:indexes

# Update Cloud Run service
gcloud run deploy gsdta-web --region=$REGION --image=IMAGE_URL

# Stream logs
gcloud run services logs tail gsdta-web --region=$REGION

# List collections
gcloud firestore collections list

# Get secret
gcloud secrets versions access latest --secret=SECRET_NAME

# List images
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO
```

### Environment Variables Template

```bash
# Save this to .env.local for reference
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export GAR_REPO="web-apps"
export RUNTIME_SA="gsdta-api-runner"
export SERVICE_NAME="gsdta-web"
```

---

## See Also

- [Infrastructure Setup Guide](./INFRASTRUCTURE-SETUP.md) - Full setup instructions
- [Production Readiness](./PRODUCTION-READINESS.md) - Deployment checklist
- [Hero Content Feature](./HERO-CONTENT-FEATURE.md) - Feature documentation

---

**Last Updated**: December 7, 2024
