# Cloud Run Deployment

**Part 7 of GSDTA Infrastructure Setup**  
**Time Required**: ~15 minutes  
**Prerequisites**: Parts 1-6 completed, image in Artifact Registry

---

## 🎯 Overview

This guide covers:
- Deploying application to Cloud Run
- Configuring environment variables from secrets
- Setting scaling parameters
- Configuring service account
- Getting service URL
- Testing deployment
- Updating authorized domains in Firebase

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify image exists
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO \
  --filter="package:gsdta-web"
```

---

## 1. Deploy to Cloud Run

### Initial Deployment

```bash
# Deploy service
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE_URL:latest \
  --platform=managed \
  --region=$REGION \
  --service-account=$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="FIREBASE_API_KEY=FIREBASE_API_KEY:latest,FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,FIREBASE_APP_ID=FIREBASE_APP_ID:latest" \
  --project=$PROJECT_ID

# This takes 2-3 minutes
# Expected output:
# Deploying container to Cloud Run service [gsdta-web] in project [PROJECT_ID] region [us-central1]
# ✓ Deploying new service... Done.
# Service URL: https://gsdta-web-xxx-uc.a.run.app
```

### Get Service URL

```bash
# Get service URL
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"

# Save to environment
echo "export SERVICE_URL=\"$SERVICE_URL\"" >> ~/.gsdta-env
```

---

## 2. Test Deployment

### Test Health Endpoint

```bash
# Test API health
curl $SERVICE_URL/api/v1/health

# Expected output:
# {"success":true,"message":"API is healthy"}

# Test UI (should return HTML)
curl -I $SERVICE_URL

# Expected:
# HTTP/2 200
# content-type: text/html
```

### Test in Browser

```bash
# Open in browser
open $SERVICE_URL

# You should see the homepage
```

---

## 3. Update Firebase Authorized Domains

**⚠️ Manual step in Firebase Console**

```bash
# Get the Cloud Run domain
echo $SERVICE_URL | sed 's|https://||'

# Output will be something like: gsdta-web-xxx-uc.a.run.app
```

Now add this domain to Firebase:

1. Open Firebase Console:
   ```bash
   open "https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"
   ```

2. Navigate to: **Authentication → Settings → Authorized domains**

3. Click **Add domain**

4. Enter: `gsdta-web-xxx-uc.a.run.app` (your Cloud Run domain)

5. Click **Add**

---

## 4. Update Service Configuration

### Update Environment Variables

```bash
# Update environment variables
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="KEY=VALUE" \
  --project=$PROJECT_ID
```

### Update Scaling

```bash
# Update scaling parameters
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=1 \
  --max-instances=20 \
  --project=$PROJECT_ID
```

### Update Memory/CPU

```bash
# Update resources
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=1Gi \
  --cpu=2 \
  --project=$PROJECT_ID
```

---

## 5. Verification Checklist

```bash
# 1. Service deployed
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.url)" && echo "✅ Service deployed" || echo "❌ Service not deployed"

# 2. Service is ready
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.conditions[0].status)" | grep -q True && \
  echo "✅ Service ready" || echo "❌ Service not ready"

# 3. Health endpoint works
curl -s $SERVICE_URL/api/v1/health | grep -q success && \
  echo "✅ API healthy" || echo "❌ API unhealthy"

# 4. Using correct service account
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(spec.template.spec.serviceAccountName)" | grep -q $RUNTIME_SA && \
  echo "✅ Service account correct" || echo "❌ Wrong service account"

# 5. Secrets configured
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="yaml(spec.template.spec.containers[0].env)" | grep -q FIREBASE_API_KEY && \
  echo "✅ Secrets configured" || echo "❌ Secrets missing"
```

---

## 6. View Logs

```bash
# Stream logs
gcloud run services logs tail $SERVICE_NAME --region=$REGION --project=$PROJECT_ID

# Recent logs
gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=50

# Filter errors
gcloud run services logs read $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --filter='severity>=ERROR' \
  --limit=20
```

---

## 7. Setup Summary

```
✅ Cloud Run Service Deployed
   - Name: gsdta-web
   - Region: us-central1
   - URL: https://gsdta-web-xxx-uc.a.run.app
   - Port: 8080
   - Service Account: gsdta-api-runner@...

✅ Configuration
   - Min Instances: 0 (scales to zero)
   - Max Instances: 10
   - Memory: 512Mi
   - CPU: 1
   - Timeout: 300s

✅ Environment Variables
   - NODE_ENV: production
   - Firebase config: From secrets

✅ Access
   - Allow unauthenticated: Yes
   - Health endpoint: /api/v1/health
```

---

## 🔧 Troubleshooting

See guide for common deployment issues and solutions.

---

## 📚 Next Steps

✅ Application deployed to Cloud Run!

**Next**: [08-custom-domain-dns.md](./08-custom-domain-dns.md) - Map custom domain

---

**Completion Time**: ~15 minutes  
**Next Guide**: Custom Domain & DNS Setup
