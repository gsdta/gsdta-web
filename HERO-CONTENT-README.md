# Hero Content (Event Banner) Feature - COMPLETE ✅

## Quick Start

### Testing Locally

```bash
# 1. Start Firebase emulators with seed data
./start-dev-local.sh

# Or manually:
npm run emulators
node scripts/seed-emulator.js

# 2. In another terminal, start the UI
cd ui
npm run dev

# 3. In another terminal, start the API
cd api
npm run dev
```

### Access URLs

- **Homepage**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/content/hero
- **Emulator UI**: http://localhost:4445

### Test Credentials

- **Admin**: `admin@test.com` / `admin123`
- **Teacher**: `teacher@test.com` / `teacher123`
- **Parent**: `parent@test.com` / `parent123`

## Feature Overview

This feature allows admins to create and manage event banners that override the default Thirukkural display on the homepage.

**Default Behavior**: Homepage shows rotating Thirukkural verses (1330+ verses, client-side, no database)

**Event Banner Behavior**: When admin activates an event banner:
- Event banner **replaces** Thirukkural display
- Banner shows during active date range
- Highest priority banner shown if multiple active
- Automatically reverts to Thirukkural after event ends

## What's Implemented

### ✅ Backend (API)
- RESTful API endpoints (CRUD operations)
- Firebase Admin authentication
- Zod input validation
- Firestore security rules (admin write, public read)
- Firestore composite indexes for efficient queries
- Unit tests (authentication, validation, business logic)
- E2E tests (30+ Cucumber scenarios)
- Seed data for local testing

### ✅ Frontend (UI)
- `useHeroContent` hook with client-side caching (5-min TTL)
- Firestore real-time listeners for instant updates
- `HeroEventBanner` component (bilingual, responsive)
- Updated `HeroThirukkural` to check for active banners
- Admin management page (list, activate, deactivate, delete)
- Protected routes (admin-only access)
- Mobile-first responsive design
- Bilingual support (Tamil + English)

### ✅ Data Model
```typescript
{
  id: string;
  type: 'event' | 'thirukkural';
  title: { en: string; ta: string };
  subtitle: { en: string; ta: string };
  description?: { en: string; ta: string };
  imageUrl?: string;
  ctaText?: { en: string; ta: string };
  ctaLink?: string;
  startDate?: Timestamp;  // When to start showing
  endDate?: Timestamp;    // When to stop showing
  isActive: boolean;      // Admin toggle
  priority: number;       // 0-100, higher = shown first
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;      // Admin UID
}
```

## API Endpoints

### Admin Endpoints (require admin role)

```bash
# List all hero content
GET /api/v1/admin/hero-content?status=all|active|inactive

# Create new hero content
POST /api/v1/admin/hero-content
Body: { type, title, subtitle, description?, imageUrl?, ctaText?, ctaLink?, startDate?, endDate?, priority? }

# Get single hero content
GET /api/v1/admin/hero-content/:id

# Update hero content
PATCH /api/v1/admin/hero-content/:id
Body: { isActive?, priority?, title?, ... }

# Delete hero content
DELETE /api/v1/admin/hero-content/:id
```

### Public Endpoint (no auth required)

```bash
# Get currently active hero content
GET /api/v1/hero-content
Response: { success: true, data: { content: {...} | null } }
```

## Client-Side Caching Strategy

1. **First Load**:
   - Check localStorage for cached data
   - If cache valid (< 5 min) → Show immediately
   - Subscribe to Firestore real-time updates in background

2. **Cache Hit**:
   - Instant page load (no Firestore read)
   - Background subscription for updates

3. **Cache Miss**:
   - Query Firestore for active content
   - Show loading state briefly
   - Cache result for 5 minutes

4. **Real-Time Updates**:
   - Admin activates banner → All users see it within seconds
   - Admin deactivates banner → All users revert to Thirukkural
   - No page reload needed

## Testing Guide

### Manual Testing

1. **Start Local Environment**:
   ```bash
   ./start-dev-local.sh
   ```

2. **Login as Admin**:
   - Go to http://localhost:3000/login
   - Email: `admin@test.com`
   - Password: `admin123`

3. **Test Admin Panel**:
   - Go to http://localhost:3000/admin/content/hero
   - Should see 3 seed items (1 active, 2 inactive)
   - Click "Active" filter → See 1 item
   - Click "Inactive" filter → See 2 items

