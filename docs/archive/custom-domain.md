# Cloud Run Custom Domain Setup Guide (Windows + AWS Route 53)

Last updated: 2025-10-16

This guide explains how to map a custom domain (for example, app.gsdta.com) to a Google Cloud Run service using AWS Route 53 as your DNS provider.

You can use either Windows cmd.exe or PowerShell. Both variants are shown.

---

## Prerequisites
- Google Cloud SDK installed and authenticated
- A deployed Cloud Run service (example: gsdta-web)
- A public hosted zone for gsdta.com in AWS Route 53
- Domain verified in Google (via Search Console or `gcloud domains verify`)

---

## 1) Create the domain mapping (regional)

Note: Domain mappings with `--region` often require the beta track. Ensure beta is available:

cmd
```
gcloud components update
gcloud components install beta
```

PowerShell
```
gcloud components update
gcloud components install beta
```

Create the mapping:

cmd
```
gcloud beta run domain-mappings create ^
  --service gsdta-web ^
  --domain app.gsdta.com ^
  --region us-central1
```

PowerShell
```
gcloud beta run domain-mappings create `
  --service gsdta-web `
  --domain app.gsdta.com `
  --region us-central1
```

---

## 2) Describe the mapping and get DNS records

cmd
```
gcloud beta run domain-mappings describe --domain app.gsdta.com --region us-central1
```

PowerShell
```
gcloud beta run domain-mappings describe `
  --domain app.gsdta.com `
  --region us-central1
```

Sample output:
```
resourceRecords:
- name: app
  rrdata: ghs.googlehosted.com.
  type: CNAME
status:
  conditions:
  - type: Ready
    status: Unknown
    reason: CertificatePending
```

---

## 3) Add DNS record in AWS Route 53

In Route 53 → Hosted zones → gsdta.com → Create record:
- Record name: app
- Record type: CNAME
- Value: ghs.googlehosted.com
- TTL: 300

Tip: the `describe` output shows a trailing dot (ghs.googlehosted.com.). In Route 53, enter it without the trailing dot.

Then save.

---

## 4) Verify DNS propagation

cmd
```
nslookup -type=CNAME app.gsdta.com 8.8.8.8
```

PowerShell
```
nslookup -type=CNAME app.gsdta.com 8.8.8.8
```

Expected:
```
app.gsdta.com  canonical name = ghs.googlehosted.com
```

---

## 5) Wait for HTTPS certificate provisioning

Check status until Ready:

cmd
```
gcloud beta run domain-mappings describe --domain app.gsdta.com --region us-central1
```

PowerShell
```
gcloud beta run domain-mappings describe `
  --domain app.gsdta.com `
  --region us-central1
```

Proceed once the certificate status is Ready/Active. Then visit: https://app.gsdta.com

---

## 6) Optional: redirect apex root to your subdomain

- Use S3 static website + Route 53 or your registrar’s URL forwarding to redirect gsdta.com → https://app.gsdta.com.
- Avoid mapping the apex directly unless following Google’s apex mapping guidance.

---

## 7) Optional: redirect run.app host → custom domain

Go example:
```
if r.Host != "app.gsdta.com" {
    http.Redirect(w, r, "https://app.gsdta.com"+r.URL.RequestURI(), http.StatusMovedPermanently)
    return
}
```

Next.js middleware example (middleware.ts):
```
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')
  if (host && host !== 'app.gsdta.com') {
    const url = new URL(req.url)
    url.host = 'app.gsdta.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }
  return NextResponse.next()
}

export const config = { matcher: '/:path*' }
```

---

## Troubleshooting

| Issue | Cause | Fix |
|------|-------|-----|
| `gcloud` not recognized | SDK not on PATH | Add `C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin` to PATH |
| Certificate stuck at Pending | DNS not propagated | Verify CNAME via `nslookup` and wait |
| `NOT_FOUND` when describing mapping | Mapping not created | Re-run the create command |
| Conflicting DNS | Old A/AAAA/ALIAS records | Remove conflicting records for `app.gsdta.com` |
| Certificate still pending after DNS looks good | Restrictive CAA records | Add a CAA record to allow Google: `CAA 0 issue "pki.goog"` |

When status is Ready, your app is live at https://app.gsdta.com

---

# 🔒 HTTPS Redirect: `gsdta.com` ➜ `https://app.gsdta.com` (S3 + CloudFront + Route 53)

_Last updated: 2025-10-16_

This guide sets up a secure (HTTPS) redirect so that anyone visiting `gsdta.com` is immediately redirected to `https://app.gsdta.com`. We’ll use:
- Amazon S3 (static website redirect endpoint)
- Amazon CloudFront (TLS/HTTPS at the edge)
- AWS Certificate Manager (ACM) (free SSL cert, must be in `us-east-1` for CloudFront)
- Route 53 (DNS alias to CloudFront)

