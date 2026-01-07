# GSDTA Deployment Guide

**Project**: GSDTA Web Application
**Purpose**: Unified deployment guide for QA and Production environments
**Last Updated**: January 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Summary](#environment-summary)
3. [Quick Reference](#quick-reference)
4. [QA Environment](#qa-environment)
5. [Production Environment](#production-environment)
6. [CI/CD Workflow](#cicd-workflow)
7. [Manual Deployment](#manual-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Related Documentation](#related-documentation)

---

## Overview

The GSDTA Web Application uses a two-environment deployment strategy:

- **QA/Staging**: For testing and validation before production
- **Production**: Live environment for real users

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                                                              │
│   develop branch                    main branch              │
│        │                                 │                   │
│        ▼                                 ▼                   │
│   QA Deployment                   Production Deployment      │
│        │                                 │                   │
└────────│─────────────────────────────────│───────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│    QA Environment       │  │  Production Environment │
│  app.qa.gsdta.com       │  │    app.gsdta.com        │
│  Firebase: gsdta-qa     │  │    Firebase: gsdta-prod │
│  Cloud Run: gsdta-web-qa│  │    Cloud Run: gsdta-web │
└─────────────────────────┘  └─────────────────────────┘
```

---

## Environment Summary

| Environment | Domain | Branch | Cloud Run Service | Firebase Project |
|-------------|--------|--------|-------------------|------------------|
| QA | `app.qa.gsdta.com` | `develop` | `gsdta-web-qa` | `gsdta-qa` |
| Production | `app.gsdta.com` | `main` | `gsdta-web` | `playground-personal-474821` |

### Tech Stack

- **UI**: Next.js 15 (React 19) on port 3000
- **API**: Node.js/TypeScript on port 8080
- **Auth**: Firebase Authentication
- **Database**: Firestore (Native mode)
- **Hosting**: Google Cloud Run (single container with both UI and API)
- **CI/CD**: GitHub Actions
- **DNS**: AWS Route 53

---

## Quick Reference

### View Deployment Status

```bash
# QA environment
gcloud run services describe gsdta-web-qa --region=us-central1 --project=gsdta-qa

# Production environment
gcloud run services describe gsdta-web --region=us-central1 --project=playground-personal-474821
```

### View Logs

```bash
# QA logs
gcloud run services logs read gsdta-web-qa --region=us-central1 --project=gsdta-qa --limit=50

# Production logs
gcloud run services logs read gsdta-web --region=us-central1 --project=playground-personal-474821 --limit=50
```

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list --service=gsdta-web --region=us-central1 --project=playground-personal-474821

# Route traffic to specific revision
gcloud run services update-traffic gsdta-web --region=us-central1 --project=playground-personal-474821 --to-revisions=REVISION_NAME=100
```

---

## QA Environment

### Purpose

The QA environment (`app.qa.gsdta.com`) provides:
- Safe testing ground for new features
- Stakeholder preview before production
- Integration testing with isolated data
- Automated UAT testing

### Deployment Trigger

QA deploys automatically when:
- Code is pushed to the `develop` branch
- All tests pass (unit, cucumber, e2e)

### GitHub Workflow

The QA deployment uses `.github/workflows/deploy-qa-with-uat.yml`:

1. Runs all tests (unit, cucumber, e2e)
2. Builds Docker image
3. Deploys to Cloud Run
4. Runs UAT tests against QA
5. Auto-merges to `main` if all tests pass

### Environment Variables (QA)

Set in GitHub Secrets:
- `GCP_PROJECT_ID_QA`: `gsdta-qa`
- `GCP_SA_KEY_QA`: Service account key for QA deployment
- `FIREBASE_PROJECT_ID_QA`: `gsdta-qa`

---

## Production Environment

### Purpose

The Production environment (`app.gsdta.com`) serves:
- Live users (students, parents, teachers, administrators)
- Real data and transactions
- Public-facing application

### Deployment Trigger

Production deploys automatically when:
- Code is pushed/merged to the `main` branch
- All tests pass

### GitHub Workflow

Production deployment uses `.github/workflows/deploy-prod.yml`:

1. Runs all tests
2. Builds Docker image with production tag
3. Deploys to Cloud Run production service

### Environment Variables (Production)

Set in GitHub Secrets:
- `GCP_PROJECT_ID`: `playground-personal-474821`
- `GCP_SA_KEY`: Service account key for production
- `FIREBASE_PROJECT_ID`: `playground-personal-474821`
- `FIREBASE_API_KEY`: Production Firebase API key

---

## CI/CD Workflow

### Branch Strategy

```
feature/* ─────────────────────────────────────────────────────┐
                                                               │
           ┌──────────────────────────────────────────────────┤
           │                                                   │
           ▼                                                   │
     ┌─────────────┐                                          │
     │   develop   │ ← Feature branches merge here            │
     │             │   Triggers: QA deployment + UAT tests    │
     └──────┬──────┘                                          │
            │                                                  │
            │ Auto-merge after UAT passes                     │
            ▼                                                  │
     ┌─────────────┐                                          │
     │    main     │ ← Stable code only                       │
     │             │   Triggers: Production deployment        │
     └─────────────┘                                          │
```

### Workflow Files

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| QA Deploy | `deploy-qa-with-uat.yml` | Push to `develop` | Deploy QA, run UAT |
| Prod Deploy | `deploy-prod.yml` | Push to `main` | Deploy Production |
| Tests | `ci.yml` | All PRs | Run test suite |

### Test Suites

Tests run in this order:
1. **Unit Tests** - Jest + Node test runner
2. **Cucumber Tests** - BDD integration tests
3. **E2E Tests** - Playwright browser tests
4. **UAT Tests** - User acceptance tests (QA only)
5. **Shakeout Tests** - Basic smoke tests (QA only)

---

## Manual Deployment

### Prerequisites

```bash
# Install tools
brew install --cask google-cloud-sdk docker
npm install -g firebase-tools

# Authenticate
gcloud auth login
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Manual Deploy to QA

```bash
# Set environment
export PROJECT_ID="gsdta-qa"
export REGION="us-central1"
export IMAGE="us-central1-docker.pkg.dev/$PROJECT_ID/web-apps/gsdta-web:manual-$(date +%Y%m%d-%H%M%S)"

# Build and push
docker build -t $IMAGE .
docker push $IMAGE

# Deploy
gcloud run deploy gsdta-web-qa \
  --image=$IMAGE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated
```

### Manual Deploy to Production

```bash
# Set environment
export PROJECT_ID="playground-personal-474821"
export REGION="us-central1"
export IMAGE="us-central1-docker.pkg.dev/$PROJECT_ID/web-apps/gsdta-web:manual-$(date +%Y%m%d-%H%M%S)"

# Build and push
docker build -t $IMAGE .
docker push $IMAGE

# Deploy
gcloud run deploy gsdta-web \
  --image=$IMAGE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated
```

---

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs for error details
2. Verify secrets are set correctly in repository settings
3. Check Cloud Run service logs

```bash
# View recent deployment logs
gcloud logging read "resource.type=cloud_run_revision" --project=$PROJECT_ID --limit=50
```

### Container Startup Issues

```bash
# View container logs
gcloud run services logs read SERVICE_NAME --region=us-central1 --project=$PROJECT_ID

# Check revision status
gcloud run revisions describe REVISION_NAME --region=us-central1 --project=$PROJECT_ID
```

### Authentication Issues

1. Verify Firebase project configuration matches environment
2. Check `NEXT_PUBLIC_FIREBASE_*` environment variables
3. Ensure service account has required IAM permissions

### Database Connection Issues

1. Verify Firestore is enabled in the correct project
2. Check service account has `Cloud Datastore User` role
3. Verify network connectivity from Cloud Run to Firestore

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [INFRASTRUCTURE-SETUP.md](./INFRASTRUCTURE-SETUP.md) | Complete infrastructure setup from scratch |
| [proposals/QA-ENVIRONMENT-PROPOSAL.md](./proposals/QA-ENVIRONMENT-PROPOSAL.md) | Detailed QA environment architecture |
| [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) | Production safety checklist |
| [FIRESTORE-SETUP.md](./FIRESTORE-SETUP.md) | Firestore database configuration |
| [TESTING.md](./TESTING.md) | Test suite documentation |
| [infrastructure/](./infrastructure/) | Detailed infrastructure setup guides |

---

## Security Notes

- Never commit secrets or API keys to the repository
- Use GitHub Secrets for all sensitive configuration
- Service accounts should have minimal required permissions
- Production database access should be restricted
- Regular security audits of IAM permissions recommended

---

## Support

For deployment issues:
1. Check this guide and related documentation
2. Review GitHub Actions logs
3. Check Cloud Run service logs
4. Contact the engineering team

For infrastructure changes:
1. Propose changes in a pull request
2. Update relevant documentation
3. Test in QA before production
