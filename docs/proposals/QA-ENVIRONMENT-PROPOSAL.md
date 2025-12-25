# QA Environment Proposal

**Project**: GSDTA Web Application  
**Author**: Engineering Team  
**Date**: December 24, 2024  
**Status**: DRAFT - Pending Review

---

## Executive Summary

This proposal introduces a **QA/Staging environment** (`app.qa.gsdta.com`) to provide a safe testing ground before production deployments. The current workflow deploys directly to production on `main` branch merges, which poses risk for a production school management system.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Data Isolation** | Separate Firebase Project | Complete isolation, no risk of test data in production |
| **QA Access** | Public | Easier for stakeholders to preview features |
| **Workflow Structure** | Separate files + Reusable workflows | DRY principle, easier maintenance |

### Proposed Architecture

| Environment | Domain | Branch | GCP Service | Firebase Project | Purpose |
|------------|--------|--------|-------------|------------------|---------|
| **Production** | `app.gsdta.com` | `main` | `gsdta-web` | `gsdta-prod` (existing: `YOUR_PROJECT_ID`) | Live users |
| **QA/Staging** | `app.qa.gsdta.com` | `develop` | `gsdta-web-qa` | `gsdta-qa` (new) | Testing |

---

## Current State

### Infrastructure
- **Hosting**: Google Cloud Run (GCP)
- **DNS/CDN**: AWS Route 53 + CloudFront (for apex domain redirect)
- **CI/CD**: GitHub Actions
- **Database**: Firestore (GCP)
- **Auth**: Firebase Authentication

### Current Workflow
```
develop branch → Tests only (unit + e2e)
main branch    → Tests + Build + Deploy to app.gsdta.com
```

### Pain Points
1. ❌ No pre-production testing environment
2. ❌ Cannot validate deployments before going live
3. ❌ Risk of breaking production for real users
4. ❌ No way for stakeholders to preview features

---

## Proposed Solution

### New Workflow
```
develop branch → Tests + Build + Deploy to app.qa.gsdta.com
main branch    → Tests + Build + Deploy to app.gsdta.com
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub Repository                               │
│                                                                              │
│   ┌─────────────┐                              ┌─────────────┐               │
│   │   develop   │                              │    main     │               │
│   │   branch    │                              │   branch    │               │
│   └──────┬──────┘                              └──────┬──────┘               │
│          │                                           │                       │
│          ▼                                           ▼                       │
│   ┌─────────────────────┐                   ┌─────────────────────┐         │
│   │  deploy-qa.yml      │                   │  deploy-prod.yml    │         │
│   │  ↓ calls            │                   │  ↓ calls            │         │
│   │  ci.yml (tests)     │                   │  ci.yml (tests)     │         │
│   │  ↓ calls            │                   │  ↓ calls            │         │
│   │  build-deploy.yml   │                   │  build-deploy.yml   │         │
│   └──────────┬──────────┘                   └──────────┬──────────┘         │
└──────────────│──────────────────────────────────────────│────────────────────┘
               │                                          │
               ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Google Cloud Platform (GCP)                          │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Artifact Registry (web-apps)                    │   │
│   │    gsdta-web:qa-<sha>                  gsdta-web:prod-<sha>          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     QA Environment (gsdta-qa)                        │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│   │  │  Cloud Run      │  │  Firestore      │  │  Firebase Auth  │      │   │
│   │  │  gsdta-web-qa   │  │  (QA data)      │  │  (QA users)     │      │   │
│   │  └────────┬────────┘  └─────────────────┘  └─────────────────┘      │   │
│   │           │ app.qa.gsdta.com                                         │   │
│   └───────────│─────────────────────────────────────────────────────────┘   │
│               │                                                              │
│   ┌───────────│─────────────────────────────────────────────────────────┐   │
│   │           │       Production Environment (gsdta-prod)                │   │
│   │  ┌────────┴────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│   │  │  Cloud Run      │  │  Firestore      │  │  Firebase Auth  │      │   │
│   │  │  gsdta-web      │  │  (Prod data)    │  │  (Real users)   │      │   │
│   │  └────────┬────────┘  └─────────────────┘  └─────────────────┘      │   │
│   │           │ app.gsdta.com                                            │   │
│   └───────────│─────────────────────────────────────────────────────────┘   │
└───────────────│──────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWS (DNS & CDN)                                      │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Route 53 (gsdta.com)                         │   │
│   │                                                                      │   │
│   │   app.qa  CNAME → ghs.googlehosted.com (QA Cloud Run mapping)       │   │
│   │   app     CNAME → ghs.googlehosted.com (Prod Cloud Run mapping)     │   │
│   │   @       A     → CloudFront (apex redirect to app.gsdta.com)       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Phase 1: GCP Infrastructure Setup

#### 1.1 Create QA Cloud Run Service

```bash
# Environment variables
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="us-central1"
export QA_SERVICE_NAME="gsdta-web-qa"

# Create placeholder Cloud Run service (required before domain mapping)
# Using Google's hello image as a placeholder until first real deployment
gcloud beta run deploy $QA_SERVICE_NAME \
  --image=gcr.io/cloudrun/hello \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated
