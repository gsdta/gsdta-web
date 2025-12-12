import type {
  ProfileResponse,
  ProfileUpdatePayload,
  StudentsResponse,
  LinkedStudent,
} from './parent-types';

type TokenGetter = () => Promise<string | null>;

/**
 * Get the authenticated user's profile
 */
export async function getProfile(getIdToken: TokenGetter): Promise<ProfileResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to fetch profile' }));
    throw new Error(error.message || 'Failed to fetch profile');
  }

  return res.json();
}

/**
 * Update the authenticated user's profile
 */
export async function updateProfile(
  getIdToken: TokenGetter,
  data: ProfileUpdatePayload
): Promise<ProfileResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/me', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message || 'Failed to update profile');
  }

  return res.json();
}

/**
 * Get students linked to the authenticated user
 */
export async function getLinkedStudents(getIdToken: TokenGetter): Promise<LinkedStudent[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/me/students', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to fetch students' }));
    throw new Error(error.message || 'Failed to fetch students');
  }

  const data: StudentsResponse = await res.json();
  return data.data?.students || [];
}
