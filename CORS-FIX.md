# Fix CORS Error - Quick Action Guide

## Problem
Your production site at `https://app.gsdta.com` is trying to load images from `http://localhost:3000`, causing CORS errors.

## Root Cause
The `NEXT_PUBLIC_SITE_URL` environment variable is not set in your Cloud Run deployment.

## Immediate Fix

Run this command to update your existing Cloud Run service:

```cmd
gcloud run services update gsdta-web ^
  --update-env-vars NEXT_PUBLIC_SITE_URL=https://app.gsdta.com ^
  --region us-central1
```

**Replace the region if your service is deployed elsewhere.** Common regions:
- `us-central1`
- `us-east1` 
- `us-west1`

### If you don't know your service name or region:

```cmd
gcloud run services list
```

This shows all your Cloud Run services with their regions.

## Verification

After the update completes (takes ~1-2 minutes):

1. **Visit your site**: Open `https://app.gsdta.com`
2. **Check browser console**: The CORS error should be gone
3. **View page source**: Look for the JSON-LD script tag - it should show:
   ```json
   {"@context":"https://schema.org","@type":"Organization",
    "logo":"https://app.gsdta.com/images/logo.png"}
   ```
   NOT `"logo":"http://localhost:3000/images/logo.png"`

## For Future Deployments

Always include this environment variable:

### Cloud Run Deploy:
```cmd
gcloud run deploy gsdta-web ^
  --image <your-image> ^
  --region us-central1 ^
  --set-env-vars NEXT_PUBLIC_SITE_URL=https://app.gsdta.com,...
```

### Docker Compose:
```cmd
set NEXT_PUBLIC_SITE_URL=https://app.gsdta.com
docker-compose up
```

### Local Development:
Add to `ui/.env.local`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Related Documentation
- Full troubleshooting guide: `docs/cors-troubleshooting.md`
- Deployment guide: `docs/gcp-deploy.md`

