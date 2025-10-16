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
