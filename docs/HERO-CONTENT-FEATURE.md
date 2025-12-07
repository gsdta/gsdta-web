# Hero Content (Event Banner) Feature

**Status**: ✅ Backend Complete - Tests & Seeding Done  
**Date**: December 7, 2024

## Overview

This feature allows admins to manage hero content (event banners) that can override the default Thirukkural display on the homepage. All content is bilingual (Tamil + English).

## Implementation Summary

### ✅ Completed

#### 1. Data Model & Types
- **Location**: `/api/src/types/heroContent.ts`
- **Interfaces**:
  - `BilingualText` - Structure for Tamil + English text
  - `HeroContent` - Complete hero content document
  - `CreateHeroContentDto` - Payload for creating hero content
  - `UpdateHeroContentDto` - Payload for updating hero content

#### 2. Firestore Security Rules
- **Location**: `/persistence/firestore.rules`
- **Rules**:
  - Public read access for all hero content
  - Admin-only create, update, delete

#### 3. Firestore Indexes
- **Location**: `/persistence/firestore.indexes.json`
- **Indexes**:
  - `isActive + priority + createdAt` (for filtering active content by priority)
  - `priority + createdAt` (for sorting all content)

#### 4. API Endpoints

**Admin Endpoints** (require admin role):
- `GET /api/v1/admin/hero-content` - List all hero content with filtering
  - Query params: `status=active|inactive|all`
- `POST /api/v1/admin/hero-content` - Create new hero content
- `GET /api/v1/admin/hero-content/[id]` - Get single hero content
- `PATCH /api/v1/admin/hero-content/[id]` - Update hero content
- `DELETE /api/v1/admin/hero-content/[id]` - Delete hero content

**Public Endpoint**:
- `GET /api/v1/hero-content` - Get currently active hero content
  - No authentication required
  - Cached with 2-minute `s-maxage`
  - Returns highest priority active content within date range

#### 5. Unit Tests
- **Location**: `/api/src/app/v1/admin/hero-content/__tests__/route.test.ts`
- **Location**: `/api/src/app/v1/admin/hero-content/[id]/__tests__/route.test.ts`
- **Coverage**:
  - Authentication & authorization checks
  - Data structure validation
  - Bilingual text validation
  - Status filtering logic
  - Priority sorting logic
  - Date range validation
  - URL validation
  - CTA link validation

#### 6. E2E Tests (Cucumber)
- **Location**: `/api/tests/e2e/features/admin-hero-content.feature`
- **Scenarios**: 30+ test scenarios covering:
  - Admin CRUD operations
  - Bilingual content validation
  - Date range handling
  - Priority management
  - Authentication/authorization
  - Public endpoint access
  - Error handling (404, 400, 401, 403)

#### 7. Seed Data
- **Location**: `/scripts/seed-emulator.js`
- **Sample Data**: 3 hero content items:
  1. Active annual day event (priority 10)
  2. Inactive registration banner (priority 8)
  3. Past event (priority 5)

## Data Model

### HeroContent Document Structure

```typescript
{
  id: string;                    // Auto-generated document ID
  type: 'thirukkural' | 'event'; // Content type
  
  // Bilingual fields (required)
  title: {
    en: string;                  // English title
    ta: string;                  // Tamil title
  };
  subtitle: {
    en: string;                  // English subtitle
    ta: string;                  // Tamil subtitle
  };
  
  // Optional fields
  description?: {
    en: string;
    ta: string;
  };
  imageUrl?: string;             // Banner image URL
  ctaText?: {                    // Call-to-action button
    en: string;
    ta: string;
  };
  ctaLink?: string;              // CTA button destination URL
  
  // Display control
  startDate?: Timestamp;         // When to start showing
  endDate?: Timestamp;           // When to stop showing
  isActive: boolean;             // Admin toggle (manual activation)
  priority: number;              // 0-100, higher = shown first
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;             // Admin UID
  updatedBy?: string;            // Admin UID
}
```

## Business Logic

### Active Content Selection

The public endpoint (`GET /api/v1/hero-content`) returns active content based on:

1. **isActive** = `true` (admin has activated it)
2. **Date Range** (optional):
   - If `startDate` exists: current time >= startDate
   - If `endDate` exists: current time <= endDate
   - If neither exist: always shown (if active)
3. **Priority**: Highest priority wins if multiple are active

