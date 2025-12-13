import type {
  Grade,
  GradeOption,
  CreateGradeInput,
  UpdateGradeInput,
  GradesResponse,
  SeedGradesResponse,
  GradeStatus,
} from './grade-types';

type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Get all grades (admin)
 */
export async function adminGetGrades(
  getIdToken: TokenGetter,
  params: { status?: GradeStatus | 'all' } = {}
): Promise<GradesResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);

  const url = `/api/v1/admin/grades/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<GradesResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch grades');
  }

  return json.data!;
}

/**
 * Get active grade options for dropdowns (admin)
 */
export async function adminGetGradeOptions(getIdToken: TokenGetter): Promise<GradeOption[]> {
  const result = await adminGetGrades(getIdToken, { status: 'active' });
  return result.grades.map((g) => ({
    id: g.id,
    name: g.name,
    displayName: g.displayName,
    displayOrder: g.displayOrder,
  }));
}

/**
 * Get a single grade by ID (admin)
 */
export async function adminGetGrade(
  getIdToken: TokenGetter,
  gradeId: string
): Promise<Grade> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/grades/${gradeId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<{ grade: Grade }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch grade');
  }

  return json.data!.grade;
}

/**
 * Create a new grade (admin)
 */
export async function adminCreateGrade(
  getIdToken: TokenGetter,
  data: CreateGradeInput
): Promise<Grade> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/admin/grades/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = (await res.json()) as ApiResponse<{ grade: Grade }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to create grade');
  }

  return json.data!.grade;
}

/**
 * Update a grade (admin)
 */
export async function adminUpdateGrade(
  getIdToken: TokenGetter,
  gradeId: string,
  data: UpdateGradeInput
): Promise<Grade> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/grades/${gradeId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = (await res.json()) as ApiResponse<{ grade: Grade }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to update grade');
  }

  return json.data!.grade;
}

/**
 * Seed default grades (admin)
 */
export async function adminSeedGrades(getIdToken: TokenGetter): Promise<SeedGradesResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/admin/grades/seed/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = (await res.json()) as ApiResponse<SeedGradesResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to seed grades');
  }

  return json.data!;
}

/**
 * Check if grades have been seeded (admin)
 */
export async function adminCheckGradesSeeded(getIdToken: TokenGetter): Promise<boolean> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/admin/grades/seed/', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<{ seeded: boolean }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to check seed status');
  }

  return json.data!.seeded;
}
