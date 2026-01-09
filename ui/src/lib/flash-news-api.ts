import type { FlashNews, FlashNewsPublic, FlashNewsFormData } from '@/types/flashNews';

type GetIdToken = () => Promise<string | null>;

const API_BASE = '/api/v1';

export interface FlashNewsFilters {
  status?: 'all' | 'active' | 'inactive';
}

/**
 * Admin: Get all flash news items
 */
export async function adminGetFlashNews(
  getIdToken: GetIdToken,
  filters: FlashNewsFilters = {}
): Promise<{ items: FlashNews[] }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);

  const res = await fetch(`${API_BASE}/admin/flash-news?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch flash news');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Get a single flash news item
 */
export async function adminGetFlashNewsItem(
  getIdToken: GetIdToken,
  id: string
): Promise<FlashNews> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/flash-news/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch flash news item');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Create a new flash news item
 */
export async function adminCreateFlashNews(
  getIdToken: GetIdToken,
  formData: FlashNewsFormData
): Promise<{ id: string }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload = {
    text: {
      en: formData.textEn,
      ta: formData.textTa,
    },
    link: formData.link || undefined,
    priority: formData.priority,
    isActive: formData.isActive,
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
  };

  const res = await fetch(`${API_BASE}/admin/flash-news`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create flash news');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Update a flash news item
 */
export async function adminUpdateFlashNews(
  getIdToken: GetIdToken,
  id: string,
  formData: Partial<FlashNewsFormData>
): Promise<FlashNews> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const payload: Record<string, unknown> = {};

  if (formData.textEn !== undefined || formData.textTa !== undefined) {
    payload.text = {
      en: formData.textEn ?? '',
      ta: formData.textTa ?? '',
    };
  }

  if (formData.link !== undefined) {
    payload.link = formData.link || null;
  }

  if (formData.priority !== undefined) {
    payload.priority = formData.priority;
  }

  if (formData.isActive !== undefined) {
    payload.isActive = formData.isActive;
  }

  if (formData.startDate !== undefined) {
    payload.startDate = formData.startDate || null;
  }

  if (formData.endDate !== undefined) {
    payload.endDate = formData.endDate || null;
  }

  const res = await fetch(`${API_BASE}/admin/flash-news/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update flash news');
  }

  const data = await res.json();
  return data.data;
}

/**
 * Admin: Delete a flash news item
 */
export async function adminDeleteFlashNews(
  getIdToken: GetIdToken,
  id: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/admin/flash-news/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete flash news');
  }
}

/**
 * Public: Get active flash news items (no auth required)
 */
export async function getPublicFlashNews(): Promise<{ items: FlashNewsPublic[] }> {
  const res = await fetch(`${API_BASE}/public/flash-news`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch flash news');
  }

  const data = await res.json();
  return data.data;
}
