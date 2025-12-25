/**
 * Volunteer API client functions
 */

import type {
  Volunteer,
  CreateVolunteerInput,
  UpdateVolunteerInput,
  VolunteerListFilters,
  VolunteerListResponse,
} from './volunteer-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type GetIdTokenFn = () => Promise<string | null>;

/**
 * Get all volunteers with optional filters
 */
export async function adminGetVolunteers(
  getIdToken: GetIdTokenFn,
  filters: VolunteerListFilters = {}
): Promise<VolunteerListResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.classId) params.append('classId', filters.classId);
  if (filters.academicYear) params.append('academicYear', filters.academicYear);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const url = `${API_BASE}/api/v1/admin/volunteers${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to fetch volunteers: ${res.status}`);
  }

  const data = await res.json();
  return data.data;
}

/**
 * Get a single volunteer by ID
 */
export async function adminGetVolunteer(
  getIdToken: GetIdTokenFn,
  id: string
): Promise<Volunteer> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/volunteers/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to fetch volunteer: ${res.status}`);
  }

  const data = await res.json();
  return data.data.volunteer;
}

/**
 * Create a new volunteer
 */
export async function adminCreateVolunteer(
  getIdToken: GetIdTokenFn,
  input: CreateVolunteerInput
): Promise<Volunteer> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/volunteers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to create volunteer: ${res.status}`);
  }

  const data = await res.json();
  return data.data.volunteer;
}

/**
 * Update a volunteer
 */
export async function adminUpdateVolunteer(
  getIdToken: GetIdTokenFn,
  id: string,
  input: UpdateVolunteerInput
): Promise<Volunteer> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/volunteers/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to update volunteer: ${res.status}`);
  }

  const data = await res.json();
  return data.data.volunteer;
}

/**
 * Delete a volunteer (soft delete)
 */
export async function adminDeleteVolunteer(
  getIdToken: GetIdTokenFn,
  id: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/v1/admin/volunteers/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Failed to delete volunteer: ${res.status}`);
  }
}