```

#### 1.2 Create QA Domain Mapping

```bash
# Map QA domain to the service (service must exist first)
gcloud beta run domain-mappings create \
  --service=$QA_SERVICE_NAME \
  --domain=app.qa.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID

# Get DNS records needed
gcloud beta run domain-mappings describe \
  --domain=app.qa.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID
```

### Phase 2: AWS DNS Configuration

#### 2.1 Add CNAME Record for QA Subdomain

In AWS Route 53 Console (gsdta.com hosted zone):

| Record Name | Type | Value | TTL |
|-------------|------|-------|-----|
| `app.qa` | CNAME | `ghs.googlehosted.com` | 300 |

**Note**: Google Cloud Run domain mappings use the same `ghs.googlehosted.com` CNAME for all custom domains - Google routes based on the SNI (hostname) in the TLS handshake.

#### 2.2 Verify DNS Configuration

```bash
# Check if DNS resolves (should show ghs.googlehosted.com)
nslookup app.qa.gsdta.com

# Or with dig
dig app.qa.gsdta.com CNAME +short
```

Expected output:
```
app.qa.gsdta.com        canonical name = ghs.googlehosted.com.
```

#### 2.3 Verify SSL Certificate (Wait 15-30 minutes)

```bash
# Check certificate provisioning status
gcloud beta run domain-mappings describe \
  --domain=app.qa.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.resourceRecords,status.conditions)"

# Test HTTPS (will fail until cert is provisioned)
curl -I https://app.qa.gsdta.com
```

**Note**: SSL certificate provisioning takes 15-30 minutes. SSL errors are expected initially.

### Phase 3: Firebase Configuration (Separate Projects)

Since we're isolating data completely, we need a dedicated Firebase project for QA.

#### 3.1 Create QA Firebase Project

```bash
# Create new GCP project for QA
export QA_PROJECT_ID="gsdta-qa"
export REGION="us-central1"

gcloud projects create $QA_PROJECT_ID --name="GSDTA QA Environment"

# Link billing (required for Cloud Run, Firestore)
# To find your billing account: gcloud billing accounts list
gcloud beta billing projects link $QA_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID

# Enable required APIs
gcloud services enable firebase.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable firestore.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable identitytoolkit.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable run.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$QA_PROJECT_ID

# Verify all APIs are enabled
gcloud services list --enabled --project=$QA_PROJECT_ID | grep -E "firebase|firestore|identitytoolkit|run.googleapis|artifactregistry|secretmanager"

# Add Firebase to project (may timeout but still succeed)
firebase projects:addfirebase $QA_PROJECT_ID

# Verify Firebase was added
firebase projects:list | grep $QA_PROJECT_ID

# Create Firestore database
gcloud firestore databases create --location=$REGION --type=firestore-native --project=$QA_PROJECT_ID

# Create Firebase web app
firebase apps:create web "GSDTA QA Web" --project $QA_PROJECT_ID
# Note: Save the App ID from output (e.g., 1:YOUR_QA_PROJECT_NUMBER:web:8f37a323522a6649678ac7)

# Get SDK config (replace <WEB_APP_ID> with the App ID from above)
firebase apps:sdkconfig web <WEB_APP_ID> --project $QA_PROJECT_ID
```

**Expected SDK config output:**
```json
{
  "projectId": "gsdta-qa",
  "appId": "1:YOUR_QA_PROJECT_NUMBER:web:8f37a323522a6649678ac7",
  "storageBucket": "gsdta-qa.firebasestorage.app",
  "apiKey": "REDACTED_FIREBASE_API_KEY",
  "authDomain": "gsdta-qa.firebaseapp.com",
  "messagingSenderId": "YOUR_QA_PROJECT_NUMBER"
}
```

**Save these values** - you'll need them for creating secrets in step 3.2.

#### 3.2 Create QA Secrets in QA GCP Project

Secrets are stored in their respective projects for better organization and security:
- **Production secrets** → `YOUR_PROJECT_ID` (existing)
- **QA secrets** → `gsdta-qa` (new)

The CI service account and Cloud Run service account both need cross-project access to read secrets.

```bash
export QA_PROJECT_ID="gsdta-qa"
export PROD_PROJECT_ID="YOUR_PROJECT_ID"

# Create secrets in QA project (use values from SDK config in step 3.1)
echo -n "REDACTED_FIREBASE_API_KEY" | gcloud secrets create FIREBASE_API_KEY --data-file=- --project=$QA_PROJECT_ID
echo -n "gsdta-qa.firebaseapp.com" | gcloud secrets create FIREBASE_AUTH_DOMAIN --data-file=- --project=$QA_PROJECT_ID
echo -n "gsdta-qa" | gcloud secrets create FIREBASE_PROJECT_ID --data-file=- --project=$QA_PROJECT_ID
echo -n "1:YOUR_QA_PROJECT_NUMBER:web:8f37a323522a6649678ac7" | gcloud secrets create FIREBASE_APP_ID --data-file=- --project=$QA_PROJECT_ID

# Grant CI service account (from prod project) access to QA secrets (for build time)
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:gsdta-web-ci@$PROD_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$QA_PROJECT_ID
done

