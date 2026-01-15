import type {
  NewsPost,
  NewsPostPublic,
  NewsPostFormData,
  NewsPostCategory,
  NewsPostStatus,
  NewsPostImage,
} from '@/types/newsPost';

type GetIdToken = () => Promise<string | null>;

const API_BASE = '/api/v1';

export interface NewsPostFilters {
  status?: NewsPostStatus | 'all';
  category?: NewsPostCategory | 'all';
  authorRole?: 'teacher' | 'admin' | 'all';
  limit?: number;
  offset?: number;
}

export interface NewsPostListResponse {
  items: NewsPost[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// Admin API Functions
// ============================================

/**
 * Admin: Get all news posts with filters
 */
export async function adminGetNewsPosts(
  getIdToken: GetIdToken,
  filters: NewsPostFilters = {}
): Promise<NewsPostListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.authorRole && filters.authorRole !== 'all') params.set('authorRole', filters.authorRole);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const res = await fetch(`${API_BASE}/admin/news-posts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch news posts');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Get a single news post
 */
export async function adminGetNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/news-posts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Create a new news post
 */
export async function adminCreateNewsPost(
  getIdToken: GetIdToken,
  formData: NewsPostFormData
): Promise<{ id: string; slug: string }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload = {
    title: { en: formData.titleEn, ta: formData.titleTa },
    summary: { en: formData.summaryEn, ta: formData.summaryTa },
    body: { en: formData.bodyEn, ta: formData.bodyTa },
    category: formData.category,
    tags: formData.tags.length > 0 ? formData.tags : undefined,
    featuredImage: formData.featuredImage || undefined,
    images: formData.images.length > 0 ? formData.images : undefined,
    priority: formData.priority,
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
  };

  const res = await fetch(`${API_BASE}/admin/news-posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Update a news post
 */
export async function adminUpdateNewsPost(
  getIdToken: GetIdToken,
  id: string,
  formData: Partial<NewsPostFormData>
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload: Record<string, unknown> = {};

  if (formData.titleEn !== undefined || formData.titleTa !== undefined) {
    payload.title = {
      en: formData.titleEn ?? '',
      ta: formData.titleTa ?? '',
    };
  }

  if (formData.summaryEn !== undefined || formData.summaryTa !== undefined) {
    payload.summary = {
      en: formData.summaryEn ?? '',
      ta: formData.summaryTa ?? '',
    };
  }

  if (formData.bodyEn !== undefined || formData.bodyTa !== undefined) {
    payload.body = {
      en: formData.bodyEn ?? '',
      ta: formData.bodyTa ?? '',
    };
  }

  if (formData.category !== undefined) payload.category = formData.category;
  if (formData.tags !== undefined) payload.tags = formData.tags;
  if (formData.priority !== undefined) payload.priority = formData.priority;

  if (formData.featuredImage !== undefined) {
    payload.featuredImage = formData.featuredImage || null;
  }

  if (formData.images !== undefined) {
    payload.images = formData.images;
  }

  if (formData.startDate !== undefined) {
    payload.startDate = formData.startDate || null;
  }

  if (formData.endDate !== undefined) {
    payload.endDate = formData.endDate || null;
  }

  const res = await fetch(`${API_BASE}/admin/news-posts/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Delete a news post (soft delete)
 */
export async function adminDeleteNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/news-posts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete news post');
  }
}

/**
 * Admin: Review a news post (approve or reject)
 */
export async function adminReviewNewsPost(
  getIdToken: GetIdToken,
  id: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload: { action: string; rejectionReason?: string } = { action };
  if (action === 'reject' && rejectionReason) {
    payload.rejectionReason = rejectionReason;
  }

  const res = await fetch(`${API_BASE}/admin/news-posts/${id}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to review news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Publish a news post
 */
export async function adminPublishNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/news-posts/${id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to publish news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Unpublish a news post
 */
export async function adminUnpublishNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/news-posts/${id}/unpublish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to unpublish news post');
  }

  const data = await res.json();
  return data.data;
}

// ============================================
// Teacher API Functions
// ============================================

/**
 * Teacher: Get own news posts
 */
export async function teacherGetMyNewsPosts(
  getIdToken: GetIdToken,
  filters: { status?: NewsPostStatus | 'all'; limit?: number; offset?: number } = {}
): Promise<NewsPostListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const res = await fetch(`${API_BASE}/teacher/news-posts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch news posts');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Teacher: Get own news post by ID
 */
export async function teacherGetNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/teacher/news-posts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Teacher: Create a draft news post
 */
export async function teacherCreateNewsPost(
  getIdToken: GetIdToken,
  formData: NewsPostFormData
): Promise<{ id: string; slug: string }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload = {
    title: { en: formData.titleEn, ta: formData.titleTa },
    summary: { en: formData.summaryEn, ta: formData.summaryTa },
    body: { en: formData.bodyEn, ta: formData.bodyTa },
    category: formData.category,
    tags: formData.tags.length > 0 ? formData.tags : undefined,
    featuredImage: formData.featuredImage || undefined,
    images: formData.images.length > 0 ? formData.images : undefined,
    // Teachers cannot set priority or schedule - defaults applied server-side
  };

  const res = await fetch(`${API_BASE}/teacher/news-posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Teacher: Update own draft/rejected news post
 */
export async function teacherUpdateNewsPost(
  getIdToken: GetIdToken,
  id: string,
  formData: Partial<NewsPostFormData>
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload: Record<string, unknown> = {};

  if (formData.titleEn !== undefined || formData.titleTa !== undefined) {
    payload.title = {
      en: formData.titleEn ?? '',
      ta: formData.titleTa ?? '',
    };
  }

  if (formData.summaryEn !== undefined || formData.summaryTa !== undefined) {
    payload.summary = {
      en: formData.summaryEn ?? '',
      ta: formData.summaryTa ?? '',
    };
  }

  if (formData.bodyEn !== undefined || formData.bodyTa !== undefined) {
    payload.body = {
      en: formData.bodyEn ?? '',
      ta: formData.bodyTa ?? '',
    };
  }

  if (formData.category !== undefined) payload.category = formData.category;
  if (formData.tags !== undefined) payload.tags = formData.tags;

  if (formData.featuredImage !== undefined) {
    payload.featuredImage = formData.featuredImage || null;
  }

  if (formData.images !== undefined) {
    payload.images = formData.images;
  }

  const res = await fetch(`${API_BASE}/teacher/news-posts/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update news post');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Teacher: Delete own draft news post
 */
export async function teacherDeleteNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/teacher/news-posts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete news post');
  }
}

/**
 * Teacher: Submit news post for admin review
 */
export async function teacherSubmitNewsPost(
  getIdToken: GetIdToken,
  id: string
): Promise<NewsPost> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/teacher/news-posts/${id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to submit news post for review');
  }

  const data = await res.json();
  return data.data;
}

// ============================================
// Public API Functions
// ============================================

/**
 * Public: Get published news posts (no auth required)
 */
export async function getPublicNewsPosts(
  filters: { category?: NewsPostCategory | 'all'; limit?: number; offset?: number } = {}
): Promise<{ items: NewsPostPublic[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset) params.set('offset', filters.offset.toString());

  const res = await fetch(`${API_BASE}/public/news-posts?${params.toString()}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch news posts');
  }

  const data = await res.json();
  return {
    items: data.data.items,
    total: data.data.total,
    hasMore: data.data.hasMore ?? false,
  };
}

/**
 * Public: Get a published news post by slug (no auth required)
 */
export async function getPublicNewsPost(slug: string): Promise<NewsPostPublic> {
  const res = await fetch(`${API_BASE}/public/news-posts/${encodeURIComponent(slug)}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch news post');
  }

  const data = await res.json();
  return data.data;
}
