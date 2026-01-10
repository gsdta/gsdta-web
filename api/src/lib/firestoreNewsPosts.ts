import { adminDb } from './firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  NewsPost,
  NewsPostFilters,
  TeacherNewsPostFilters,
  PublicNewsPostFilters,
  CreateNewsPostDto,
  UpdateNewsPostDto,
  NewsPostPublic,
  NewsPostImage,
} from '@/types/newsPost';
import { NEWS_POST_CONSTANTS } from '@/types/newsPost';

// Test hook: allow overriding adminDb provider during tests
let getDb = adminDb;
export function __setAdminDbForTests(fn: typeof adminDb | null) {
  getDb = fn ?? adminDb;
}

const NEWS_POSTS_COLLECTION = 'newsPosts';

/**
 * Generate a URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .substring(0, 80);         // Limit length

  // Add timestamp suffix for uniqueness
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Generate unique ID for an image
 */
function generateImageId(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Process images array to add IDs
 */
function processImages(images?: Omit<NewsPostImage, 'id'>[]): NewsPostImage[] | undefined {
  if (!images || images.length === 0) return undefined;
  return images.map((img, index) => ({
    ...img,
    id: generateImageId(),
    order: img.order ?? index,
  }));
}

/**
 * Process featured image to add ID
 */
function processFeaturedImage(image?: Omit<NewsPostImage, 'id'>): NewsPostImage | undefined {
  if (!image) return undefined;
  return {
    ...image,
    id: generateImageId(),
    order: 0,
  };
}

/**
 * Create a news post
 */
export async function createNewsPost(
  data: CreateNewsPostDto,
  authorUid: string,
  authorName: string,
  authorRole: 'teacher' | 'admin'
): Promise<NewsPost> {
  const now = Timestamp.now();
  const db = getDb();
  const docRef = db.collection(NEWS_POSTS_COLLECTION).doc();

  const newsPostData: Omit<NewsPost, 'id'> = {
    title: data.title,
    summary: data.summary,
    body: data.body,
    slug: generateSlug(data.title.en),
    category: data.category,
    tags: data.tags?.slice(0, NEWS_POST_CONSTANTS.MAX_TAGS),
    featuredImage: processFeaturedImage(data.featuredImage),
    images: processImages(data.images),
    status: data.status || 'draft',
    docStatus: 'active',
    startDate: data.startDate ? Timestamp.fromDate(new Date(data.startDate)) : undefined,
    endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : undefined,
    priority: data.priority ?? NEWS_POST_CONSTANTS.DEFAULT_PRIORITY,
    authorId: authorUid,
    authorName: authorName,
    authorRole: authorRole,
    createdAt: now,
    updatedAt: now,
  };

  // Clean undefined values
  const cleanedData = Object.fromEntries(
    Object.entries(newsPostData).filter(([, v]) => v !== undefined)
  );

  await docRef.set(cleanedData);

  return {
    id: docRef.id,
    ...newsPostData,
  };
}

/**
 * Get news post by ID
 */
export async function getNewsPostById(id: string): Promise<NewsPost | null> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  return {
    id: doc.id,
    ...data,
  } as NewsPost;
}

/**
 * Get news post by slug (for public display)
 */
export async function getNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  const snap = await getDb()
    .collection(NEWS_POSTS_COLLECTION)
    .where('slug', '==', slug)
    .where('docStatus', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as NewsPost;
}

/**
 * Get news posts with filters (admin)
 */
export async function getNewsPosts(
  filters: NewsPostFilters
): Promise<{ posts: NewsPost[]; total: number }> {
  const {
    status,
    category,
    authorId,
    authorRole,
    limit = 20,
    offset = 0,
  } = filters;

  let query = getDb()
    .collection(NEWS_POSTS_COLLECTION)
    .where('docStatus', '==', 'active') as FirebaseFirestore.Query;

  // Apply filters
  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }
  if (category && category !== 'all') {
    query = query.where('category', '==', category);
  }
  if (authorId) {
    query = query.where('authorId', '==', authorId);
  }
  if (authorRole && authorRole !== 'all') {
    query = query.where('authorRole', '==', authorRole);
  }

  // Order by priority desc, then createdAt desc
  query = query.orderBy('priority', 'desc').orderBy('createdAt', 'desc');

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const posts = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NewsPost[];

  return { posts, total };
}