4. **Test Activation**:
   - Click "Activate" on an inactive item
   - Go to homepage (http://localhost:3000)
   - Should see event banner (not Thirukkural)

5. **Test Deactivation**:
   - Go back to admin panel
   - Click "Deactivate" on the active item
   - Go to homepage
   - Should see Thirukkural again

6. **Test Mobile View**:
   - Open Chrome DevTools
   - Toggle device emulation (mobile view)
   - Verify responsive design works

7. **Test Language Switching**:
   - Switch language (Tamil/English toggle)
   - Verify banner text changes
   - Verify dates are localized

### Automated Testing

```bash
# Run API unit tests
cd api
npm test

# Run E2E tests (includes emulators)
cd ..
./run-e2e-tests.sh
```

## Architecture Decisions

### Why Client-Side Caching?

**Problem**: Fetching hero content from Firestore on every page load is expensive and slow.

**Solution**: Cache in localStorage with TTL + real-time listeners
- **Benefit**: Instant page load (no wait for Firestore)
- **Benefit**: Reduced Firestore read costs
- **Benefit**: Still gets real-time updates when admin changes content

### Why Real-Time Listeners Instead of Polling?

**Problem**: Polling every X seconds wastes resources and increases latency.

**Solution**: Firestore `onSnapshot` listeners
- **Benefit**: Instant updates when data changes (< 1 second)
- **Benefit**: No wasted polls when data hasn't changed
- **Benefit**: Efficient use of Firestore quota

### Why Date Range Filtering on Client?

**Problem**: Compound Firestore index needed for `isActive + startDate + endDate + priority`

**Solution**: Query by `isActive` only, filter date range on client
- **Benefit**: Simpler Firestore indexes
- **Benefit**: Only fetches 10 documents (limit 10)
- **Benefit**: Date filtering is fast on client

## Files Changed/Created

### Backend (API)
```
api/src/types/heroContent.ts                          [NEW]
api/src/app/v1/admin/hero-content/route.ts           [NEW]
api/src/app/v1/admin/hero-content/[id]/route.ts      [NEW]
api/src/app/v1/hero-content/route.ts                 [NEW]
api/src/app/v1/admin/hero-content/__tests__/route.test.ts        [NEW]
api/src/app/v1/admin/hero-content/[id]/__tests__/route.test.ts  [NEW]
api/tests/e2e/features/admin-hero-content.feature    [NEW]
api/tests/e2e/steps/api.steps.ts                     [MODIFIED]
api/tests/e2e/steps/hero-content.steps.ts            [NEW]
persistence/firestore.rules                          [MODIFIED]
persistence/firestore.indexes.json                   [MODIFIED]
scripts/seed-emulator.js                             [MODIFIED]
```

### Frontend (UI)
```
ui/src/types/heroContent.ts                          [NEW]
ui/src/hooks/useHeroContent.ts                       [NEW]
ui/src/components/home/HeroEventBanner.tsx           [NEW]
ui/src/components/home/HeroThirukkural.tsx           [MODIFIED]
ui/src/app/admin/content/hero/page.tsx               [NEW]
```

### Documentation
```
docs/HERO-CONTENT-FEATURE.md                         [NEW]
docs/HERO-CONTENT-UI-COMPLETE.md                     [NEW]
docs/ROLES.md                                        [MODIFIED]
HERO-CONTENT-README.md                               [NEW]
```

## Next Steps (Future Enhancements)

### High Priority
- [ ] Create hero content form (admin can create new banners via UI)
- [ ] Edit hero content form (admin can update existing banners)
- [ ] Image upload integration (Firebase Storage or CDN)

### Medium Priority
- [ ] Preview before publishing
- [ ] Duplicate as template
- [ ] Rich text editor for description
- [ ] Banner analytics (views, CTA clicks)

### Low Priority
- [ ] Scheduling queue (multiple banners scheduled)
- [ ] A/B testing (show different banners to different users)
- [ ] User targeting (show banners based on role/location)

## Troubleshooting

### Banner not showing on homepage

1. **Check if banner is active**:
   - Go to `/admin/content/hero`
   - Verify item has green "Active" badge
   - Check start/end dates are valid

2. **Check browser cache**:
   - Open Chrome DevTools → Application → Local Storage
   - Look for key: `hero_content_cache`
   - Delete it and reload page

3. **Check console for errors**:
   - Open Chrome DevTools → Console
   - Look for Firestore permission errors
   - Look for network errors

### Admin page shows "Failed to fetch"

1. **Check authentication**:
   - Verify you're logged in as admin
   - Check that API is running (http://localhost:8080/api/v1/health)

2. **Check Firestore rules**:
   - Open Emulator UI (http://localhost:4445)
   - Go to Firestore → Rules
   - Verify `heroContent` rules are present

3. **Check API logs**:
   - Check API terminal for error logs
   - Look for authentication errors

## Production Deployment

Before deploying to production:

1. **Deploy Firestore Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy Firestore Indexes**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Test in Staging**:
   - Deploy to staging environment first
   - Test admin panel
   - Test homepage banner display
   - Test cache behavior

4. **Deploy to Production**:
   - Deploy UI and API
   - Monitor logs for errors
   - Test with real admin account

## Support

For issues or questions:
- See `/docs/HERO-CONTENT-FEATURE.md` - Backend implementation details
- See `/docs/HERO-CONTENT-UI-COMPLETE.md` - UI implementation details
- See `/docs/ROLES.md` - Feature requirements and status

---

**Feature Status**: ✅ COMPLETE AND TESTED
**Last Updated**: December 7, 2024
