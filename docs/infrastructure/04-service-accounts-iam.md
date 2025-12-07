# Service Accounts & IAM Setup

**Part 4 of GSDTA Infrastructure Setup**  
**Time Required**: ~15 minutes  
**Prerequisites**: Parts 1-3 completed

---

## 🎯 Overview

This guide covers:
- Creating runtime service account (for Cloud Run)
- Creating CI/CD service account (for GitHub Actions)
- Granting Firestore permissions
- Granting Secret Manager permissions
- Granting Artifact Registry permissions
- Generating service account keys (optional, local dev only)
- Verifying IAM bindings

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify
echo "PROJECT_ID: $PROJECT_ID"
echo "RUNTIME_SA: $RUNTIME_SA"
echo "CICD_SA: $CICD_SA"
```

---

## 1. Create Runtime Service Account

This service account is used by Cloud Run to access Firestore and Secret Manager.

### Create Service Account

```bash
# Create runtime service account
gcloud iam service-accounts create $RUNTIME_SA \
  --display-name="GSDTA API Runtime Service Account" \
  --description="Service account for Cloud Run container runtime" \
  --project=$PROJECT_ID

# Expected output:
# Created service account [gsdta-api-runner].

# Verify created
gcloud iam service-accounts describe $RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com
```

### Grant Firestore Permissions

```bash
# Grant Firestore User role (read/write access)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Expected output:
# Updated IAM policy for project [gsdta-nonprofit-prod].
# bindings:
# - members:
#   - serviceAccount:gsdta-api-runner@...
#   role: roles/datastore.user
```

### Grant Secret Manager Permissions

```bash
# Grant Secret Accessor role (read secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Expected output:
# Updated IAM policy for project [gsdta-nonprofit-prod].
```

### Grant Artifact Registry Permissions

```bash
# Grant Artifact Registry Reader (pull images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Expected output:
# Updated IAM policy for project [gsdta-nonprofit-prod].
```

### Grant Cloud Run Invoker (Optional)

```bash
# If you need internal service-to-service calls
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

## 2. Create CI/CD Service Account

This service account is used by GitHub Actions to deploy to Cloud Run.

### Create Service Account

```bash
# Create CI/CD service account
gcloud iam service-accounts create $CICD_SA \
  --display-name="GitHub Actions CI/CD Service Account" \
  --description="Service account for GitHub Actions deployments" \
  --project=$PROJECT_ID

# Expected output:
# Created service account [github-actions].

# Verify created
gcloud iam service-accounts describe $CICD_SA@$PROJECT_ID.iam.gserviceaccount.com
```

### Grant Cloud Run Admin Permissions

```bash
# Grant Cloud Run Admin (deploy services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User (to deploy as runtime SA)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Grant Artifact Registry Permissions

```bash
# Grant Artifact Registry Writer (push images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Storage Admin (for artifact storage)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Grant Cloud Build Permissions

```bash
# Grant Cloud Build Editor (for Cloud Build)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"
```

---

## 3. Verify Service Accounts

### List All Service Accounts

```bash
# List all service accounts
gcloud iam service-accounts list --project=$PROJECT_ID

# Expected output:
# DISPLAY NAME                              EMAIL                                          DISABLED
# GSDTA API Runtime Service Account         gsdta-api-runner@...iam.gserviceaccount.com   False
# GitHub Actions CI/CD Service Account      github-actions@...iam.gserviceaccount.com     False
```

### Verify Runtime SA Permissions

```bash
# Get IAM policy for runtime SA
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# Expected output:
# ROLE
# roles/artifactregistry.reader
# roles/datastore.user
# roles/secretmanager.secretAccessor
```

### Verify CI/CD SA Permissions

```bash
# Get IAM policy for CI/CD SA
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# Expected output:
# ROLE
# roles/artifactregistry.writer
# roles/cloudbuild.builds.editor
# roles/iam.serviceAccountUser
# roles/run.admin
# roles/storage.admin
```

---

## 4. Generate Service Account Keys (Optional)

**⚠️ WARNING**: Service account keys are sensitive credentials. Only create them for local development, never commit to git.

### Generate Runtime SA Key (Local Development Only)

```bash
# Create key file
gcloud iam service-accounts keys create ~/.gsdta-runtime-sa-key.json \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# Expected output:
# created key [...] of type [json] as [~/.gsdta-runtime-sa-key.json] for [gsdta-api-runner@...]

# Set permissions (readable only by you)
chmod 600 ~/.gsdta-runtime-sa-key.json

# Add to environment file
echo "export GOOGLE_APPLICATION_CREDENTIALS=\"$HOME/.gsdta-runtime-sa-key.json\"" >> ~/.gsdta-env

# Verify
ls -la ~/.gsdta-runtime-sa-key.json
```

### Generate CI/CD SA Key (GitHub Actions)

```bash
# Create key file
gcloud iam service-accounts keys create ~/.gsdta-cicd-sa-key.json \
  --iam-account=$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com

# Expected output:
# created key [...] of type [json] as [~/.gsdta-cicd-sa-key.json]

# Set permissions
chmod 600 ~/.gsdta-cicd-sa-key.json

# This will be used in Part 9 (GitHub CI/CD setup)
# DO NOT commit this file to git!
```

### List Service Account Keys

```bash
# List keys for runtime SA
gcloud iam service-accounts keys list \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# List keys for CI/CD SA
gcloud iam service-accounts keys list \
  --iam-account=$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com
```

---

## 5. Test Service Account Access (Optional)

### Test Firestore Access

