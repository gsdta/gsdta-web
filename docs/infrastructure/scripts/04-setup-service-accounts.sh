#!/bin/bash
#
# Automate Service Accounts Setup (Part 4)
# Usage: ./04-setup-service-accounts.sh
#

set -e

source ~/.gsdta-env || {
  echo "❌ Environment file not found"
  exit 1
}

echo "👤 Setting up Service Accounts"
echo "=============================="
echo ""

# Create runtime SA
echo "1. Creating runtime service account..."
gcloud iam service-accounts create $RUNTIME_SA \
  --display-name="GSDTA API Runtime Service Account" \
  --project=$PROJECT_ID 2>&1 | grep -v "already exists" || true
echo "✅ Runtime SA created"

# Grant permissions
echo "2. Granting Firestore permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user" --quiet
  
echo "3. Granting Secret Manager permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" --quiet

echo "4. Granting Artifact Registry permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" --quiet

# Create CI/CD SA
echo "5. Creating CI/CD service account..."
gcloud iam service-accounts create $CICD_SA \
  --display-name="GitHub Actions CI/CD Service Account" \
  --project=$PROJECT_ID 2>&1 | grep -v "already exists" || true

echo "6. Granting CI/CD permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" --quiet

echo ""
echo "✅ Service accounts setup complete!"
echo ""
echo "Verify:"
echo "  gcloud iam service-accounts list --project=$PROJECT_ID"