# Grant Cloud Run service account (from prod project) access to QA secrets (for runtime)
# First, find the Cloud Run service account:
# gcloud run services describe gsdta-web --region=us-central1 --project=$PROD_PROJECT_ID --format="value(spec.template.spec.serviceAccountName)"
# It uses the format: PROJECT_NUMBER-compute@developer.gserviceaccount.com
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$QA_PROJECT_ID
done

# Grant Cloud Run service account Firebase Admin access (for token verification + Firestore)
gcloud projects add-iam-policy-binding $QA_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/firebase.admin"

# Verify secrets were created
gcloud secrets list --project=$QA_PROJECT_ID
```

**Why this approach?**
- ✅ Secrets live with their environment (clear ownership)
- ✅ Single CI service account (simpler GitHub setup)
- ✅ Clear audit trail per project
- ✅ Easier to manage environment-specific rotations
- ✅ Cloud Run can verify Firebase tokens and access Firestore in QA project

#### 3.3 Configure Firebase Auth for QA

In Firebase Console for `gsdta-qa`:
1. Enable **Email/Password** and **Google** sign-in providers
2. Add authorized domains:
   - `localhost`
   - `app.qa.gsdta.com`
   - `gsdta-web-qa-xxx-uc.a.run.app` (Cloud Run URL)

#### 3.4 Deploy Firestore Rules to QA

```bash
# Switch to QA project
firebase use gsdta-qa

# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes --project gsdta-qa
```

### Phase 4: GitHub Actions Workflow Structure

We'll use **GitHub Reusable Workflows** to keep common logic DRY.

#### 4.1 Workflow File Structure

```
.github/workflows/
├── _ci.yml              # Reusable: Tests (unit + e2e)
├── _build-deploy.yml    # Reusable: Build Docker + Deploy to Cloud Run
├── deploy-qa.yml        # Trigger: develop branch → QA
├── deploy-prod.yml      # Trigger: main branch → Production
└── deploy-manual.yml    # Trigger: Manual deployment to any environment
```

#### 4.2 Reusable Workflow: CI Tests

**File**: `.github/workflows/_ci.yml`

```yaml
# Reusable workflow for running tests
# Called by deploy-qa.yml and deploy-prod.yml

name: CI Tests

on:
  workflow_call:
    inputs:
      runner:
        description: 'Runner to use'
        type: string
        default: 'ubuntu-latest'
    outputs:
      tests_passed:
        description: 'Whether all tests passed'
        value: ${{ jobs.summary.outputs.passed }}

