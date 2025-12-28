# GSDTA Infrastructure Setup Guide for Third-Party Deployment

**Version**: 1.0
**Last Updated**: December 27, 2025
**Purpose**: Complete infrastructure recreation guide for deploying GSDTA Web in new AWS and Google Cloud accounts.
**Audience**: Third-party development and operations teams

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Summary](#architecture-summary)
4. [Phase 1: Google Cloud Setup](#phase-1-google-cloud-setup)
5. [Phase 2: Firebase Setup](#phase-2-firebase-setup)
6. [Phase 3: AWS Route 53 & CloudFront Setup](#phase-3-aws-route-53--cloudfront-setup)
7. [Phase 4: GitHub CI/CD Setup](#phase-4-github-cicd-setup)
8. [Phase 5: Deployment](#phase-5-deployment)
9. [Phase 6: Verification](#phase-6-verification)
10. [Troubleshooting](#troubleshooting)
11. [Quick Reference Commands](#quick-reference-commands)

---

## Overview

### Infrastructure Components

| Component | Provider | Purpose |
|-----------|----------|---------|
| Application Hosting | Google Cloud Run | Container-based hosting |
| Database | Google Firestore | NoSQL document database |
| Authentication | Firebase Auth | User identity management |
| Secrets | Google Secret Manager | Store sensitive configuration |
| Container Registry | Google Artifact Registry | Docker image storage |
| DNS | AWS Route 53 | Domain name management |
| CDN (Optional) | AWS CloudFront | Content delivery, HTTPS for apex domain |
| CI/CD | GitHub Actions | Automated build and deployment |

### Cost Estimates

| Service | Monthly Cost (Estimate) |
|---------|------------------------|
| Cloud Run | $0-50 (pay per use) |
| Firestore | $0-25 (pay per use) |
| Firebase Auth | Free (up to 50K users) |
| Secret Manager | ~$1 |
| Artifact Registry | ~$2-5 |
| Route 53 | ~$0.50/zone + queries |
| CloudFront | $0-20 (optional) |

**Total**: ~$5-100/month depending on usage

---

## Prerequisites

### Required Accounts

- [ ] Google Cloud account with billing enabled
- [ ] AWS account with billing enabled
- [ ] GitHub account with repository access
- [ ] Domain ownership (for DNS verification)

### Required Tools

Install on your local machine:

```bash
# 1. Google Cloud CLI
# Download: https://cloud.google.com/sdk/docs/install
# Verify:
gcloud version

# 2. AWS CLI
# Download: https://aws.amazon.com/cli/
# Verify:
aws --version

# 3. Firebase CLI
npm install -g firebase-tools
firebase --version

# 4. Node.js LTS (v20+)
# Download: https://nodejs.org/
node --version
npm --version

# 5. Docker Desktop
# Download: https://www.docker.com/products/docker-desktop
docker --version

# 6. Git
git --version
```

### Authenticate All Tools

```bash
# Google Cloud
gcloud auth login
gcloud auth application-default login

# AWS
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)

# Firebase
firebase login
```

---

## Architecture Summary

### Deployment Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Internet                                   │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
         ┌───────────────────────┴────────────────────────┐
         │                                                 │
         ▼                                                 ▼
┌─────────────────────┐                        ┌─────────────────────┐
│   AWS Route 53      │                        │   AWS CloudFront    │
│   (DNS)             │                        │   (CDN - Optional)  │
│                     │                        │                     │
│ app.example.com     │                        │ example.com         │
│ CNAME → ghs.google  │                        │ www.example.com     │
│        hosted.com   │                        │ → redirects to app  │
└──────────┬──────────┘                        └─────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Google Cloud Platform                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Cloud Run                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │              Docker Container                              │  │   │
│  │  │  ┌────────────────┐      ┌─────────────────┐             │  │   │
│  │  │  │   Next.js UI   │      │   Next.js API   │             │  │   │
│  │  │  │   Port 3000    │      │   Port 8080     │             │  │   │
│  │  │  └────────────────┘      └─────────────────┘             │  │   │
│  │  │                   Supervisor Process Manager              │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                      │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │
│  │   Firestore     │   │  Firebase Auth  │   │ Secret Manager  │      │
│  │   (Database)    │   │  (Users)        │   │ (API Keys)      │      │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Artifact Registry                             │   │
│  │                    (Docker Images)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Google Cloud Setup

### 1.1 Set Environment Variables

```bash
# Set your project configuration
# IMPORTANT: Replace these values with your own
export PROJECT_ID="your-gcp-project-id"        # e.g., "gsdta-prod"
export REGION="us-central1"                     # Recommended region
export SERVICE_NAME="gsdta-web"                 # Cloud Run service name
export GAR_REPO="web-apps"                      # Artifact Registry repo
export RUNTIME_SA="gsdta-api-runner"            # Runtime service account
export CICD_SA="github-actions"                 # CI/CD service account

# Verify variables are set
echo "PROJECT_ID: $PROJECT_ID"
echo "REGION: $REGION"
```

### 1.2 Create GCP Project

```bash
# Create new project (if it doesn't exist)
gcloud projects create $PROJECT_ID --name="GSDTA Production"

# Set as active project
gcloud config set project $PROJECT_ID

# Verify project
gcloud projects describe $PROJECT_ID
```

### 1.3 Link Billing Account

```bash
# List available billing accounts
gcloud billing accounts list

# Link billing (replace with your billing account ID)
export BILLING_ACCOUNT="XXXXXX-XXXXXX-XXXXXX"
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT

# Verify billing is enabled
gcloud billing projects describe $PROJECT_ID
```

### 1.4 Enable Required APIs

```bash
# Enable all required APIs
gcloud services enable \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  firestore.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com \
  --project=$PROJECT_ID

# Verify APIs are enabled
gcloud services list --enabled --project=$PROJECT_ID
```

### 1.5 Create Firestore Database

```bash
# Create Firestore in Native mode
gcloud firestore databases create \
  --location=$REGION \
  --type=firestore-native \
  --project=$PROJECT_ID

# Verify database
gcloud firestore databases list --project=$PROJECT_ID
```

### 1.6 Create Artifact Registry Repository

```bash
# Create Docker repository
gcloud artifacts repositories create $GAR_REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="GSDTA web application images" \
  --project=$PROJECT_ID

# Verify repository
gcloud artifacts repositories list --location=$REGION --project=$PROJECT_ID

# Configure Docker to use Artifact Registry
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet
```

### 1.7 Create Service Accounts

#### Runtime Service Account (for Cloud Run)

```bash
# Create runtime service account
gcloud iam service-accounts create $RUNTIME_SA \
  --display-name="GSDTA Runtime Service Account" \
  --project=$PROJECT_ID

# Grant Firestore access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Verify
gcloud iam service-accounts list --project=$PROJECT_ID
```

#### CI/CD Service Account (for GitHub Actions)

```bash
# Create CI/CD service account
gcloud iam service-accounts create $CICD_SA \
  --display-name="GitHub Actions CI/CD" \
  --project=$PROJECT_ID

# Grant Artifact Registry write access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Cloud Run admin access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create JSON key for GitHub Actions
gcloud iam service-accounts keys create cicd-sa-key.json \
  --iam-account=$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com

# IMPORTANT: Save this key securely - you'll add it to GitHub Secrets
cat cicd-sa-key.json

# Delete the key file after copying (security best practice)
# rm cicd-sa-key.json
```

---

## Phase 2: Firebase Setup

### 2.1 Add Firebase to Project

```bash
# Add Firebase to your GCP project
firebase projects:addfirebase $PROJECT_ID

# Verify Firebase is added
firebase projects:list
```

### 2.2 Create Firebase Web App

```bash
# Create web app
firebase apps:create web "GSDTA Web App" --project $PROJECT_ID

# List apps to get Web App ID
firebase apps:list --project $PROJECT_ID

# Get SDK config
export WEB_APP_ID=$(firebase apps:list --project $PROJECT_ID | grep "WEB" | awk '{print $4}')
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID

# Save config to file
firebase apps:sdkconfig web $WEB_APP_ID --project $PROJECT_ID > firebase-config.json
cat firebase-config.json
```

### 2.3 Configure Firebase Authentication

**Manual Steps in Firebase Console:**

1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to: **Authentication** → **Sign-in method**
4. Enable:
   - **Email/Password** - Toggle ON
   - **Google** - Toggle ON, add support email
5. Navigate to: **Authentication** → **Settings** → **Authorized domains**
6. Add:
   - `localhost`
   - `app.yourdomain.com` (your production domain)
   - Your Cloud Run URL (after deployment)

### 2.4 Create Secrets in Secret Manager

```bash
# Extract values from firebase-config.json
export FIREBASE_API_KEY="AIzaSy..."           # From config
export FIREBASE_AUTH_DOMAIN="$PROJECT_ID.firebaseapp.com"
export FIREBASE_PROJECT_ID="$PROJECT_ID"
export FIREBASE_APP_ID="1:xxx:web:xxx"        # From config

# Create secrets
echo -n "$FIREBASE_API_KEY" | gcloud secrets create FIREBASE_API_KEY \
  --data-file=- --project=$PROJECT_ID

echo -n "$FIREBASE_AUTH_DOMAIN" | gcloud secrets create FIREBASE_AUTH_DOMAIN \
  --data-file=- --project=$PROJECT_ID

echo -n "$FIREBASE_PROJECT_ID" | gcloud secrets create FIREBASE_PROJECT_ID \
  --data-file=- --project=$PROJECT_ID

echo -n "$FIREBASE_APP_ID" | gcloud secrets create FIREBASE_APP_ID \
  --data-file=- --project=$PROJECT_ID

# Grant runtime SA access to secrets
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
done

# Verify secrets
gcloud secrets list --project=$PROJECT_ID
```

### 2.5 Deploy Firestore Security Rules

```bash
# From repository root
firebase use $PROJECT_ID

# Deploy security rules
firebase deploy --only firestore:rules --project $PROJECT_ID

# Deploy indexes
firebase deploy --only firestore:indexes --project $PROJECT_ID
```

---

## Phase 3: AWS Route 53 & CloudFront Setup

### 3.1 Create Hosted Zone (if not exists)

```bash
# Set your domain
export DOMAIN="yourdomain.com"
export APP_SUBDOMAIN="app"

# Create hosted zone (if new domain)
aws route53 create-hosted-zone \
  --name $DOMAIN \
  --caller-reference $(date +%s) \
  --hosted-zone-config Comment="GSDTA Production"

# Get hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN \
  --query "HostedZones[0].Id" \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"
```

### 3.2 Create Domain Mapping in Cloud Run

```bash
# Create domain mapping
gcloud run domain-mappings create \
  --service $SERVICE_NAME \
  --domain $APP_SUBDOMAIN.$DOMAIN \
  --region $REGION \
  --project $PROJECT_ID

# Get DNS records (you'll need these for Route 53)
gcloud run domain-mappings describe \
  --domain $APP_SUBDOMAIN.$DOMAIN \
  --region $REGION \
  --project $PROJECT_ID
```

### 3.3 Add CNAME Record in Route 53

```bash
# Create CNAME record for app subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "'$APP_SUBDOMAIN.$DOMAIN'",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "ghs.googlehosted.com"}]
      }
    }]
  }'

# Verify CNAME record
aws route53 list-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --query "ResourceRecordSets[?Name=='$APP_SUBDOMAIN.$DOMAIN.']"
```

### 3.4 Verify DNS Propagation

```bash
# Check CNAME record (may take 5-10 minutes)
nslookup -type=CNAME $APP_SUBDOMAIN.$DOMAIN 8.8.8.8

# Expected output:
# app.yourdomain.com canonical name = ghs.googlehosted.com
```

### 3.5 CloudFront Setup (Optional - for Apex Domain Redirect)

If you want `yourdomain.com` to redirect to `app.yourdomain.com`:

#### Create S3 Bucket for Redirect

```bash
# Create S3 bucket (bucket name must match domain)
aws s3api create-bucket \
  --bucket $DOMAIN \
  --region us-east-1

# Configure bucket for website hosting with redirect
aws s3api put-bucket-website \
  --bucket $DOMAIN \
  --website-configuration '{
    "RedirectAllRequestsTo": {
      "HostName": "'$APP_SUBDOMAIN.$DOMAIN'",
      "Protocol": "https"
    }
  }'

# Enable public access (required for website hosting)
aws s3api put-public-access-block \
  --bucket $DOMAIN \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

#### Request ACM Certificate (us-east-1 for CloudFront)

```bash
# Request certificate
export CERT_ARN=$(aws acm request-certificate \
  --region us-east-1 \
  --domain-name $DOMAIN \
  --subject-alternative-names "www.$DOMAIN" \
  --validation-method DNS \
  --query CertificateArn \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get DNS validation records
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn $CERT_ARN \
  --query "Certificate.DomainValidationOptions[*].ResourceRecord"
```

Add the CNAME records shown above to Route 53 for certificate validation.

#### Create CloudFront Distribution

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "'$(date +%s)'",
    "Comment": "GSDTA Apex Domain Redirect",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "S3-'$DOMAIN'",
        "DomainName": "'$DOMAIN'.s3-website-us-east-1.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-'$DOMAIN'",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "Aliases": {
      "Quantity": 2,
      "Items": ["'$DOMAIN'", "www.'$DOMAIN'"]
    },
    "ViewerCertificate": {
      "ACMCertificateArn": "'$CERT_ARN'",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }
  }'

# Get CloudFront distribution domain
export CF_DOMAIN=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, '$DOMAIN')]].DomainName" \
  --output text)

echo "CloudFront Domain: $CF_DOMAIN"
```

#### Add Alias Records for Apex Domain

```bash
# Get CloudFront hosted zone ID (always Z2FDTNDATAQYW2)
export CF_HOSTED_ZONE="Z2FDTNDATAQYW2"

# Create A record alias for apex domain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "'$DOMAIN'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$CF_HOSTED_ZONE'",
          "DNSName": "'$CF_DOMAIN'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# Create A record alias for www
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.'$DOMAIN'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$CF_HOSTED_ZONE'",
          "DNSName": "'$CF_DOMAIN'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## Phase 4: GitHub CI/CD Setup

### 4.1 Add GitHub Secrets

Navigate to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `GCP_SA_KEY` | Contents of `cicd-sa-key.json` | CI/CD service account key |
| `GCP_PROJECT_ID` | Your project ID | e.g., `gsdta-prod` |

For UAT testing (optional):

| Secret Name | Value |
|-------------|-------|
| `UAT_ADMIN_EMAIL` | Admin test account email |
| `UAT_ADMIN_PASSWORD` | Admin test account password |
| `UAT_TEACHER_EMAIL` | Teacher test account email |
| `UAT_TEACHER_PASSWORD` | Teacher test account password |
| `UAT_PARENT_EMAIL` | Parent test account email |
| `UAT_PARENT_PASSWORD` | Parent test account password |
| `QA_FIREBASE_API_KEY` | Firebase API key for testing |
| `PAT_TOKEN` | Personal Access Token for auto-merge |

### 4.2 Update Workflow Configuration

Edit `.github/workflows/deploy-prod.yml`:

```yaml
env:
  NODE_VERSION: 20
  GCP_PROJECT_ID: your-project-id        # UPDATE THIS
  GAR_LOCATION: us-central1
  GAR_REPO: web-apps
  SERVICE_NAME: gsdta-web
  SITE_URL: https://app.yourdomain.com   # UPDATE THIS
```

### 4.3 Update Firebase Configuration

Edit `.firebaserc`:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

---

## Phase 5: Deployment

### 5.1 Initial Manual Deployment (Optional)

For testing before CI/CD:

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# Build Docker image
export COMMIT=$(git rev-parse --short HEAD)
export IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/$SERVICE_NAME:$COMMIT"

docker build \
  --build-arg VERSION=$COMMIT \
  --build-arg COMMIT=$COMMIT \
  --build-arg NEXT_PUBLIC_AUTH_MODE=firebase \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  --build-arg NEXT_PUBLIC_USE_MSW=false \
  --build-arg NEXT_PUBLIC_SITE_URL=https://$APP_SUBDOMAIN.$DOMAIN \
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
  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,GOOGLE_CLOUD_PROJECT=$PROJECT_ID \
  --set-secrets NEXT_PUBLIC_FIREBASE_API_KEY=FIREBASE_API_KEY:latest,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,NEXT_PUBLIC_FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,NEXT_PUBLIC_FIREBASE_APP_ID=FIREBASE_APP_ID:latest \
  --project $PROJECT_ID

# Get service URL
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
```

### 5.2 Deploy via CI/CD

```bash
# Commit configuration changes
git add .firebaserc .github/workflows/
git commit -m "chore: configure deployment for new infrastructure"
git push origin main
```

The push to `main` branch triggers automatic deployment via GitHub Actions.

---

## Phase 6: Verification

### 6.1 Health Check

```bash
# Test health endpoint
curl https://$APP_SUBDOMAIN.$DOMAIN/api/v1/health

# Expected response:
# {"status":"healthy","timestamp":"..."}
```

### 6.2 Verify Cloud Run Service

```bash
# Check service status
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID

# View logs
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --limit 50
```

### 6.3 Test Authentication

1. Open: `https://app.yourdomain.com`
2. Click: **Sign In**
3. Test Google sign-in
4. Verify in Firebase Console → Authentication → Users

### 6.4 Verify DNS

```bash
# Check CNAME
nslookup -type=CNAME $APP_SUBDOMAIN.$DOMAIN 8.8.8.8

# Check A record (if using CloudFront)
nslookup -type=A $DOMAIN 8.8.8.8

# Test HTTPS
curl -I https://$APP_SUBDOMAIN.$DOMAIN
```

### 6.5 Complete Verification Checklist

| Check | Command | Expected Result |
|-------|---------|-----------------|
| GCP Project | `gcloud projects describe $PROJECT_ID` | Project details |
| APIs Enabled | `gcloud services list --enabled` | All required APIs |
| Firestore | `gcloud firestore databases list` | Database listed |
| Secret Manager | `gcloud secrets list` | 4 Firebase secrets |
| Artifact Registry | `gcloud artifacts repositories list` | Repository listed |
| Cloud Run | `gcloud run services list` | Service running |
| Domain Mapping | `gcloud run domain-mappings list` | Domain mapped |
| Health Check | `curl .../api/v1/health` | `{"status":"healthy"}` |
| Route 53 CNAME | `nslookup app.domain.com` | ghs.googlehosted.com |

---

## Troubleshooting

### Issue: "Permission denied" accessing secrets

```bash
# Verify runtime SA has secretAccessor role
gcloud secrets get-iam-policy FIREBASE_API_KEY --project=$PROJECT_ID

# Re-grant if missing
gcloud secrets add-iam-policy-binding FIREBASE_API_KEY \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### Issue: Domain certificate pending

```bash
# Check domain mapping status
gcloud run domain-mappings describe \
  --domain $APP_SUBDOMAIN.$DOMAIN \
  --region $REGION

# Verify DNS is correct
nslookup -type=CNAME $APP_SUBDOMAIN.$DOMAIN 8.8.8.8

# Certificate provisioning can take 15-30 minutes
```

### Issue: 500 errors on authenticated endpoints

```bash
# Check Cloud Run logs
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --limit 100

# Common cause: firebase-admin bundling issue
# Solution: See docs/KNOWN-ISSUES.md
```

### Issue: CORS errors

```bash
# Verify NEXT_PUBLIC_SITE_URL is set correctly
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format="yaml(spec.template.spec.containers[0].env)"

# Update if needed
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars NEXT_PUBLIC_SITE_URL=https://$APP_SUBDOMAIN.$DOMAIN
```

### Issue: GitHub Actions deployment fails

1. Verify `GCP_SA_KEY` secret is valid JSON
2. Check CI service account has all required roles
3. Verify secrets exist in Secret Manager
4. Check workflow has correct project ID
5. Review GitHub Actions logs for specific errors

---

## Quick Reference Commands

### Google Cloud

```bash
# List all services
gcloud run services list --region $REGION

# View service details
gcloud run services describe $SERVICE_NAME --region $REGION

# View logs
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50

# Stream logs (real-time)
gcloud run services logs tail $SERVICE_NAME --region $REGION

# List secrets
gcloud secrets list --project $PROJECT_ID

# View secret value
gcloud secrets versions access latest --secret=FIREBASE_API_KEY --project=$PROJECT_ID

# Redeploy service (force new revision)
gcloud run services update $SERVICE_NAME --region $REGION

# Delete service
gcloud run services delete $SERVICE_NAME --region $REGION
```

### AWS Route 53

```bash
# List hosted zones
aws route53 list-hosted-zones

# List records in zone
aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID

# Delete record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "app.domain.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "ghs.googlehosted.com"}]
      }
    }]
  }'
```

### AWS CloudFront

```bash
# List distributions
aws cloudfront list-distributions

# Get distribution details
aws cloudfront get-distribution --id DISTRIBUTION_ID

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

### Firebase

```bash
# List projects
firebase projects:list

# Deploy rules
firebase deploy --only firestore:rules --project $PROJECT_ID

# Deploy indexes
firebase deploy --only firestore:indexes --project $PROJECT_ID
```

---

## Migration Checklist

Use this checklist when setting up new infrastructure:

### Google Cloud

- [ ] Create GCP project with billing
- [ ] Enable all required APIs
- [ ] Create Firestore database
- [ ] Create Artifact Registry repository
- [ ] Create runtime service account
- [ ] Create CI/CD service account
- [ ] Add Firebase to project
- [ ] Create Firebase web app
- [ ] Configure Firebase Authentication
- [ ] Create secrets in Secret Manager
- [ ] Grant service account access to secrets
- [ ] Deploy Firestore rules and indexes

### AWS

- [ ] Create Route 53 hosted zone (if needed)
- [ ] Create domain mapping in Cloud Run
- [ ] Add CNAME record for app subdomain
- [ ] (Optional) Create S3 bucket for apex redirect
- [ ] (Optional) Request ACM certificate
- [ ] (Optional) Create CloudFront distribution
- [ ] (Optional) Add alias records for apex domain
- [ ] Verify DNS propagation
- [ ] Verify SSL certificate

### GitHub

- [ ] Add `GCP_SA_KEY` secret
- [ ] Add `GCP_PROJECT_ID` secret
- [ ] Update `.firebaserc` with project ID
- [ ] Update workflow files with project ID
- [ ] Push to main branch to trigger deployment

### Verification

- [ ] Health check endpoint works
- [ ] Authentication flow works
- [ ] Firestore read/write works
- [ ] Custom domain resolves
- [ ] HTTPS works
- [ ] Apex domain redirects (if configured)

---

## Support & Resources

### Documentation

- [Google Cloud Run](https://cloud.google.com/run/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore](https://firebase.google.com/docs/firestore)
- [AWS Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/)
- [AWS CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/)

### Project Documentation

- `docs/REQUIREMENTS.md` - Feature requirements
- `docs/ROLES.md` - Role-based access control
- `docs/KNOWN-ISSUES.md` - Known issues and workarounds
- `docs/TESTING.md` - Testing guide

---

**Document Version**: 1.0
**Total Setup Time**: 2-3 hours
**Difficulty**: Intermediate
**Prerequisites**: Basic GCP/AWS knowledge, command line familiarity

---

**This document provides complete instructions for deploying the GSDTA Web application in new cloud accounts.**
