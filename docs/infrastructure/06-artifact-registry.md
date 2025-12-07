# Artifact Registry Setup

**Part 6 of GSDTA Infrastructure Setup**  
**Time Required**: ~10 minutes  
**Prerequisites**: Parts 1-5 completed, Docker installed

---

## 🎯 Overview

This guide covers:
- Creating Docker repository in Artifact Registry
- Configuring Docker authentication
- Building application Docker image
- Tagging and pushing image to registry
- Verifying images in registry
- Managing images (list, delete)

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify Docker is installed
docker --version
# Should show: Docker version 20.x.x or higher

# Verify project and region
echo "PROJECT_ID: $PROJECT_ID"
echo "REGION: $REGION"
echo "GAR_REPO: $GAR_REPO"
```

---

## 1. Create Artifact Registry Repository

### Create Docker Repository

```bash
# Create repository
gcloud artifacts repositories create $GAR_REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="GSDTA web application Docker images" \
  --project=$PROJECT_ID

# Expected output:
# Create request issued for: [web-apps]
# Waiting for operation [projects/.../operations/...] to complete...done.
# Created repository [web-apps].
```

### Verify Repository Created

```bash
# List repositories
gcloud artifacts repositories list --location=$REGION --project=$PROJECT_ID

# Expected output:
# REPOSITORY  FORMAT  DESCRIPTION                              LOCATION      LABELS  ENCRYPTION
# web-apps    DOCKER  GSDTA web application Docker images     us-central1           Google-managed key

# Get repository details
gcloud artifacts repositories describe $GAR_REPO \
  --location=$REGION \
  --project=$PROJECT_ID
```

---

## 2. Configure Docker Authentication

### Authenticate Docker with Artifact Registry

```bash
# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker $REGION-docker.pkg.dev

# Expected output:
# Adding credentials for: us-central1-docker.pkg.dev
# Docker configuration file updated.

# Verify configuration
cat ~/.docker/config.json | grep $REGION-docker.pkg.dev
# Should show the registry in credHelpers
```

### Test Authentication

```bash
# Test by listing repositories (should not get auth error)
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO 2>&1 | head -5

# Expected: Either empty list or existing images (no auth errors)
```

---

## 3. Build Docker Image

### Navigate to Project Root

```bash
# Go to project root
cd /path/to/gsdta-web

# Verify Dockerfile exists
ls -la Dockerfile

# Review Dockerfile
head -20 Dockerfile
```

### Build Image

```bash
# Build image
docker build -t gsdta-web:latest .

# Expected output (last line):
# Successfully built abc123def456
# Successfully tagged gsdta-web:latest

# This may take 5-10 minutes on first build
```

### Verify Image Built

```bash
# List local images
docker images | grep gsdta-web

# Expected output:
# REPOSITORY   TAG      IMAGE ID       CREATED          SIZE
# gsdta-web    latest   abc123def456   10 seconds ago   500MB
```

---

## 4. Tag and Push Image

### Tag Image for Artifact Registry

```bash
# Create image URL variable
export IMAGE_URL="$REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO/gsdta-web"

echo "Image URL: $IMAGE_URL"

# Tag image with registry URL and 'latest' tag
docker tag gsdta-web:latest $IMAGE_URL:latest

# Also tag with timestamp for version tracking
export IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
docker tag gsdta-web:latest $IMAGE_URL:$IMAGE_TAG

echo "Tagged as: $IMAGE_URL:latest"
echo "Tagged as: $IMAGE_URL:$IMAGE_TAG"
```

### Push Image to Registry

```bash
# Push latest tag
docker push $IMAGE_URL:latest

# Expected output:
# The push refers to repository [us-central1-docker.pkg.dev/...]
# latest: digest: sha256:... size: 1234

# Push versioned tag
docker push $IMAGE_URL:$IMAGE_TAG

# Save image URL to environment
echo "export IMAGE_URL=\"$IMAGE_URL\"" >> ~/.gsdta-env
```

---

## 5. Verify Images in Registry

### List Images

```bash
# List all images in repository
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO

# Expected output:
# IMAGE                                                                DIGEST        CREATE_TIME          UPDATE_TIME
# us-central1-docker.pkg.dev/.../web-apps/gsdta-web                   sha256:...    2024-12-07T...      2024-12-07T...

# List with tags
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO \
  --include-tags \
  --format="table(package,tags,version)"
```

### Get Image Details

```bash
# Get specific image details
gcloud artifacts docker images describe $IMAGE_URL:latest

# Expected output shows:
# - Image digest
# - Size
# - Upload time
# - Tags
```

### View in Console

```bash
# Open Artifact Registry in browser
open "https://console.cloud.google.com/artifacts/docker/$PROJECT_ID/$REGION/$GAR_REPO?project=$PROJECT_ID"
```

---

## 6. Image Management

### Tag Management

```bash
# List all tags for image
gcloud artifacts docker tags list $IMAGE_URL

# Add additional tag
gcloud artifacts docker tags add $IMAGE_URL:latest $IMAGE_URL:stable

