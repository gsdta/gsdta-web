# CloudFront CDN Setup

**Purpose**: Add AWS CloudFront in front of Google Cloud Run to cache static assets and improve page load times.

---

## Overview

CloudFront caches static assets (`/_next/static/*`, `/images/*`, etc.) at edge locations, reducing latency and load on Cloud Run.

### Architecture

```
User → Route 53 (app.gsdta.com) → CloudFront → Cloud Run
                                      ↓
                              Cache static assets
```

---

## Prerequisites

- AWS CLI configured with appropriate credentials
- Existing ACM certificate for `app.gsdta.com` in `us-east-1`
- Cloud Run service deployed and accessible

---

## Step 1: Get Required Values

```bash
# Get Cloud Run service URL
CLOUD_RUN_URL=$(gcloud run services describe gsdta-web \
  --region us-central1 \
  --format="value(status.url)" | sed 's|https://||')

echo "Cloud Run URL: $CLOUD_RUN_URL"

# Get existing ACM certificate ARN
CERT_ARN=$(aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='app.gsdta.com'].CertificateArn" \
  --output text)

echo "Certificate ARN: $CERT_ARN"
```

---

## Step 2: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "'$(date +%s)'",
    "Comment": "GSDTA Web App CDN",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "cloud-run-origin",
        "DomainName": "'$CLOUD_RUN_URL'",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSSLProtocols": {"Quantity": 1, "Items": ["TLSv1.2"]}
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "cloud-run-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Quantity": 7,
        "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
        "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}
      },
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
      "Compress": true
    },
    "CacheBehaviors": {
      "Quantity": 2,
      "Items": [
        {
          "PathPattern": "/_next/static/*",
          "TargetOriginId": "cloud-run-origin",
          "ViewerProtocolPolicy": "redirect-to-https",
          "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}},
          "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
          "Compress": true
        },
        {
          "PathPattern": "/images/*",
          "TargetOriginId": "cloud-run-origin",
          "ViewerProtocolPolicy": "redirect-to-https",
          "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}},
          "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
          "Compress": true
        }
      ]
    },
    "Aliases": {"Quantity": 1, "Items": ["app.gsdta.com"]},
    "ViewerCertificate": {
      "ACMCertificateArn": "'$CERT_ARN'",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "PriceClass": "PriceClass_100"
  }'
```

### Cache Policies Used

| Policy ID | Name | Purpose |
|-----------|------|---------|
| `658327ea-f89d-4fab-a63d-7e88639e58f6` | CachingOptimized | For static assets |
| `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` | CachingDisabled | For dynamic content |

### Origin Request Policy

| Policy ID | Name | Purpose |
|-----------|------|---------|
| `216adef6-5c7f-47e4-b989-5492eafa07d3` | AllViewer | Forward all headers to origin |

---

## Step 3: Wait for Deployment

CloudFront distributions take 5-15 minutes to deploy.

```bash
# Get distribution ID
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, 'app.gsdta.com')]].Id" \
  --output text)

echo "Distribution ID: $DISTRIBUTION_ID"

# Check deployment status
aws cloudfront get-distribution --id $DISTRIBUTION_ID \
  --query "Distribution.Status"
# Wait until it returns "Deployed"
```

---

## Step 4: Update Route 53 DNS

Once CloudFront shows "Deployed" status:

```bash
# Get CloudFront domain name
CF_DOMAIN=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, 'app.gsdta.com')]].DomainName" \
  --output text)

echo "CloudFront Domain: $CF_DOMAIN"

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name gsdta.com \
  --query "HostedZones[0].Id" \
  --output text | cut -d'/' -f3)

# Delete existing CNAME record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "app.gsdta.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "ghs.googlehosted.com"}]
      }
    }]
  }'

# Create A record alias to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.gsdta.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'$CF_DOMAIN'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## Step 5: Add GitHub Secrets for Cache Invalidation

Add these secrets to GitHub repository settings:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key | IAM user with CloudFront permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Corresponding secret key |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID | From Step 3 |
| `CLOUDFRONT_DISTRIBUTION_ID_QA` | QA Distribution ID | Optional, for QA environment |

### Required IAM Permissions

The IAM user needs the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

---

## Cache Invalidation

### Automatic Invalidation on Deploy

Cache is automatically invalidated after each deployment (configured in `_deploy.yml`).

### Manual Invalidation

```bash
# Invalidate all paths
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/images/*" "/_next/static/*"
```

---

## Cache Headers Configuration

Cache headers are configured in `ui/next.config.ts`:

| Path | Cache Duration | Policy |
|------|---------------|--------|
| `/_next/static/*` | 1 year | Immutable (hashed filenames) |
| `/images/*` | 5 minutes | stale-while-revalidate |
| `/docs/*` | 5 minutes | Standard cache |
| `/templates/*` | 5 minutes | Standard cache |
| Root static files | 5 minutes | Standard cache |

---

## Verification

### Test Cache Headers

```bash
# Check static asset headers
curl -I https://app.gsdta.com/_next/static/chunks/main.js | grep -i cache

# Expected: Cache-Control: public, max-age=31536000, immutable
```

### Test CloudFront Cache Hit

```bash
# First request (miss)
curl -I https://app.gsdta.com/_next/static/chunks/main.js | grep -i x-cache

# Second request (hit)
curl -I https://app.gsdta.com/_next/static/chunks/main.js | grep -i x-cache

# Expected: X-Cache: Hit from cloudfront
```

---

## Rollback

If issues occur, revert DNS to point directly to Cloud Run:

```bash
# Delete CloudFront alias
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "app.gsdta.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'$CF_DOMAIN'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# Restore CNAME to Cloud Run
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.gsdta.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "ghs.googlehosted.com"}]
      }
    }]
  }'
```

---

## Troubleshooting

### 502 Bad Gateway

- Check Cloud Run service is running
- Verify origin domain is correct
- Check origin protocol policy is `https-only`

### SSL Certificate Errors

- Ensure ACM certificate is in `us-east-1`
- Verify certificate covers `app.gsdta.com`
- Check certificate is validated

### Cache Not Working

- Verify cache behaviors are configured correctly
- Check Cache-Control headers from origin
- Use browser DevTools to inspect response headers

---

**Document Version**: 1.0
**Last Updated**: January 2026
