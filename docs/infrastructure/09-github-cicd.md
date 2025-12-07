# GitHub CI/CD Setup

**Part 9 of GSDTA Infrastructure Setup**  
**Time Required**: ~20 minutes  
**Prerequisites**: Parts 1-8 completed, GitHub repository access

---

## 🎯 Overview

This guide covers:
- Creating GitHub repository secrets
- Configuring service account authentication
- Setting up deployment workflow
- Testing CI/CD pipeline
- Verifying auto-deployment

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify CI/CD service account exists
gcloud iam service-accounts describe $CICD_SA@$PROJECT_ID.iam.gserviceaccount.com
```

---

## 1. Create GitHub Secrets

### Get Service Account Key

```bash
# Verify key exists (from Part 4)
test -f ~/.gsdta-cicd-sa-key.json && echo "✅ Key exists" || echo "❌ Key missing"

# If missing, create it:
# gcloud iam service-accounts keys create ~/.gsdta-cicd-sa-key.json \
#   --iam-account=$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com

# Get key content (base64 encoded)
cat ~/.gsdta-cicd-sa-key.json | base64
# Copy this output
```

### Add Secrets to GitHub

1. Go to: https://github.com/your-org/gsdta-web/settings/secrets/actions

2. Add these secrets:
   - `GCP_PROJECT_ID`: Your PROJECT_ID
   - `GCP_SA_KEY`: Base64 encoded service account key
   - `GCP_REGION`: us-central1
   - `GCP_SERVICE_NAME`: gsdta-web
   - `GAR_REPO`: web-apps

---

## 2. Create Deployment Workflow

The workflow file already exists at `.github/workflows/deploy.yml`.

Verify it's configured correctly:

```bash
# Check workflow file
cat .github/workflows/deploy.yml | grep -A5 "env:"

# Should include:
# PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
# REGION: ${{ secrets.GCP_REGION }}
# etc.
```

---

## 3. Test CI/CD Pipeline

### Trigger Workflow

```bash
# Make a small change and push
git checkout -b test-cicd
echo "# Test CI/CD" >> README.md
git add README.md
git commit -m "test: trigger CI/CD"
git push origin test-cicd

# Create PR and merge to main
# Workflow will run automatically on merge
```

### Monitor Workflow

```bash
# View workflow runs
open "https://github.com/your-org/gsdta-web/actions"

# Or use GitHub CLI
gh run list --limit 5
gh run watch
```

---

## 4. Verification Checklist

```bash
# 1. GitHub secrets configured
echo "Verify in GitHub: https://github.com/your-org/gsdta-web/settings/secrets/actions"

# 2. Workflow file exists
test -f .github/workflows/deploy.yml && echo "✅ Workflow exists" || echo "❌ Workflow missing"

# 3. Latest commit deployed
# Check Cloud Run revision name matches latest git commit
```

---

## 📚 Next Steps

✅ CI/CD pipeline configured!

**Next**: [10-monitoring-alerting.md](./10-monitoring-alerting.md) - Set up monitoring

---

**Completion Time**: ~20 minutes  
**Next Guide**: Monitoring & Alerting Setup