> Why this pattern? The DNS apex (root) record can’t be a CNAME. CloudFront + Alias A record solves HTTPS + root-domain routing cleanly.

---

## ✅ Prerequisites
- Hosted zone for `gsdta.com` in Route 53 (already set up)
- Subdomain `app.gsdta.com` already mapped to Cloud Run (done earlier)
- IAM permissions for S3, CloudFront, ACM, and Route 53

---

## 1) Create an S3 redirect bucket
Create a bucket named exactly `gsdta.com` and configure it to redirect all requests to `https://app.gsdta.com`.

### Console steps
1. S3 → Create bucket
   - Bucket name: `gsdta.com`
   - Leave ACLs disabled, Bucket versioning off
   - Keep Block all public access = ON (OK for redirect website hosting)
   - Create the bucket
2. Open the bucket → Properties tab → Static website hosting
   - Enable
   - Hosting type: Redirect requests for an object
   - Host name (Target): `app.gsdta.com`
   - Protocol: `https`
   - Save

Note: For redirect-only hosting, you do not need objects, bucket policy, or public access. The S3 website endpoint will issue 301 redirects.

### (Optional) CLI
```bash
aws s3api create-bucket --bucket gsdta.com --region us-west-2
aws s3api put-bucket-website --bucket gsdta.com --website-configuration '{
  "RedirectAllRequestsTo": {"HostName": "app.gsdta.com", "Protocol": "https"}
}'
```

---

## 2) Request an ACM certificate (in us-east-1)
CloudFront only uses ACM certificates in N. Virginia (us-east-1).

### Console steps
1. Go to ACM (us-east-1) → Request a certificate
2. Request a public certificate
3. Domain names: add `gsdta.com` (and optionally `www.gsdta.com`)
4. Validation method: DNS validation
5. Submit → ACM shows one or two CNAME records to create
6. Click Create records in Route 53 (one-click) or add them manually in the hosted zone:
   - Name: as shown by ACM
   - Type: CNAME
   - Value/Target: as shown by ACM
7. Wait until the certificate status becomes Issued.

### (Optional) CLI
```bash
# Request a cert (primary + SAN for www)
aws acm request-certificate \
  --region us-east-1 \
  --domain-name gsdta.com \
  --subject-alternative-names www.gsdta.com \
  --validation-method DNS
# Then add the provided DNS CNAME(s) in Route 53 and wait for "ISSUED".
```

---

## 3) Create a CloudFront distribution
Origin must be the S3 Website endpoint (not the REST endpoint). You can find it on the S3 bucket Properties → Static website hosting panel; it looks like:
```
http://gsdta.com.s3-website-<region>.amazonaws.com
```

### Console steps
1. CloudFront → Create distribution
2. Origin
   - Origin domain: choose your S3 Website endpoint for `gsdta.com`
   - Origin name: auto-filled
   - Origin protocol policy: HTTP only (S3 website endpoints don’t support HTTPS)
3. Default behavior
   - Viewer protocol policy: Redirect HTTP to HTTPS (forces HTTPS to clients)
   - Allowed methods: GET, HEAD (enough for redirects)
   - Cache policy: CachingOptimized (default is fine)
4. Settings
   - Alternate domain name (CNAME): `gsdta.com` (add `www.gsdta.com` too if you want)
   - Custom SSL certificate: select the ACM certificate you Issued in us-east-1
   - (Optional) Default root object: leave blank
5. Create distribution and wait until Status = Deployed

> If you added `www.gsdta.com` to the certificate, you can later point `www` → same distribution to redirect `www.gsdta.com` → `https://app.gsdta.com` as well. You don’t need a separate bucket — the redirect happens at the S3 website level.

---

## 4) Point Route 53 A (Alias) to CloudFront
Send the root domain traffic to CloudFront via an alias record.

### Console steps
1. Route 53 → Hosted zones → gsdta.com → Create record
2. Record type: A – IPv4 address
3. Alias: Yes
4. Route traffic to: Alias to CloudFront distribution
5. Pick your new distribution from the dropdown
6. Record name: leave blank (root/apex)
7. Save the record

(Optional) Create a `www` record:
- Record name: `www`
- Type: CNAME (or Alias A to CloudFront if you prefer)
- Value: `gsdta.com` (if you want `www` → root → redirect) or point directly to the same CloudFront distribution.

---

## 5) Test
After propagation (typically a few minutes):
```powershell
nslookup gsdta.com 8.8.8.8
```
You should see an alias to your `*.cloudfront.net` domain.

Then in a browser:
- Visit `http://gsdta.com` → should redirect to `https://app.gsdta.com`
- Visit `https://gsdta.com` → should redirect to `https://app.gsdta.com` with a valid TLS cert

