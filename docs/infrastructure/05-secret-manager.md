# Secret Manager Setup

**Part 5 of GSDTA Infrastructure Setup**  
**Time Required**: ~10 minutes  
**Prerequisites**: Parts 1-4 completed

---

## 🎯 Overview

This guide covers:
- Creating secrets for Firebase configuration
- Creating secrets for API keys (if needed)
- Granting service account access to secrets
- Verifying secret access
- Best practices for secret management

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify Firebase config values are set
echo "FIREBASE_API_KEY: ${FIREBASE_API_KEY:0:20}..."
echo "FIREBASE_AUTH_DOMAIN: $FIREBASE_AUTH_DOMAIN"
echo "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"
echo "FIREBASE_APP_ID: ${FIREBASE_APP_ID:0:20}..."

# If not set, run Part 3 again to get these values
```

---

## 1. Create Firebase Configuration Secrets

### Create FIREBASE_API_KEY Secret

```bash
# Create secret
echo -n "$FIREBASE_API_KEY" | gcloud secrets create FIREBASE_API_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID

# Expected output:
# Created version [1] of the secret [FIREBASE_API_KEY].

# Verify
gcloud secrets describe FIREBASE_API_KEY --project=$PROJECT_ID
```

### Create FIREBASE_AUTH_DOMAIN Secret

```bash
echo -n "$FIREBASE_AUTH_DOMAIN" | gcloud secrets create FIREBASE_AUTH_DOMAIN \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID
```

### Create FIREBASE_PROJECT_ID Secret

```bash
echo -n "$FIREBASE_PROJECT_ID" | gcloud secrets create FIREBASE_PROJECT_ID \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID
```

### Create FIREBASE_APP_ID Secret

```bash
echo -n "$FIREBASE_APP_ID" | gcloud secrets create FIREBASE_APP_ID \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID
```

### Create NODE_ENV Secret

```bash
echo -n "production" | gcloud secrets create NODE_ENV \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID
```

---

## 2. Grant Service Account Access

### Grant Access to Runtime SA

```bash
# Grant access to all Firebase secrets
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID NODE_ENV; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
  echo "✅ Granted access to $SECRET"
done

# Expected output for each:
# Updated IAM policy for secret [SECRET_NAME].
```

---

## 3. Verify Secrets

### List All Secrets

```bash
# List secrets
gcloud secrets list --project=$PROJECT_ID

# Expected output:
# NAME                    CREATED              REPLICATION_POLICY  LOCATIONS
# FIREBASE_API_KEY        2024-12-07T...       automatic           -
# FIREBASE_AUTH_DOMAIN    2024-12-07T...       automatic           -
# FIREBASE_PROJECT_ID     2024-12-07T...       automatic           -
# FIREBASE_APP_ID         2024-12-07T...       automatic           -
# NODE_ENV                2024-12-07T...       automatic           -
```

### Test Secret Access

```bash
# Access secret as yourself
gcloud secrets versions access latest --secret=FIREBASE_PROJECT_ID --project=$PROJECT_ID

# Should output: your-project-id

# Test access as runtime SA (requires key)
if [ -f ~/.gsdta-runtime-sa-key.json ]; then
  gcloud secrets versions access latest \
    --secret=FIREBASE_PROJECT_ID \
    --impersonate-service-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com \
    --project=$PROJECT_ID
  echo "✅ Runtime SA can access secrets"
fi
```

---

## 4. Verification Checklist

```bash
# 1. All secrets exist
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID NODE_ENV; do
  gcloud secrets describe $SECRET --project=$PROJECT_ID --format="value(name)" 2>/dev/null && \
    echo "✅ $SECRET exists" || echo "❌ $SECRET missing"
done

# 2. Runtime SA has access
for SECRET in FIREBASE_API_KEY FIREBASE_AUTH_DOMAIN FIREBASE_PROJECT_ID FIREBASE_APP_ID NODE_ENV; do
  gcloud secrets get-iam-policy $SECRET --project=$PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --format="value(bindings.role)" | grep -q "secretAccessor" && \
    echo "✅ $SECRET access granted" || echo "❌ $SECRET access missing"
done
```

---

## 5. Setup Summary

```
✅ Secrets Created (5 total)
   - FIREBASE_API_KEY
   - FIREBASE_AUTH_DOMAIN
   - FIREBASE_PROJECT_ID
   - FIREBASE_APP_ID
   - NODE_ENV

✅ IAM Access Granted
   - Runtime SA has secretAccessor role on all secrets

✅ Secrets Verified
   - All secrets accessible
   - Runtime SA can read secrets
```

---

## 🔧 Troubleshooting

### Issue: Secret Already Exists

```bash
# Error: Secret already exists
# Solution: Add new version instead
echo -n "new-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=$PROJECT_ID
```

### Issue: Permission Denied

```bash
# Error: Permission denied
# Solution: Grant yourself Secret Manager Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$(gcloud config get-value account)" \
  --role="roles/secretmanager.admin"
```

---

## 📚 Next Steps

✅ Secrets are now configured!

**Next**: [06-artifact-registry.md](./06-artifact-registry.md) - Set up Docker registry

---

**Completion Time**: ~10 minutes  
**Next Guide**: Artifact Registry Setup
