# Custom Domain & DNS Setup

**Part 8 of GSDTA Infrastructure Setup**  
**Time Required**: ~30 minutes (includes DNS propagation)  
**Prerequisites**: Parts 1-7 completed, Domain ownership, Route 53 access

---

## 🎯 Overview

This guide covers:
- Mapping custom domain to Cloud Run
- Getting DNS records from GCP
- Configuring DNS in AWS Route 53
- Verifying domain mapping
- Enabling HTTPS (automatic)
- Updating Firebase authorized domains

---

## 📋 Prerequisites

```bash
# Load environment variables
source ~/.gsdta-env

# Verify domain ownership
echo "Domain: app.gsdta.com"
echo "Nameservers: AWS Route 53"
```

---

## 1. Map Domain to Cloud Run

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=app.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID

# Expected output:
# Creating domain mapping for service [gsdta-web]...
# Waiting for certificate provisioning. You must configure your DNS records for certificate issuance to complete.
```

---

## 2. Get DNS Records

```bash
# Get DNS configuration
gcloud run domain-mappings describe app.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID

# Output will show DNS records to configure
# Copy the CNAME record value (ghs.googlehosted.com)
```

---

## 3. Configure DNS in Route 53

**Manual steps in AWS Console**:

1. Login to AWS Console
2. Navigate to Route 53 → Hosted Zones
3. Select: gsdta.com
4. Create record:
   - Record name: `app`
   - Record type: `CNAME`
   - Value: `ghs.googlehosted.com`
   - TTL: 300
5. Save

---

## 4. Verify Domain Mapping

```bash
# Check mapping status
gcloud run domain-mappings describe app.gsdta.com \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.conditions[0].status)"

# Wait for DNS propagation (5-30 minutes)
# Test domain
curl -I https://app.gsdta.com/api/v1/health
```

---

## 5. Update Firebase Authorized Domains

Add `app.gsdta.com` to Firebase authorized domains (same process as Part 7).

---

## 📚 Next Steps

✅ Custom domain configured!

**Next**: [09-github-cicd.md](./09-github-cicd.md) - Set up CI/CD

---

**Completion Time**: ~30 minutes  
**Next Guide**: GitHub CI/CD Setup