/**
 * Get news posts by author (teacher)
 */
export async function getNewsPostsByAuthor(
  authorId: string,
  filters: TeacherNewsPostFilters
): Promise<{ posts: NewsPost[]; total: number }> {
  const { status, limit = 20, offset = 0 } = filters;

  let query = getDb()
    .collection(NEWS_POSTS_COLLECTION)
    .where('docStatus', '==', 'active')
    .where('authorId', '==', authorId) as FirebaseFirestore.Query;

  if (status && status !== 'all') {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc');

  // Get total count
  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  // Apply pagination
  query = query.offset(offset).limit(limit);

  const snap = await query.get();

  const posts = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as NewsPost[];

  return { posts, total };
}

/**
 * Get published news posts (public)
 */
export async function getPublishedNewsPosts(
  filters: PublicNewsPostFilters
): Promise<{ posts: NewsPostPublic[]; total: number }> {
  const { category, limit = 20, offset = 0 } = filters;
  const now = new Date();

  let query = getDb()
    .collection(NEWS_POSTS_COLLECTION)
    .where('docStatus', '==', 'active')
    .where('status', '==', 'published') as FirebaseFirestore.Query;

  if (category && category !== 'all') {
    query = query.where('category', '==', category);
  }

  query = query.orderBy('priority', 'desc').orderBy('publishedAt', 'desc');

  const snap = await query.get();

  // Filter by date range in memory (Firestore limitation with multiple inequality filters)
  const posts: NewsPostPublic[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();

    // Check startDate: if set, must be <= now
    if (data.startDate) {
      const startDate = data.startDate.toDate();
      if (startDate > now) continue;
    }

    // Check endDate: if set, must be >= now
    if (data.endDate) {
      const endDate = data.endDate.toDate();
      if (endDate < now) continue;
    }

    posts.push({
      id: doc.id,
      title: data.title,
      summary: data.summary,
      body: data.body,
      slug: data.slug,
      category: data.category,
      tags: data.tags,
      featuredImage: data.featuredImage,
      images: data.images,
      authorName: data.authorName,
      publishedAt: data.publishedAt?.toDate().toISOString() ?? data.createdAt.toDate().toISOString(),
      priority: data.priority,
    });
  }

  // Apply pagination in memory (after date filtering)
  const total = posts.length;
  const paginatedPosts = posts.slice(offset, offset + limit);

  return { posts: paginatedPosts, total };
}

/**
 * Get single published news post by slug (public)
 */
export async function getPublishedNewsPostBySlug(slug: string): Promise<NewsPostPublic | null> {
  const post = await getNewsPostBySlug(slug);

  if (!post || post.status !== 'published') return null;

  const now = new Date();

  // Check startDate
  if (post.startDate) {
    const startDate = post.startDate.toDate();
    if (startDate > now) return null;
  }

  // Check endDate
  if (post.endDate) {
    const endDate = post.endDate.toDate();
    if (endDate < now) return null;
  }

  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    body: post.body,
    slug: post.slug,
    category: post.category,
    tags: post.tags,
    featuredImage: post.featuredImage,
    images: post.images,
    authorName: post.authorName,
    publishedAt: post.publishedAt?.toDate().toISOString() ?? post.createdAt.toDate().toISOString(),
    priority: post.priority,
  };
}

/**
 * Update a news post
 */
export async function updateNewsPost(
  id: string,
  data: UpdateNewsPostDto,
  editorUid: string,
  editorName: string
): Promise<NewsPost | null> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const existingData = doc.data()!;
  if (existingData.docStatus === 'deleted') return null;

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  // Handle text fields
  if (data.title !== undefined) {
    updateData.title = data.title;
    // Regenerate slug if title changed
    updateData.slug = generateSlug(data.title.en);
  }
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags.slice(0, NEWS_POST_CONSTANTS.MAX_TAGS);
  if (data.priority !== undefined) updateData.priority = data.priority;

  // Handle images
  if (data.featuredImage !== undefined) {
    updateData.featuredImage = data.featuredImage === null
      ? null
      : processFeaturedImage(data.featuredImage);
  }
  if (data.images !== undefined) {
    updateData.images = processImages(data.images);
  }

  // Handle dates (null to clear)
  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate === null
      ? null
      : Timestamp.fromDate(new Date(data.startDate));
  }
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate === null
      ? null
      : Timestamp.fromDate(new Date(data.endDate));
  }

  await doc.ref.update(updateData);

  return getNewsPostById(id);
}

