# CORS Troubleshooting Guide

## Common CORS Error: localhost:3000 in Production

### Symptom
```
Access to image at 'http://localhost:3000/images/logo.png' from origin 'https://app.gsdta.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Root Cause
The application is trying to load resources from `http://localhost:3000` in production because the `NEXT_PUBLIC_SITE_URL` environment variable is not set.

When `NEXT_PUBLIC_SITE_URL` is missing, the code defaults to `http://localhost:3000`:
```typescript
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
```

This affects:
- **Structured data (JSON-LD)** - Organization schema logo URLs
- **Metadata** - Open Graph and Twitter card images  
- **Asset references** - Any absolute URLs generated for images

### Solution

#### For Local Development
Set in `.env.local`:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### For Production (Cloud Run, Vercel, etc.)
Set the environment variable in your deployment platform:

**Cloud Run:**
```bash
gcloud run services update gsdta-ui \
  --update-env-vars NEXT_PUBLIC_SITE_URL=https://app.gsdta.com \
  --region us-central1
```

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://app.gsdta.com
```

**Docker:**
```bash
docker run -e NEXT_PUBLIC_SITE_URL=https://app.gsdta.com ...
```

**docker-compose.yml:**
```yaml
services:
  ui:
    environment:
      - NEXT_PUBLIC_SITE_URL=https://app.gsdta.com
```

### Verification

After setting the environment variable and redeploying:

1. **Check the page source** - View source of your production site and look for:
   ```html
   <script type="application/ld+json">
   {"@context":"https://schema.org","@type":"Organization","name":"GSDTA Tamil School",
   "url":"https://app.gsdta.com","logo":"https://app.gsdta.com/images/logo.png"}
   </script>
   ```

2. **Check browser console** - The CORS error should be gone

3. **Check network tab** - Image requests should go to `https://app.gsdta.com/images/...` not localhost

### Files Using NEXT_PUBLIC_SITE_URL

The following files use this variable and will be affected:
- `ui/src/app/head.tsx` - Organization JSON-LD schema
- `ui/src/app/layout.tsx` - Root layout metadata base URL
- `ui/src/app/robots.ts` - Sitemap URL in robots.txt
- `ui/src/app/sitemap.ts` - Site URL for sitemap entries
- `ui/src/app/team/page.tsx` - Team page structured data

### Prevention

✅ Add to deployment checklist:
- [ ] Set `NEXT_PUBLIC_SITE_URL` in production environment
- [ ] Verify in production after deployment
- [ ] Document in deployment scripts/CI/CD

✅ Consider adding runtime validation in `ui/src/app/layout.tsx`:
```typescript
if (process.env.NODE_ENV === 'production' && SITE_URL.includes('localhost')) {
  console.error('⚠️ NEXT_PUBLIC_SITE_URL not set! Using localhost in production.');
}
```

## Related Issues

### API CORS Errors
If you see CORS errors with API endpoints, check:
- `NEXT_PUBLIC_API_BASE_URL` is set correctly
- API server has appropriate CORS headers
- API rewrites in `next.config.ts` are configured

### Image Loading Issues
Next.js Image component may also need:
- `next.config.ts` - `images.domains` or `images.remotePatterns` configured
- Images in `public/` directory are served from root path