env:
  NODE_VERSION: 20

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ${{ inputs.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci || npm ci || npm ci
      - name: API Tests
        run: cd api && npm run lint && npm run typecheck && npm test
      - name: UI Tests
        run: cd ui && npm run lint && npm run typecheck && npm test

  e2e-tests:
    name: E2E Tests
    runs-on: ${{ inputs.runner }}
    container:
      image: mcr.microsoft.com/playwright:v1.56.1-jammy
    env:
      FIRESTORE_EMULATOR_HOST: localhost:8889
      FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
      FIREBASE_PROJECT_ID: demo-gsdta
      USE_TEST_AUTH: 'true'
      ALLOW_TEST_INVITES: '1'
      NODE_ENV: test
      NEXT_PUBLIC_AUTH_MODE: firebase
      NEXT_PUBLIC_USE_MSW: false
      NEXT_PUBLIC_FIREBASE_API_KEY: demo-key
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: localhost
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: demo-gsdta
      NEXT_PUBLIC_FIREBASE_APP_ID: demo-app
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: localhost:8889
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - run: npm install -g firebase-tools
      - run: npm ci
      - name: Install native binaries
        run: |
          cd ui
          if npm run ensure:native; then
            echo "✅ ensure:native succeeded"
          else
            npm install --no-save lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu
          fi
          [ -f "node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node" ] && \
            cp node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node node_modules/lightningcss/
          [ -f "node_modules/@tailwindcss/oxide-linux-x64-gnu/oxide.linux-x64-gnu.node" ] && \
            cp node_modules/@tailwindcss/oxide-linux-x64-gnu/oxide.linux-x64-gnu.node node_modules/@tailwindcss/oxide/
          rm -rf ../node_modules/canvas node_modules/canvas 2>/dev/null || true
      - name: Verify bindings
        run: cd ui && node -e "require('lightningcss')" && node -e "require('@tailwindcss/oxide')"
      - name: Start emulators
        run: |
          firebase emulators:start --project demo-gsdta --only auth,firestore &
          for i in {1..60}; do
            if curl -s http://localhost:9099 >/dev/null 2>&1; then
              echo "✅ Emulators ready after ${i}s"
              break
            fi
            sleep 1
          done
      - run: npm run seed
      - name: API E2E (Cucumber)
        run: cd api && npm run test:e2e
      - name: Build UI for E2E
        run: cd ui && npm run build
      - name: UI E2E (Playwright)
        run: cd ui && npm run e2e:ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: ui/playwright-report/

  summary:
    name: Test Summary
    runs-on: ubuntu-latest
    needs: [unit-tests, e2e-tests]
    if: always()
    outputs:
      passed: ${{ steps.check.outputs.passed }}
    steps:
      - name: Check test results
        id: check
        run: |
          if [ "${{ needs.unit-tests.result }}" = "success" ] && [ "${{ needs.e2e-tests.result }}" = "success" ]; then
            echo "passed=true" >> $GITHUB_OUTPUT
            echo "✅ All tests passed"
          else
            echo "passed=false" >> $GITHUB_OUTPUT
            echo "❌ Some tests failed"
            exit 1
          fi
```

#### 4.3 Reusable Workflow: Build & Deploy

**File**: `.github/workflows/_build-deploy.yml`

```yaml
# Reusable workflow for building and deploying
# Called by deploy-qa.yml and deploy-prod.yml

name: Build & Deploy

on:
  workflow_call:
    inputs:
      environment:
        description: 'Target environment (qa or production)'
        type: string
        required: true
      service_name:
        description: 'Cloud Run service name'
        type: string
        required: true
      site_url:
        description: 'Site URL for the environment'
        type: string
        required: true
      gcp_project_id:
        description: 'GCP Project ID for deployment (where Cloud Run lives)'
        type: string
        required: true
      secrets_project_id:
        description: 'GCP Project ID where secrets are stored'
        type: string
        required: true
      firebase_project_id:
        description: 'Firebase Project ID'
        type: string
        required: true
      runner:
        description: 'Runner to use'
        type: string
        default: 'ubuntu-latest'
      image_tag:
        description: 'Docker image tag (defaults to commit SHA)'
        type: string
        default: ''
    secrets:
      GCP_SA_KEY:
        required: true

env:
  NODE_VERSION: 20
  GAR_LOCATION: us-central1
  GAR_REPO: web-apps

jobs:
  build:
    name: Build Docker Image
    runs-on: ${{ inputs.runner }}
    outputs:
      image_uri: ${{ steps.meta.outputs.image_uri }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - uses: google-github-actions/setup-gcloud@v2
      
      - run: gcloud auth configure-docker ${{ env.GAR_LOCATION }}-docker.pkg.dev --quiet
      
      - name: Compute metadata
        id: meta
        shell: bash
        run: |
          TAG="${{ inputs.image_tag }}"
          [ -z "$TAG" ] && TAG="${GITHUB_SHA::7}"
          
          IMAGE_URI="${{ env.GAR_LOCATION }}-docker.pkg.dev/${{ inputs.gcp_project_id }}/${{ env.GAR_REPO }}/gsdta-web:${{ inputs.environment }}-${TAG}"
          
          echo "image_uri=$IMAGE_URI" >> $GITHUB_OUTPUT
          echo "tag=$TAG" >> $GITHUB_OUTPUT
          echo "📦 Image: $IMAGE_URI"
      
      - name: Fetch Firebase secrets
        id: secrets
        run: |
          # Secrets are stored in their respective project (prod secrets in prod, QA secrets in QA)
          echo "api_key=$(gcloud secrets versions access latest --secret=FIREBASE_API_KEY --project=${{ inputs.secrets_project_id }})" >> $GITHUB_OUTPUT
          echo "auth_domain=$(gcloud secrets versions access latest --secret=FIREBASE_AUTH_DOMAIN --project=${{ inputs.secrets_project_id }})" >> $GITHUB_OUTPUT
          echo "project_id=$(gcloud secrets versions access latest --secret=FIREBASE_PROJECT_ID --project=${{ inputs.secrets_project_id }})" >> $GITHUB_OUTPUT
          echo "app_id=$(gcloud secrets versions access latest --secret=FIREBASE_APP_ID --project=${{ inputs.secrets_project_id }})" >> $GITHUB_OUTPUT
      
      - uses: docker/setup-buildx-action@v3
      
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.image_uri }}
          no-cache: true
          build-args: |
            VERSION=${{ steps.meta.outputs.tag }}
            COMMIT=${{ github.sha }}
            NEXT_PUBLIC_AUTH_MODE=firebase
            NEXT_PUBLIC_API_BASE_URL=/api
            NEXT_PUBLIC_USE_MSW=false
            NEXT_PUBLIC_SITE_URL=${{ inputs.site_url }}
            NEXT_PUBLIC_FIREBASE_API_KEY=${{ steps.secrets.outputs.api_key }}
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ steps.secrets.outputs.auth_domain }}
            NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ steps.secrets.outputs.project_id }}
            NEXT_PUBLIC_FIREBASE_APP_ID=${{ steps.secrets.outputs.app_id }}

  deploy:
    name: Deploy to ${{ inputs.environment }}
    runs-on: ubuntu-latest
    needs: [build]
    environment: ${{ inputs.environment }}
    steps:
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - uses: google-github-actions/setup-gcloud@v2
      
      - name: Deploy to Cloud Run
        run: |
          echo "🚀 Deploying to ${{ inputs.environment }}"
          echo "   Service: ${{ inputs.service_name }}"
          echo "   Image: ${{ needs.build.outputs.image_uri }}"
          echo "   URL: ${{ inputs.site_url }}"
          
          # Note: Secrets are referenced from the secrets_project_id
          # Cloud Run needs access to read secrets at runtime
          gcloud run deploy ${{ inputs.service_name }} \
            --image ${{ needs.build.outputs.image_uri }} \
            --region ${{ env.GAR_LOCATION }} \
            --platform managed \
            --allow-unauthenticated \
            --port 3000 \
            --set-env-vars "NEXT_TELEMETRY_DISABLED=1,NODE_ENV=production,NEXT_PUBLIC_API_BASE_URL=/api,GOOGLE_CLOUD_PROJECT=${{ inputs.firebase_project_id }},NEXT_PUBLIC_AUTH_MODE=firebase,NEXT_PUBLIC_USE_MSW=false,NEXT_PUBLIC_SITE_URL=${{ inputs.site_url }}" \
            --set-secrets "FIREBASE_PROJECT_ID=projects/${{ inputs.secrets_project_id }}/secrets/FIREBASE_PROJECT_ID:latest,NEXT_PUBLIC_FIREBASE_API_KEY=projects/${{ inputs.secrets_project_id }}/secrets/FIREBASE_API_KEY:latest,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projects/${{ inputs.secrets_project_id }}/secrets/FIREBASE_AUTH_DOMAIN:latest,NEXT_PUBLIC_FIREBASE_PROJECT_ID=projects/${{ inputs.secrets_project_id }}/secrets/FIREBASE_PROJECT_ID:latest,NEXT_PUBLIC_FIREBASE_APP_ID=projects/${{ inputs.secrets_project_id }}/secrets/FIREBASE_APP_ID:latest"
      
      - name: Health check
        run: |
          URL="${{ inputs.site_url }}"
          echo "⏳ Waiting for deployment..."
          sleep 15
          
          echo "🔍 Health check: $URL/api/v1/health"
          curl -f $URL/api/v1/health
          
          echo ""
          echo "✅ Deployed successfully!"
          echo "🌐 URL: $URL"
