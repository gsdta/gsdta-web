/**
 * Textbook API client functions
 */

import type {
  Textbook,
  CreateTextbookInput,
  UpdateTextbookInput,
  TextbookListFilters,
  TextbookListResponse,
} from './textbook-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type GetIdTokenFn = () => Promise<string | null>;

/**
 * Get all textbooks with optional filters
 */
export async function adminGetTextbooks(
  getIdToken: GetIdTokenFn,
  filters: TextbookListFilters = {}
): Promise<TextbookListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (filters.gradeId) params.append('gradeId', filters.gradeId);
  if (filters.type) params.append('type', filters.type);
  if (filters.academicYear) params.append('academicYear', filters.academicYear);
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const url = `${API_BASE}/api/v1/admin/textbooks${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to fetch textbooks: ${res.status}`);
  }

  const data = await res.json();
  return data.data;
}

/**
 * Get a single textbook by ID
 */
export async function adminGetTextbook(
  getIdToken: GetIdTokenFn,
  id: string
): Promise<Textbook> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/textbooks/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to fetch textbook: ${res.status}`);
  }

  const data = await res.json();
  return data.data.textbook;
}

/**
 * Create a new textbook
 */
export async function adminCreateTextbook(
  getIdToken: GetIdTokenFn,
  input: CreateTextbookInput
): Promise<Textbook> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/textbooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to create textbook: ${res.status}`);
  }

  const data = await res.json();
  return data.data.textbook;
}

/**
 * Update a textbook
 */
export async function adminUpdateTextbook(
  getIdToken: GetIdTokenFn,
  id: string,
  input: UpdateTextbookInput
): Promise<Textbook> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/textbooks/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to update textbook: ${res.status}`);
  }

  const data = await res.json();
  return data.data.textbook;
}

/**
 * Delete a textbook (soft delete)
 */
export async function adminDeleteTextbook(
  getIdToken: GetIdTokenFn,
  id: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/textbooks/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to delete textbook: ${res.status}`);
  }
}
