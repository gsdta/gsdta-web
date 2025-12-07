#!/bin/bash
#
# Automate Firestore Setup (Part 2)
# Usage: ./02-setup-firestore.sh
#

set -e

source ~/.gsdta-env || {
  echo "❌ Environment file not found. Run Part 1 first."
  exit 1
}

echo "🗄️  Setting up Firestore Database"
echo "=================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Create Firestore database
echo "1. Creating Firestore database..."
gcloud firestore databases create \
  --location=$REGION \
  --type=firestore-native \
  --project=$PROJECT_ID 2>&1 | grep -v "already exists" || true
echo "✅ Database created"
echo ""

# Deploy rules
echo "2. Deploying security rules..."
cd /path/to/gsdta-web
firebase deploy --only firestore:rules --project=$PROJECT_ID
echo "✅ Rules deployed"
echo ""

# Deploy indexes
echo "3. Deploying indexes..."
firebase deploy --only firestore:indexes --project=$PROJECT_ID
echo "✅ Indexes deployed"
echo ""

echo "✅ Firestore setup complete!"
echo ""
echo "Verify:"
echo "  gcloud firestore databases list --project=$PROJECT_ID"
echo "  gcloud firestore indexes composite list --project=$PROJECT_ID"