```

#### 4.4 QA Deployment Workflow

**File**: `.github/workflows/deploy-qa.yml`

```yaml
# QA Environment Deployment
# Triggered by: push to develop branch

name: Deploy to QA

on:
  push:
    branches: [develop]

concurrency:
  group: deploy-qa
  cancel-in-progress: true

jobs:
  # Step 1: Run all tests
  tests:
    name: Run Tests
    uses: ./.github/workflows/_ci.yml
    with:
      runner: ubuntu-latest

  # Step 2: Build and deploy to QA (only if tests pass)
  deploy:
    name: Deploy
    needs: [tests]
    if: needs.tests.outputs.tests_passed == 'true'
    uses: ./.github/workflows/_build-deploy.yml
    with:
      environment: qa
      service_name: gsdta-web-qa
      site_url: https://app.qa.gsdta.com
      gcp_project_id: YOUR_PROJECT_ID
      secrets_project_id: gsdta-qa          # QA secrets in QA project
      firebase_project_id: gsdta-qa
      runner: ubuntu-latest
    secrets:
      GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
```

#### 4.5 Production Deployment Workflow

**File**: `.github/workflows/deploy-prod.yml`

```yaml
# Production Environment Deployment
# Triggered by: push to main branch

name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false  # Never cancel production deployments

jobs:
  # Step 1: Run all tests
  tests:
    name: Run Tests
    uses: ./.github/workflows/_ci.yml
    with:
      runner: ubuntu-latest

  # Step 2: Build and deploy to Production (only if tests pass)
  deploy:
    name: Deploy
    needs: [tests]
    if: needs.tests.outputs.tests_passed == 'true'
    uses: ./.github/workflows/_build-deploy.yml
    with:
      environment: production
      service_name: gsdta-web
      site_url: https://app.gsdta.com
      gcp_project_id: YOUR_PROJECT_ID
      secrets_project_id: YOUR_PROJECT_ID  # Prod secrets in prod project
      firebase_project_id: YOUR_PROJECT_ID
      runner: ubuntu-latest
    secrets:
      GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
```

#### 4.6 Manual Deployment Workflow

**File**: `.github/workflows/deploy-manual.yml`

```yaml
# Manual Deployment
# Triggered by: workflow_dispatch (manual trigger)

name: Manual Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - qa
          - production
      
      run_tests:
        description: 'Run tests before deploy?'
        required: true
        default: true
        type: boolean
      
      runner:
        description: 'Runner to use'
        required: true
        default: 'ubuntu-latest'
        type: choice
        options:
          - ubuntu-latest
          - Power
      
      image_tag:
        description: 'Image tag (leave empty for commit SHA)'
        required: false
        default: ''