You can also verify the HTTP status:
```powershell
curl -I http://gsdta.com
curl -I https://gsdta.com
```
Expected: `301`/`308` to `https://app.gsdta.com/...`

---

## Notes & Gotchas
- ACM region: Must be `us-east-1` for CloudFront.
- S3 website endpoint: Use the website endpoint as the origin. CloudFront to S3-website is HTTP only; clients see HTTPS at CloudFront.
- Block Public Access: Keep it ON. You don’t need any bucket policy for redirect hosting.
- Costs: Typically a few cents/month for CloudFront requests + Route 53 ($0.50/hosted zone). S3 cost is negligible for redirects.

---

## (Optional) Cleanup / Rollback
- To undo: point the Route 53 A (Alias) for `gsdta.com` back to previous target, or delete the record.
- Then delete the CloudFront distribution (disable → wait to Deployed → delete), the ACM cert (if unused), and the S3 bucket.

---

## Appendix: Verify IAM permissions (S3, CloudFront, ACM, Route 53)

You can verify what your current AWS identity is allowed to do via the AWS Console or the AWS CLI.

### Option A — AWS Console (quick visual)
- IAM → Users (or Roles) → select your user/role → Permissions
- Check attached policies and inline policies
- Use “Permissions” → “Simulate” to test specific actions (e.g., `route53:ChangeResourceRecordSets`)

### Option B — AWS CLI (PowerShell)

1) Identify the current principal

```powershell
aws sts get-caller-identity
# Note the Arn (e.g., arn:aws:iam::123456789012:user/YourUser or arn:aws:iam::123456789012:role/YourRole)
$PRINCIPAL_ARN = "<paste-your-arn-here>"
```

2) (If allowed) List attached policies for your user or role

```powershell
# If you are an IAM user
aws iam list-attached-user-policies --user-name YourUser
aws iam list-user-policies --user-name YourUser   # inline policies

# If you are assuming a role
aws iam list-attached-role-policies --role-name YourRole
aws iam list-role-policies --role-name YourRole   # inline policies
```

3) Locate your hosted zone ID for gsdta.com (for Route 53 simulations)

```powershell
$HZ_ID = (aws route53 list-hosted-zones-by-name --dns-name gsdta.com --query "HostedZones[0].Id" --output text)
$HZ_ID = $HZ_ID -replace "/hostedzone/", ""
```

4) Simulate key actions with the IAM Policy Simulator API

```powershell
# Global simulation (no resource ARNs) — quick overall view
aws iam simulate-principal-policy `
  --policy-source-arn $PRINCIPAL_ARN `
  --action-names `
    s3:CreateBucket s3:PutBucketWebsite s3:PutBucketPolicy `
    acm:RequestCertificate acm:ListCertificates acm:DescribeCertificate `
    cloudfront:CreateDistribution cloudfront:UpdateDistribution cloudfront:GetDistribution cloudfront:TagResource `
    route53:ListHostedZonesByName route53:GetHostedZone route53:ChangeResourceRecordSets route53:GetChange `
  --output json | ConvertFrom-Json | Select-Object -ExpandProperty EvaluationResults | `
  Select ActionName, EvalDecision

# Focused simulation for Route 53 changes against your hosted zone
aws iam simulate-principal-policy `
  --policy-source-arn $PRINCIPAL_ARN `
  --action-names route53:ChangeResourceRecordSets route53:GetChange `
  --resource-arns "arn:aws:route53:::hostedzone/$HZ_ID" `
  --output json | ConvertFrom-Json | Select-Object -ExpandProperty EvaluationResults | `
  Select ActionName, EvalDecision
```

Expected: `EvalDecision` should be `allowed` for the actions you need.

If you get `AccessDenied` on the IAM simulate or list commands, you likely lack `iam:SimulatePrincipalPolicy` or `iam:List*` permissions — in that case use the Console, or ask an admin to confirm your access.

### Minimal permissions (reference)
Ask an admin to grant the least-privilege set needed for this guide. Example (adapt to your account/zone IDs):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy",
        "s3:PutBucketOwnershipControls"
      ],
      "Resource": [
        "arn:aws:s3:::gsdta.com"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:ListCertificates",
        "acm:AddTagsToCertificate"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:TagResource",
        "cloudfront:DeleteDistribution"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZonesByName",
        "route53:GetHostedZone"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": [
        "arn:aws:route53:::hostedzone/$YOUR_HOSTED_ZONE_ID"
      ]
    }
  ]
}
```

Replace `$YOUR_HOSTED_ZONE_ID` with your actual hosted zone ID (e.g., `Z123EXAMPLE456`).

If you manage multiple domains or buckets, add the corresponding ARNs.