**Default Behavior**: 
- If no active event banner → Thirukkural displays (client-side, static data)
- If active event banner exists → Event banner overrides Thirukkural

### Priority System

- Range: 0-100
- Higher number = higher priority
- When multiple banners are active simultaneously:
  - Sorted by priority (descending)
  - Then by createdAt (descending)
  - Returns the first match

## Validation Rules

### Create Hero Content

**Required**:
- `type`: Must be 'thirukkural' or 'event'
- `title.en`: Non-empty string
- `title.ta`: Non-empty string
- `subtitle.en`: Non-empty string
- `subtitle.ta`: Non-empty string

**Optional**:
- `description`: Bilingual or null
- `imageUrl`: Valid URL or null
- `ctaText`: Bilingual or null (must have `ctaLink` if provided)
- `ctaLink`: Valid URL or null
- `startDate`: ISO 8601 datetime string or null
- `endDate`: ISO 8601 datetime string or null
- `priority`: Integer 0-100 (default: 0)

**Defaults**:
- `isActive`: false (admin must activate manually)
- `priority`: 0

### Update Hero Content

All fields optional. Can update individually without affecting other fields.

## Testing

### Run Unit Tests

```bash
cd api
npm test
```

All tests should pass, including new hero content tests.

### Run E2E Tests

```bash
# From project root
./run-e2e-tests.sh
```

This will:
1. Start Firebase emulators
2. Seed test data (including hero content)
3. Run all Cucumber scenarios
4. Clean up

### Manual Testing with Emulators

```bash
# Start emulators with seed data
./start-dev-local.sh

# Or manually:
npm run emulators
node scripts/seed-emulator.js
```

**Test Admin User**:
- Email: `admin@test.com`
- Password: `admin123`

**Sample API Calls**:

```bash
# Get admin token (after login)
TOKEN="your-firebase-id-token"

# List all hero content
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/hero-content

# Create new hero content
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "event",
    "title": {"en": "New Event", "ta": "புதிய நிகழ்வு"},
    "subtitle": {"en": "Exciting news", "ta": "உற்சாகமான செய்தி"},
    "priority": 5
  }' \
  http://localhost:8080/api/v1/admin/hero-content

# Get active content (public, no auth needed)
curl http://localhost:8080/api/v1/hero-content
```

## Next Steps (UI Implementation)

### 1. Client-Side Hook
- [ ] Create `/ui/src/hooks/useHeroContent.ts`
- [ ] Implement client-side caching with 5-min TTL
- [ ] Add Firestore real-time listener for instant updates
- [ ] Handle cache eviction on admin updates

### 2. Update Hero Component
- [ ] Modify `/ui/src/components/home/HeroThirukkural.tsx`
- [ ] Check for active event banner first
- [ ] Show event banner if active, else show Thirukkural
- [ ] Add bilingual text display using `useLanguage()` hook

### 3. Admin UI
- [ ] Create `/ui/src/app/admin/content/hero/page.tsx`
- [ ] List all hero content with filters (active/inactive/all)
- [ ] Create new hero content form
- [ ] Edit existing hero content
- [ ] Activate/deactivate toggle
- [ ] Delete hero content
- [ ] Preview before publishing
- [ ] Image upload integration

### 4. Testing
- [ ] Test on multiple screen sizes (mobile-first)
- [ ] Test bilingual content switching
- [ ] Test cache behavior
- [ ] Test real-time updates when admin publishes

## Notes

- All content MUST be bilingual (Tamil + English)
- Event banners override Thirukkural display when active
- Default behavior: Thirukkural rotation (static client-side data)
- Admin controls activation via `isActive` flag
- Date range is optional but recommended for time-sensitive content
- Priority determines which banner shows if multiple are active
- Client-side caching with TTL reduces Firestore reads
- Real-time listeners ensure instant updates when admins publish

## Security

- ✅ Firestore security rules enforce admin-only writes
- ✅ Public read access for all users (needed for homepage)
- ✅ API endpoints verify Firebase ID tokens
- ✅ Admin role checked via `requireRole` middleware
- ✅ User status must be 'active'
- ✅ Input validation with Zod schemas
- ✅ No sensitive data exposed in error messages

## Performance

- Public endpoint cached with `s-maxage=120, stale-while-revalidate=300`
- Client-side caching recommended (5-min TTL)
- Firestore indexes for efficient queries
- Real-time listeners for instant admin updates
- Minimal payload (only active content returned)