jobs:
  # Step 1: Run tests (optional)
  tests:
    name: Run Tests
    if: ${{ inputs.run_tests }}
    uses: ./.github/workflows/_ci.yml
    with:
      runner: ${{ inputs.runner }}

  # Step 2: Setup environment config
  setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      service_name: ${{ steps.config.outputs.service_name }}
      site_url: ${{ steps.config.outputs.site_url }}
      firebase_project_id: ${{ steps.config.outputs.firebase_project_id }}
      secrets_project_id: ${{ steps.config.outputs.secrets_project_id }}
    steps:
      - name: Set environment config
        id: config
        run: |
          if [ "${{ inputs.environment }}" = "production" ]; then
            echo "service_name=gsdta-web" >> $GITHUB_OUTPUT
            echo "site_url=https://app.gsdta.com" >> $GITHUB_OUTPUT
            echo "firebase_project_id=YOUR_PROJECT_ID" >> $GITHUB_OUTPUT
            echo "secrets_project_id=YOUR_PROJECT_ID" >> $GITHUB_OUTPUT
          else
            echo "service_name=gsdta-web-qa" >> $GITHUB_OUTPUT
            echo "site_url=https://app.qa.gsdta.com" >> $GITHUB_OUTPUT
            echo "firebase_project_id=gsdta-qa" >> $GITHUB_OUTPUT
            echo "secrets_project_id=gsdta-qa" >> $GITHUB_OUTPUT
          fi

  # Step 3: Build and deploy
  deploy:
    name: Deploy to ${{ inputs.environment }}
    needs: [tests, setup]
    if: |
      always() &&
      (needs.tests.result == 'success' || needs.tests.result == 'skipped')
    uses: ./.github/workflows/_build-deploy.yml
    with:
      environment: ${{ inputs.environment }}
      service_name: ${{ needs.setup.outputs.service_name }}
      site_url: ${{ needs.setup.outputs.site_url }}
      gcp_project_id: YOUR_PROJECT_ID
      secrets_project_id: ${{ needs.setup.outputs.secrets_project_id }}
      firebase_project_id: ${{ needs.setup.outputs.firebase_project_id }}
      runner: ${{ inputs.runner }}
      image_tag: ${{ inputs.image_tag }}
    secrets:
      GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
```

### Phase 5: GitHub Repository Settings

#### 5.1 GitHub Secrets

Go to: **Repository Settings** → **Secrets and variables** → **Actions** → **Secrets**

| Secret Name | Description | Already Exists? |
|-------------|-------------|-----------------|
| `GCP_SA_KEY` | Service account JSON key for `gsdta-web-ci@YOUR_PROJECT_ID.iam.gserviceaccount.com` | ✅ Yes (existing) |

**Note**: No new secrets needed! The existing `GCP_SA_KEY` is used for both QA and Production deployments. The CI service account has been granted cross-project access to read secrets from both GCP projects.

#### 5.2 GitHub Environments (Optional but Recommended)

Go to: **Repository Settings** → **Environments**

Create environments for deployment protection and visibility:

| Environment | Protection Rules | Purpose |
|-------------|------------------|---------|
| `qa` | None (auto-deploy) | Fast iteration on develop branch |
| `production` | Optional: Required reviewers | Safe production deployments |

**Benefits of GitHub Environments:**
- Deployment history visible in GitHub UI
- Environment-specific protection rules
- Deployment status badges
- Optional: Require approval before production deploy

#### 5.3 Branch Protection (Recommended)

Go to: **Repository Settings** → **Branches** → **Add rule**

**For `main` branch:**
- ✅ Require pull request before merging
- ✅ Require status checks to pass (select `Unit Tests` and `E2E Tests`)
- ✅ Require branches to be up to date

**For `develop` branch:**
- ✅ Require status checks to pass (select `Unit Tests` and `E2E Tests`)

---

## Cost Analysis

### Current Costs (Single Environment)
- Cloud Run: ~$0-10/month (free tier covers most usage)
- Firestore: ~$0-5/month (free tier)
- Artifact Registry: ~$0-2/month

### Additional Costs (QA Environment with Separate Firebase)

| Resource | QA Cost Estimate | Notes |
|----------|------------------|-------|
| Cloud Run (QA) | ~$0-5/month | Low traffic, may stay in free tier |
| Additional Docker images | ~$0-1/month | Storage in Artifact Registry |
| QA Firebase Project | ~$0-5/month | Separate Firestore + Auth |
| QA GCP Project APIs | ~$0/month | Free tier covers most |
| **Total Additional** | **~$0-15/month** | Minimal impact |

**Note**: Both Firebase projects likely stay within free tiers for low-traffic QA usage.

---

## Security Considerations

### Access Control

1. **QA Environment**:
   - Publicly accessible (as decided)
   - Add visual banner indicating "QA ENVIRONMENT"
   - Separate Firebase Auth users (isolated from production)
   - Optional future enhancement: Add Cloud IAP for team-only access

2. **Production Environment**:
   - No changes to current security
   - Same Firebase Auth protection
   - Completely isolated data

### Data Protection

Since we're using **separate Firebase projects**:
- ✅ Complete data isolation between QA and Production
- ✅ QA testing cannot affect production data
- ✅ QA users are separate from production users
- ✅ No risk of accidentally modifying production in QA

### Recommended: QA Environment Banner

Add visual indicator in QA environment:

```typescript
// ui/src/components/QABanner.tsx
export function QABanner() {
  if (process.env.NEXT_PUBLIC_SITE_URL?.includes('qa.')) {
    return (
      <div className="bg-yellow-500 text-black text-center py-1 text-sm font-bold">
        ⚠️ QA ENVIRONMENT - Not for production use
      </div>
    );
  }
  return null;
}
```

---

## Rollout Plan

### Week 1: GCP/Firebase Infrastructure Setup
- [ ] Create QA GCP project (`gsdta-qa`)
- [ ] Enable required APIs in QA project
- [ ] Add Firebase to QA project
- [ ] Create Firestore database in QA project
- [ ] Create Firebase web app in QA project
- [ ] Configure Firebase Auth (Email/Password, Google)
- [ ] Deploy Firestore rules and indexes to QA
- [ ] Create QA secrets in production GCP project (for CI/CD)

### Week 2: Cloud Run & DNS Setup
- [ ] Create QA Cloud Run domain mapping in production GCP
- [ ] Add DNS record (`app.qa`) in AWS Route 53
- [ ] Wait for SSL certificate provisioning
- [ ] Add `app.qa.gsdta.com` to QA Firebase authorized domains
- [ ] Verify domain mapping works

### Week 3: CI/CD Workflow Update
- [ ] Create reusable workflow files (`_ci.yml`, `_build-deploy.yml`)
- [ ] Create environment-specific workflows (`deploy-qa.yml`, `deploy-prod.yml`)
- [ ] Create manual deployment workflow (`deploy-manual.yml`)
- [ ] Delete old `main.yml` workflow
- [ ] Create GitHub environments (qa, production)
- [ ] Test develop branch deployment to QA
- [ ] Test main branch deployment to production

### Week 4: Validation & Documentation
- [ ] Test full workflow: PR → develop → QA deployment
- [ ] Test main branch deployment to production
- [ ] Add QA banner component to UI
- [ ] Document deployment process
- [ ] Update team on new workflow

---

## Migration Steps (Detailed)

### Step 1: Create QA Firebase Project

```bash
# Create new GCP project for QA
export QA_PROJECT_ID="gsdta-qa"
export REGION="us-central1"