```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.gsdta-runtime-sa-key.json"

# Test Firestore access (list collections)
cd /path/to/gsdta-web
export PROJECT_ID=$PROJECT_ID
node scripts/list-collections.js

# Expected output:
# 📚 Found X collection(s):
# (may be empty if no collections created yet)
```

### Test Secret Manager Access

```bash
# Test secret access (will create a test secret)
echo -n "test-value" | gcloud secrets create test-secret \
  --data-file=- \
  --project=$PROJECT_ID

# Try to access as runtime SA
gcloud secrets versions access latest \
  --secret=test-secret \
  --impersonate-service-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# Expected output: test-value

# Clean up test secret
gcloud secrets delete test-secret --project=$PROJECT_ID --quiet
```

---

## 6. IAM Best Practices

### Principle of Least Privilege

```
✅ Runtime SA has:
   - Firestore read/write (datastore.user)
   - Secret read-only (secretmanager.secretAccessor)
   - Artifact Registry read-only (artifactregistry.reader)

✅ CI/CD SA has:
   - Cloud Run admin (run.admin)
   - Artifact Registry write (artifactregistry.writer)
   - Service account user (iam.serviceAccountUser)

❌ Neither has:
   - Project owner
   - Project editor
   - Broad admin roles
```

### Security Recommendations

1. **Key Rotation**: Rotate service account keys every 90 days
2. **Key Storage**: Never commit keys to git
3. **Local Development**: Use keys only on local machine
4. **Production**: Use Workload Identity instead of keys (GitHub Actions - Part 9)
5. **Audit**: Regularly review IAM policies

---

## 7. Verification Checklist

```bash
# 1. Runtime SA exists
gcloud iam service-accounts describe $RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --format="value(email)" && echo "✅ Runtime SA exists" || echo "❌ Runtime SA missing"

# 2. CI/CD SA exists
gcloud iam service-accounts describe $CICD_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --format="value(email)" && echo "✅ CI/CD SA exists" || echo "❌ CI/CD SA missing"

# 3. Runtime SA has Firestore access
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com AND bindings.role:roles/datastore.user" \
  --format="value(bindings.role)" | grep -q "datastore.user" && echo "✅ Firestore access" || echo "❌ No Firestore access"

# 4. Runtime SA has Secret Manager access
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com AND bindings.role:roles/secretmanager.secretAccessor" \
  --format="value(bindings.role)" | grep -q "secretAccessor" && echo "✅ Secret Manager access" || echo "❌ No Secret Manager access"

# 5. CI/CD SA has Cloud Run admin
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com AND bindings.role:roles/run.admin" \
  --format="value(bindings.role)" | grep -q "run.admin" && echo "✅ Cloud Run admin" || echo "❌ No Cloud Run admin"

# 6. Keys generated (if optional step completed)
test -f ~/.gsdta-runtime-sa-key.json && echo "✅ Runtime key exists" || echo "⏭️  Runtime key not created (optional)"
test -f ~/.gsdta-cicd-sa-key.json && echo "✅ CI/CD key exists" || echo "⏭️  CI/CD key not created (optional)"
```

---

## 8. Setup Summary

After completing this guide:

```
✅ Runtime Service Account Created
   - Email: gsdta-api-runner@PROJECT_ID.iam.gserviceaccount.com
   - Permissions:
     • Firestore User (datastore.user)
     • Secret Manager Accessor (secretmanager.secretAccessor)
     • Artifact Registry Reader (artifactregistry.reader)
   - Key: ~/.gsdta-runtime-sa-key.json (optional)

✅ CI/CD Service Account Created
   - Email: github-actions@PROJECT_ID.iam.gserviceaccount.com
   - Permissions:
     • Cloud Run Admin (run.admin)
     • Artifact Registry Writer (artifactregistry.writer)
     • Service Account User (iam.serviceAccountUser)
     • Cloud Build Editor (cloudbuild.builds.editor)
     • Storage Admin (storage.admin)
   - Key: ~/.gsdta-cicd-sa-key.json (optional)

✅ IAM Bindings Verified
   - Runtime SA: 3 roles
   - CI/CD SA: 5 roles

✅ Security Best Practices Applied
   - Principle of least privilege
   - Keys secured with 600 permissions
   - Keys excluded from git
```

---

## 🔧 Troubleshooting

### Issue: Service Account Already Exists

```bash
# Error: Service account already exists
# Solution: Verify it's configured correctly
gcloud iam service-accounts describe $RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# If you need to delete and recreate:
gcloud iam service-accounts delete $RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com --quiet
# Wait 30 seconds, then recreate
```

### Issue: Permission Denied

```bash
# Error: Permission denied when adding IAM binding
# Solution: Verify you have Owner or Security Admin role
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"

# If not owner, ask project admin to grant role
```

### Issue: Key Creation Fails

```bash
# Error: Failed to create key
# Solution: Check service account exists
gcloud iam service-accounts list | grep $RUNTIME_SA

# Verify you have permission
gcloud iam service-accounts get-iam-policy $RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com
```

### Issue: Too Many Keys

```bash
# Error: Maximum number of keys reached (10)
# Solution: Delete old keys
gcloud iam service-accounts keys list \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com

# Delete a key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com
```

---

## 📚 Next Steps

✅ Service accounts are now set up with proper IAM roles!

**Next**: [05-secret-manager.md](./05-secret-manager.md) - Set up Secret Manager for Firebase config

---

## 🔗 Related Documentation

- [Service Accounts Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [IAM Roles Reference](https://cloud.google.com/iam/docs/understanding-roles)
- [00-MASTER-SETUP.md](./00-MASTER-SETUP.md) - Master setup guide

---

**Completion Time**: ~15 minutes  
**Next Guide**: Secret Manager Setup