/**
 * Soft delete a news post
 */
export async function deleteNewsPost(id: string): Promise<boolean> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return false;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return false;

  await doc.ref.update({
    docStatus: 'deleted',
    updatedAt: Timestamp.now(),
  });

  return true;
}

/**
 * Submit news post for review (teacher action)
 */
export async function submitNewsPostForReview(
  id: string,
  submitterUid: string
): Promise<NewsPost | null> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  // Can only submit draft or rejected posts
  if (!['draft', 'rejected'].includes(data.status)) {
    throw new Error(`Cannot submit post with status: ${data.status}`);
  }

  // Verify ownership
  if (data.authorId !== submitterUid) {
    throw new Error('Not authorized to submit this post');
  }

  await doc.ref.update({
    status: 'pending_review',
    submittedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Clear previous rejection if resubmitting
    rejectionReason: null,
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
  });

  return getNewsPostById(id);
}

/**
 * Review news post (admin action)
 */
export async function reviewNewsPost(
  id: string,
  action: 'approve' | 'reject',
  reviewerUid: string,
  reviewerName: string,
  rejectionReason?: string
): Promise<NewsPost | null> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  // Can only review pending posts
  if (data.status !== 'pending_review') {
    throw new Error(`Cannot review post with status: ${data.status}`);
  }

  if (action === 'reject' && !rejectionReason) {
    throw new Error('Rejection reason is required');
  }

  const updateData: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewedBy: reviewerUid,
    reviewedByName: reviewerName,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (action === 'reject') {
    updateData.rejectionReason = rejectionReason;
  }

  await doc.ref.update(updateData);

  return getNewsPostById(id);
}

/**
 * Publish news post (admin action)
 */
export async function publishNewsPost(
  id: string,
  publisherUid: string,
  publisherName: string
): Promise<NewsPost | null> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  // Can publish approved or unpublished posts
  // Admin-created posts can also be published from draft
  const canPublish = ['approved', 'unpublished'].includes(data.status) ||
    (data.status === 'draft' && data.authorRole === 'admin');

  if (!canPublish) {
    throw new Error(`Cannot publish post with status: ${data.status}`);
  }

  await doc.ref.update({
    status: 'published',
    publishedAt: Timestamp.now(),
    publishedBy: publisherUid,
    publishedByName: publisherName,
    updatedAt: Timestamp.now(),
  });

  return getNewsPostById(id);
}

/**
 * Unpublish news post (admin action)
 */
export async function unpublishNewsPost(
  id: string,
  unpublisherUid: string
): Promise<NewsPost | null> {
  const doc = await getDb().collection(NEWS_POSTS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.docStatus === 'deleted') return null;

  if (data.status !== 'published') {
    throw new Error(`Cannot unpublish post with status: ${data.status}`);
  }

  await doc.ref.update({
    status: 'unpublished',
    unpublishedAt: Timestamp.now(),
    unpublishedBy: unpublisherUid,
    updatedAt: Timestamp.now(),
  });

  return getNewsPostById(id);
}

/**
 * Verify news post ownership
 */
export async function verifyNewsPostOwner(
  postId: string,
  authorUid: string
): Promise<boolean> {
  const post = await getNewsPostById(postId);
  return post !== null && post.authorId === authorUid;
}

/**
 * Check if teacher can edit the post (only draft or rejected)
 */
export async function canTeacherEditPost(
  postId: string,
  teacherUid: string
): Promise<{ canEdit: boolean; reason?: string }> {
  const post = await getNewsPostById(postId);

  if (!post) {
    return { canEdit: false, reason: 'Post not found' };
  }

  if (post.authorId !== teacherUid) {
    return { canEdit: false, reason: 'Not authorized' };
  }

  if (!['draft', 'rejected'].includes(post.status)) {
    return { canEdit: false, reason: `Cannot edit post with status: ${post.status}` };
  }

  return { canEdit: true };
}

/**
 * Get posts pending review (admin)
 */
export async function getPendingReviewPosts(
  limit = 20,
  offset = 0
): Promise<{ posts: NewsPost[]; total: number }> {
  return getNewsPosts({
    status: 'pending_review',
    limit,
    offset,
  });
}
