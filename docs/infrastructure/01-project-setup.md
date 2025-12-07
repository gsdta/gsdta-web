# GCP Project & Initial Setup

**Part 1 of GSDTA Infrastructure Setup**  
**Time Required**: ~10 minutes  
**Prerequisites**: Google Cloud account with billing access

---

## 🎯 Overview

This guide covers:
- Creating a new GCP project
- Enabling billing
- Setting up environment variables
- Enabling required APIs
- Adding Firebase to the project
- Initial authentication

---

## 📋 Prerequisites

### Required Tools Installed

```bash
# Verify Google Cloud CLI
gcloud version
# Should show: Google Cloud SDK 4xx.x.x

# Verify Firebase CLI
firebase --version
# Should show: 12.x.x or higher

# Verify Node.js
node --version
# Should show: v20.x.x or higher
```

### Required Access

- ✅ Google Cloud account (personal or organization)
- ✅ Billing account access (to link to new project)
- ✅ Project creator role (to create new projects)

---

## 1. Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login
# Opens browser → Select your Google account → Allow access

# Set up application default credentials (for local development)
gcloud auth application-default login
# Opens browser → Select your Google account → Allow access

# Verify authentication
gcloud auth list
# Should show: ACTIVE account
```

---

## 2. Create New GCP Project

### Choose a Project ID

Project IDs must be:
- Globally unique across all of Google Cloud
- 6-30 characters
- Lowercase letters, numbers, hyphens only
- Start with a letter

**Recommended format**: `gsdta-nonprofit-prod` or `gsdta-org-production`

### Create Project

```bash
# Set your project ID (CHANGE THIS!)
export PROJECT_ID="gsdta-nonprofit-prod"

# Verify PROJECT_ID is set
echo "Creating project: $PROJECT_ID"

# Create the project
gcloud projects create $PROJECT_ID \
  --name="GSDTA Non-Profit" \
  --set-as-default

# Expected output:
# Create in progress for [https://cloudresourcemanager.googleapis.com/v1/projects/gsdta-nonprofit-prod].
# Waiting for [operations/cp...] to finish...done.

# Verify project created
gcloud projects describe $PROJECT_ID

# Set as active project
gcloud config set project $PROJECT_ID
```

### Set Project Variables

```bash
# Set these environment variables (save to ~/.bashrc or ~/.zshrc)
export PROJECT_ID="gsdta-nonprofit-prod"    # Your project ID
export REGION="us-central1"                  # Primary region
export RUNTIME_SA="gsdta-api-runner"         # Runtime service account
export CICD_SA="github-actions"              # CI/CD service account
export GAR_REPO="web-apps"                   # Artifact Registry repository
export SERVICE_NAME="gsdta-web"              # Cloud Run service name

# Verify variables
echo "PROJECT_ID: $PROJECT_ID"
echo "REGION: $REGION"
echo "RUNTIME_SA: $RUNTIME_SA"
echo "CICD_SA: $CICD_SA"
echo "GAR_REPO: $GAR_REPO"
echo "SERVICE_NAME: $SERVICE_NAME"

# Optional: Save to a file for reuse
cat > ~/.gsdta-env << ENVEOF
export PROJECT_ID="$PROJECT_ID"
export REGION="$REGION"
export RUNTIME_SA="$RUNTIME_SA"
export CICD_SA="$CICD_SA"
export GAR_REPO="$GAR_REPO"
export SERVICE_NAME="$SERVICE_NAME"
ENVEOF

# To reload variables later:
# source ~/.gsdta-env
```

---

## 3. Enable Billing

### Link Billing Account

```bash
# List billing accounts
gcloud billing accounts list

# Copy the ACCOUNT_ID from the output, then link it
export BILLING_ACCOUNT_ID="XXXXXX-XXXXXX-XXXXXX"

gcloud billing projects link $PROJECT_ID \
  --billing-account=$BILLING_ACCOUNT_ID

# Expected output:
# billingAccountName: billingAccounts/XXXXXX-XXXXXX-XXXXXX
# billingEnabled: true
```

### Verify Billing Enabled

```bash
# Check billing status
gcloud billing projects describe $PROJECT_ID

# Should show:
# billingEnabled: true
```

**Alternative**: Enable billing via Console:
1. Go to: https://console.cloud.google.com/billing
2. Select your project
3. Click "Link a billing account"
4. Select billing account

---

## 4. Enable Required APIs

### Core Firebase APIs

```bash
# Enable Firebase APIs
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firestore.googleapis.com

# Expected output (for each):
# Operation "operations/..." finished successfully.
```

### Deployment & Runtime APIs

```bash
# Enable Cloud Run and related APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# Enable IAM Credentials API
gcloud services enable iamcredentials.googleapis.com

# Enable Container Registry (legacy, but useful)
gcloud services enable containerregistry.googleapis.com
```

### Verify APIs Enabled

```bash
# List all enabled APIs
gcloud services list --enabled