# Delete tag (doesn't delete image)
gcloud artifacts docker tags delete $IMAGE_URL:stable --quiet
```

### Delete Images

```bash
# Delete specific tagged image
gcloud artifacts docker images delete $IMAGE_URL:TAG --delete-tags --quiet

# Delete image by digest
gcloud artifacts docker images delete $IMAGE_URL@sha256:DIGEST --quiet

# List untagged images (for cleanup)
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO \
  --include-tags \
  --filter='-tags:*' \
  --format='get(package)'
```

---

## 7. Repository Management

### Update Repository

```bash
# Update description
gcloud artifacts repositories update $GAR_REPO \
  --location=$REGION \
  --description="Updated description" \
  --project=$PROJECT_ID
```

### Repository IAM

```bash
# Grant CI/CD SA write access (already done in Part 4)
gcloud artifacts repositories add-iam-policy-binding $GAR_REPO \
  --location=$REGION \
  --member="serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=$PROJECT_ID

# Grant runtime SA read access (already done in Part 4)
gcloud artifacts repositories add-iam-policy-binding $GAR_REPO \
  --location=$REGION \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=$PROJECT_ID
```

---

## 8. Verification Checklist

```bash
# 1. Repository exists
gcloud artifacts repositories describe $GAR_REPO \
  --location=$REGION \
  --project=$PROJECT_ID \
  --format="value(name)" && echo "✅ Repository exists" || echo "❌ Repository missing"

# 2. Docker authentication configured
grep -q "$REGION-docker.pkg.dev" ~/.docker/config.json && \
  echo "✅ Docker auth configured" || echo "❌ Docker auth not configured"

# 3. Image exists in registry
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/$GAR_REPO \
  --filter="package:gsdta-web" --format="value(package)" | grep -q gsdta-web && \
  echo "✅ Image pushed to registry" || echo "❌ Image not in registry"

# 4. Latest tag exists
gcloud artifacts docker tags list $IMAGE_URL --filter="tag:latest" \
  --format="value(tag)" | grep -q latest && \
  echo "✅ Latest tag exists" || echo "❌ Latest tag missing"

# 5. CI/CD SA has write access
gcloud artifacts repositories get-iam-policy $GAR_REPO \
  --location=$REGION \
  --project=$PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$CICD_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --format="value(bindings.role)" | grep -q writer && \
  echo "✅ CI/CD has write access" || echo "❌ CI/CD missing write access"
```

---

## 9. Setup Summary

After completing this guide:

```
✅ Artifact Registry Repository Created
   - Name: web-apps
   - Format: Docker
   - Location: us-central1
   - URL: us-central1-docker.pkg.dev/PROJECT_ID/web-apps

✅ Docker Authentication Configured
   - gcloud credential helper added
   - Can push/pull images

✅ Application Image Built & Pushed
   - Image: gsdta-web
   - Tags: latest, YYYYMMDD-HHMMSS
   - Size: ~500MB
   - Layers: Optimized for Cloud Run

✅ IAM Permissions Set
   - CI/CD SA: Writer (can push images)
   - Runtime SA: Reader (can pull images)

✅ Image URL Saved
   - Saved to: ~/.gsdta-env
   - Variable: IMAGE_URL
```

---

## 🔧 Troubleshooting

### Issue: Repository Already Exists

```bash
# Error: Repository already exists
# Solution: This is OK! Just verify it's configured correctly
gcloud artifacts repositories describe $GAR_REPO \
  --location=$REGION \
  --project=$PROJECT_ID
```

### Issue: Docker Build Fails

```bash
# Error: Docker build failed
# Solution 1: Check Docker is running
docker ps

# Solution 2: Check Dockerfile exists
ls -la Dockerfile

# Solution 3: Clean Docker cache and retry
docker system prune -a --volumes
docker build -t gsdta-web:latest .
```

### Issue: Authentication Fails

```bash
# Error: unauthorized: failed to authenticate
# Solution: Re-authenticate
gcloud auth login
gcloud auth configure-docker $REGION-docker.pkg.dev

# Verify auth
gcloud auth list
```

### Issue: Push Fails (Insufficient Permissions)

```bash
# Error: denied: Insufficient permissions
# Solution: Verify you have Artifact Registry Writer role
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"

# Grant yourself writer role if missing
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$(gcloud config get-value account)" \
  --role="roles/artifactregistry.writer"
```

### Issue: Image Too Large

```bash
# Warning: Image is very large (>1GB)
# Solution: Optimize Dockerfile
# - Use multi-stage builds
# - Remove unnecessary files
# - Use .dockerignore

# Check image size
docker images gsdta-web:latest

# Optimize by cleaning up in Dockerfile:
# RUN npm ci --production && npm cache clean --force
```

---

## 📚 Next Steps

✅ Artifact Registry is now set up with your application image!

**Next**: [07-cloud-run-deployment.md](./07-cloud-run-deployment.md) - Deploy to Cloud Run

---

## 🔗 Related Documentation

- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [00-MASTER-SETUP.md](./00-MASTER-SETUP.md) - Master setup guide

---

**Completion Time**: ~10 minutes (plus build time)  
**Next Guide**: Cloud Run Deployment