# Create project
gcloud projects create $QA_PROJECT_ID --name="GSDTA QA Environment"

# Link billing
gcloud beta billing projects link $QA_PROJECT_ID --billing-account=XXXXXX-XXXXXX-XXXXXX

# Enable APIs
gcloud services enable firebase.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable firestore.googleapis.com --project=$QA_PROJECT_ID
gcloud services enable identitytoolkit.googleapis.com --project=$QA_PROJECT_ID

# Add Firebase
firebase projects:addfirebase $QA_PROJECT_ID

# Create Firestore
gcloud firestore databases create --location=$REGION --type=firestore-native --project=$QA_PROJECT_ID

# Create web app
firebase apps:create web "GSDTA QA Web" --project $QA_PROJECT_ID

# Get config (save these values)
firebase apps:sdkconfig web <WEB_APP_ID> --project $QA_PROJECT_ID
```

### Step 2: Configure QA Firebase Auth

In Firebase Console for `gsdta-qa`:
1. Go to Authentication → Sign-in method
2. Enable Email/Password
3. Enable Google (configure OAuth consent)
4. Go to Settings → Authorized domains
5. Add: `localhost`, `app.qa.gsdta.com`

### Step 3: Create QA Secrets in Production GCP

```bash
export PROD_PROJECT_ID="YOUR_PROJECT_ID"

# Create QA secrets (replace with actual values from Step 1)
echo -n "YOUR_QA_API_KEY" | gcloud secrets create QA_FIREBASE_API_KEY --data-file=- --project=$PROD_PROJECT_ID
echo -n "gsdta-qa.firebaseapp.com" | gcloud secrets create QA_FIREBASE_AUTH_DOMAIN --data-file=- --project=$PROD_PROJECT_ID
echo -n "gsdta-qa" | gcloud secrets create QA_FIREBASE_PROJECT_ID --data-file=- --project=$PROD_PROJECT_ID
echo -n "YOUR_QA_APP_ID" | gcloud secrets create QA_FIREBASE_APP_ID --data-file=- --project=$PROD_PROJECT_ID

# Grant CI service account access
for SECRET in QA_FIREBASE_API_KEY QA_FIREBASE_AUTH_DOMAIN QA_FIREBASE_PROJECT_ID QA_FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:gsdta-web-ci@$PROD_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROD_PROJECT_ID
done
```

### Step 4: Deploy Firestore Rules to QA

```bash
# From repository root
firebase use gsdta-qa
firebase deploy --only firestore:rules,firestore:indexes --project gsdta-qa
```

### Step 5: Add DNS Record in AWS Route 53

1. Login to AWS Console
2. Navigate to: **Route 53** → **Hosted zones** → **gsdta.com**
3. Click: **Create record**
4. Configure:
   - **Record name**: `app.qa`
   - **Record type**: `CNAME`
   - **Value**: `ghs.googlehosted.com`
   - **TTL**: `300`
5. Click: **Create records**

### Step 6: Create Domain Mapping (after first deploy)

```bash
# This needs to happen AFTER the first deployment creates the service
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="us-central1"

gcloud run domain-mappings create \
  --service=gsdta-web-qa \
  --domain=app.qa.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID
```

### Step 7: Update GitHub Actions Workflows

Create the new workflow files as specified in Phase 4:
1. `.github/workflows/_ci.yml` - Reusable test workflow
2. `.github/workflows/_build-deploy.yml` - Reusable build/deploy workflow
3. `.github/workflows/deploy-qa.yml` - QA deployment trigger
4. `.github/workflows/deploy-prod.yml` - Production deployment trigger
5. `.github/workflows/deploy-manual.yml` - Manual deployment

Then delete the old `main.yml`.

### Step 8: Test the New Workflow

```bash
# Test QA deployment
git checkout develop
git pull origin develop
echo "# QA Test $(date)" >> README.md
git add README.md
git commit -m "test: verify QA deployment workflow"
git push origin develop