# Check specific APIs
gcloud services list --enabled --filter="name:firebase.googleapis.com"
gcloud services list --enabled --filter="name:firestore.googleapis.com"
gcloud services list --enabled --filter="name:run.googleapis.com"

# Count enabled APIs
gcloud services list --enabled | wc -l
# Should show: 8+ APIs
```

---

## 5. Add Firebase to Project

### Authenticate with Firebase

```bash
# Login to Firebase
firebase login

# Expected output:
# ✔  Success! Logged in as your-email@example.com
```

### Add Firebase to GCP Project

```bash
# Add Firebase to the existing GCP project
firebase projects:addfirebase $PROJECT_ID

# Expected output:
# ✔ Adding Firebase resources to your-project-id
# ✔ Firebase has been added to the project!

# WAIT 1-2 minutes for the operation to propagate
```

### Verify Firebase Added

```bash
# List Firebase projects
firebase projects:list

# Should show your project with:
# Project Display Name  Project ID             Resource Location ID
# GSDTA Non-Profit      gsdta-nonprofit-prod  [Not specified]

# Set as default Firebase project
firebase use $PROJECT_ID

# Verify
firebase use
# Should show: Active Project: gsdta-nonprofit-prod (...)
```

### Verify in Console

```bash
# Open Firebase Console
open https://console.firebase.google.com

# You should see your project listed
# Click on it to verify Firebase is set up
```

---

## 6. Verification Checklist

Run these commands to verify everything is set up:

```bash
# 1. Project exists and is active
gcloud config get-value project
# Should output: gsdta-nonprofit-prod (or your PROJECT_ID)

# 2. Billing is enabled
gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)"
# Should output: True

# 3. Firebase APIs enabled
gcloud services list --enabled --filter="name:firebase.googleapis.com" --format="value(name)"
# Should output: firebase.googleapis.com

gcloud services list --enabled --filter="name:firestore.googleapis.com" --format="value(name)"
# Should output: firestore.googleapis.com

# 4. Runtime APIs enabled
gcloud services list --enabled --filter="name:run.googleapis.com" --format="value(name)"
# Should output: run.googleapis.com

# 5. Firebase added
firebase projects:list | grep $PROJECT_ID
# Should show your project

# 6. Environment variables set
echo "PROJECT_ID=$PROJECT_ID"
echo "REGION=$REGION"
# Should output your values
```

---

## 7. Setup Summary

After completing this guide:

```
✅ GCP Project Created
   - Project ID: gsdta-nonprofit-prod
   - Billing: Enabled
   - Active: Yes

✅ APIs Enabled (8 total)
   - firebase.googleapis.com
   - identitytoolkit.googleapis.com
   - firestore.googleapis.com
   - run.googleapis.com
   - artifactregistry.googleapis.com
   - secretmanager.googleapis.com
   - cloudbuild.googleapis.com
   - iamcredentials.googleapis.com

✅ Firebase Added
   - Project: gsdta-nonprofit-prod
   - Console: https://console.firebase.google.com

✅ Environment Variables Set
   - PROJECT_ID, REGION, etc.
   - Saved to: ~/.gsdta-env
```

---

## 🔧 Troubleshooting

### Issue: Project ID Already Exists

```bash
# Error: Project gsdta-nonprofit-prod already exists
# Solution: Choose a different project ID
export PROJECT_ID="gsdta-nonprofit-prod-2"
gcloud projects create $PROJECT_ID --name="GSDTA Non-Profit"
```

### Issue: Billing Account Not Found

```bash
# Error: Cannot find billing account
# Solution: Check billing accounts
gcloud billing accounts list

# If none exist, create one via Console:
open https://console.cloud.google.com/billing
```

### Issue: API Enable Fails

```bash
# Error: Permission denied
# Solution: Verify you have Project Owner or Editor role
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"

# If not owner, ask project admin to grant role:
# gcloud projects add-iam-policy-binding $PROJECT_ID \
#   --member="user:your-email@example.com" \
#   --role="roles/owner"
```

### Issue: Firebase Add Fails

```bash
# Error: Firebase already added
# Solution: This is OK! Just verify:
firebase projects:list | grep $PROJECT_ID

# If not listed, wait 2-3 minutes and try again
firebase projects:addfirebase $PROJECT_ID
```

---

## 📚 Next Steps

✅ GCP project and Firebase are now set up!

**Next**: [02-firestore-setup.md](./02-firestore-setup.md) - Set up Firestore database

---

## 🔗 Related Documentation

- [00-MASTER-SETUP.md](./00-MASTER-SETUP.md) - Master setup guide
- [Google Cloud Projects](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
- [Firebase Projects](https://firebase.google.com/docs/projects/learn-more)

---

**Completion Time**: ~10 minutes  
**Next Guide**: Firestore Database Setup
