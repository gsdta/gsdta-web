# News/Posts Feature Implementation Plan

## Overview
Implement full-featured news/posts system with rich text editor, image support, categories/tags, view tracking, and SEO metadata. Following existing hero-content and flash-news patterns.

## Data Model

```typescript
interface NewsArticle {
  id: string;
  slug: string;                        // URL-friendly slug

  // Bilingual Content
  title: { en: string; ta: string };
  summary: { en: string; ta: string }; // Short preview (50-150 chars)
  body: { en: string; ta: string };    // Rich HTML content

  // Media
  featuredImage?: string;              // Main image URL

  // Categorization
  category: string;                    // 'Events', 'Academic', 'Sports', 'Cultural', 'General'
  tags?: string[];

  // Publishing
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  isPinned: boolean;                   // Pin to top of list
  priority: number;                    // 0-100, higher first

  // Scheduling
  publishDate: Timestamp;              // When to publish (can be future)
  expiryDate?: Timestamp;              // Auto-archive after this date

  // SEO
  metaDescription?: { en: string; ta: string };

  // Author
  authorId: string;                    // User UID
  authorName: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Analytics
  views: number;                       // Incremented on each view
}
```

## Files to Create

### Phase 1: Backend (API + Types)

**Types:**
- `api/src/types/newsArticle.ts` - Server-side types with Firestore Timestamp
- `ui/src/types/newsArticle.ts` - Client-side types with ISO string dates

**API Routes:**
- `api/src/app/v1/news/route.ts` - Public GET (list with pagination, category filter)
- `api/src/app/v1/news/[slug]/route.ts` - Public GET (single article) + increment views
- `api/src/app/v1/admin/news/route.ts` - Admin GET (list all) / POST (create)
- `api/src/app/v1/admin/news/[id]/route.ts` - Admin GET/PATCH/DELETE

**Firebase:**
- `persistence/firestore.indexes.json` - Add newsArticles composite indexes

### Phase 2: Admin UI

**Pages:**
- `ui/src/app/admin/news/page.tsx` - List/manage articles with filters
- `ui/src/app/admin/news/create/page.tsx` - Create new article form
- `ui/src/app/admin/news/[id]/edit/page.tsx` - Edit existing article

**Components:**
- `ui/src/components/admin/RichTextEditor.tsx` - TipTap-based rich text editor

**New Dependencies:**
```bash
cd ui && npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
```

### Phase 3: Public UI

**Pages:**
- `ui/src/app/news/page.tsx` - News listing with category tabs
- `ui/src/app/news/[slug]/page.tsx` - Single article view

**Components:**
- `ui/src/components/news/NewsCard.tsx` - Article preview card for listing
- `ui/src/components/news/ArticleContent.tsx` - Full article display with HTML rendering

## Firebase Indexes

Add to `persistence/firestore.indexes.json`:

```json
{
  "collectionGroup": "newsArticles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "isPinned", "order": "DESCENDING" },
    { "fieldPath": "publishDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "newsArticles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "publishDate", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "newsArticles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isPinned", "order": "DESCENDING" },
    { "fieldPath": "publishDate", "order": "DESCENDING" }
  ]
}
```

## Categories (Hardcoded)

```typescript
const NEWS_CATEGORIES = [
  'Events',
  'Academic',
  'Sports',
  'Cultural',
  'General'
] as const;
```

## API Endpoints

### Public Endpoints

**GET /api/v1/news**
- Query params: `?category=Events&page=1&limit=10`
- Returns published articles within date range
- Ordered by: isPinned DESC, publishDate DESC
- Cached: 5 minutes

**GET /api/v1/news/[slug]**
- Returns single article by slug
- Increments view count
- Returns 404 if not found or not published

### Admin Endpoints

**GET /api/v1/admin/news**
- Query params: `?status=all|draft|published|archived`
- Returns all articles (admin only)
- Requires admin role

**POST /api/v1/admin/news**
- Creates new article
- Auto-generates slug from English title
- Sets status to 'draft' by default

**GET /api/v1/admin/news/[id]**
- Returns single article by ID (admin view)

**PATCH /api/v1/admin/news/[id]**
- Updates article fields
- Can change status (publish/archive)

**DELETE /api/v1/admin/news/[id]**
- Soft delete (sets status to 'archived') or hard delete

## Rich Text Editor (TipTap)

Features to include:
- Bold, Italic, Underline
- Headings (H1, H2, H3)
- Bullet and Numbered lists
- Links (with URL input)
- Images (URL-based, paste URL)
- Blockquotes
- Code blocks (optional)

## Slug Generation

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}
```

## View Count Increment

On public article fetch, increment views atomically:
```typescript
await docRef.update({
  views: FieldValue.increment(1)
});
```

## Implementation Order

1. **Types** - Create NewsArticle types for API and UI
2. **API Routes** - Admin CRUD endpoints first, then public
3. **Firebase Indexes** - Add and deploy to both QA and prod
4. **Install TipTap** - Add rich text editor dependencies
5. **Admin UI** - List page with filters, create/edit forms
6. **Public UI** - News listing page, single article page
7. **Testing** - Build verification, manual testing

## Verification Steps

```bash
# 1. Build API
cd api && npm run build

# 2. Build UI
cd ui && npm run build

# 3. Deploy indexes
firebase deploy --only firestore:indexes --project gsdta-qa

# 4. Test locally
npm run dev

# 5. Manual testing
# - Create article at /admin/news/create
# - View list at /admin/news
# - Edit article at /admin/news/[id]/edit
# - View public list at /news
# - View single article at /news/[slug]
```

## Security Rules

Add to `persistence/firestore.rules`:

```javascript
match /newsArticles/{articleId} {
  // Anyone can read published articles
  allow read: if resource.data.status == 'published'
    && resource.data.isActive == true
    && resource.data.publishDate <= request.time;

  // Admins can read all (including drafts)
  allow read: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);

  // Only admins can write
  allow create, update, delete: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin', 'super_admin']);
}
```

## Estimated Effort

- Types: 30 min
- API Routes: 2-3 hours
- Firebase Indexes: 15 min
- Admin UI (with TipTap): 4-5 hours
- Public UI: 2-3 hours
- Testing: 1 hour

**Total: ~10-12 hours**