# Watch GitHub Actions - should deploy to app.qa.gsdta.com
# Verify at: https://app.qa.gsdta.com

# Test Production deployment
git checkout main
git merge develop
git push origin main

# Watch GitHub Actions - should deploy to app.gsdta.com
# Verify at: https://app.gsdta.com
```

---

## Alternative Approaches Considered

### Option 1: Preview Deployments per PR (Vercel-style)
- ❌ More complex
- ❌ Cloud Run doesn't natively support this
- ❌ Higher cost (many services)
- ✅ Great for feature previews

**Decision**: Defer to future enhancement

### Option 2: Single Service with Traffic Splitting
- ❌ Both environments share same URL
- ❌ Complex routing
- ❌ No clear QA URL for stakeholders

**Decision**: Rejected

### Option 3: Shared Firebase with Collection Prefixes
- ✅ Simpler setup
- ❌ Data not truly isolated
- ❌ Risk of accidental production data modification
- ❌ Confusing for developers

**Decision**: Rejected - Separate Firebase projects provide better isolation

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| QA deployment success rate | >95% | GitHub Actions metrics |
| Time from push to QA | <10 minutes | GitHub Actions timing |
| Production deployment confidence | High | Team survey |
| Bug escapes to production | Reduced | Bug tracking |

---

## Appendix A: Workflow File Structure Summary

```
.github/workflows/
├── _ci.yml              # Reusable: Unit tests + E2E tests
├── _build-deploy.yml    # Reusable: Docker build + Cloud Run deploy  
├── deploy-qa.yml        # develop branch → QA environment
├── deploy-prod.yml      # main branch → Production environment
└── deploy-manual.yml    # Manual trigger → Any environment
```

**Key Benefits of This Structure**:
1. **DRY**: Common logic in reusable workflows
2. **Clear**: Each file has single responsibility
3. **Safe**: Production workflow is separate from QA
4. **Flexible**: Manual deployment for hotfixes/rollbacks

---

## Appendix B: Commands Reference

### GCP Commands

```bash
# List Cloud Run services
gcloud run services list --region=us-central1

# Describe QA service
gcloud run services describe gsdta-web-qa --region=us-central1

# View QA logs
gcloud run services logs read gsdta-web-qa --region=us-central1 --limit=50

# List domain mappings
gcloud run domain-mappings list --region=us-central1

# Delete domain mapping (if needed)
gcloud run domain-mappings delete app.qa.gsdta.com --region=us-central1

# List secrets
gcloud secrets list --project=YOUR_PROJECT_ID

# Switch between Firebase projects
firebase use gsdta-qa      # QA
firebase use YOUR_PROJECT_ID  # Production
```

### AWS CLI Commands (if configured)

```bash
# List Route 53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --query "ResourceRecordSets[?Name=='app.qa.gsdta.com.']"
```

---

## Appendix C: Rollback Plan

If issues arise with QA environment:

1. **Disable QA deployments**: Delete `deploy-qa.yml` workflow file
2. **Delete QA Cloud Run service**: `gcloud run services delete gsdta-web-qa --region=us-central1`
3. **Remove DNS record**: Delete `app.qa` CNAME in Route 53
4. **Delete QA secrets**: Remove `FIREBASE_*` secrets from `gsdta-qa` project
5. **Keep or delete QA Firebase project** as needed

**Note**: QA Firebase project can be kept for future use even if deployments are disabled.

---

## Appendix D: Environment Configuration Summary

| Configuration | QA | Production |
|--------------|-----|------------|
| **Domain** | `app.qa.gsdta.com` | `app.gsdta.com` |
| **Cloud Run Service** | `gsdta-web-qa` | `gsdta-web` |
| **GCP Project (Cloud Run)** | `YOUR_PROJECT_ID` | `YOUR_PROJECT_ID` |
| **Firebase/Secrets Project** | `gsdta-qa` | `YOUR_PROJECT_ID` |
| **Branch Trigger** | `develop` | `main` |
| **Workflow File** | `deploy-qa.yml` | `deploy-prod.yml` |
| **Docker Tag Format** | `qa-<sha>` | `prod-<sha>` |

---

## Decisions Made

| Question | Decision | Rationale |
|----------|----------|-----------|
| Data isolation strategy | **Separate Firebase projects** | Complete isolation, no risk of production data corruption |
| QA access control | **Public** | Easier for stakeholders to preview |
| Workflow structure | **Separate files + Reusable** | DRY, clear responsibility, safer |
| Branch mapping | `develop` → QA, `main` → Prod | Standard GitFlow pattern |

---

**Document Version**: 1.0  
**Status**: DRAFT - Ready for Implementation Planning  
**Last Updated**: December 24, 2024

---

## Approval

| Role | Name | Date | Approval |
|------|------|------|----------|
| Engineering Lead | | | ☐ |
| DevOps | | | ☐ |
| Project Owner | | | ☐ |
