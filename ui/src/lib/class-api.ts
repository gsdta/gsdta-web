type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export interface ClassOption {
  id: string;
  name: string;
  level: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  available: number;
  status: 'active' | 'inactive';
}

export interface Class extends ClassOption {
  teacherId?: string;
  teacherName?: string;
  academicYear?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClassesResponse {
  classes: Class[];
  total: number;
}

interface ClassOptionsResponse {
  options: ClassOption[];
}

/**
 * Get all classes (admin)
 */
export async function adminGetClasses(
  getIdToken: TokenGetter,
  params: { status?: 'active' | 'inactive' | 'all'; level?: string } = {}
): Promise<ClassesResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.level) queryParams.set('level', params.level);

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const url = `/api/v1/admin/classes/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<ClassesResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch classes');
  }

  return json.data!;
}

/**
 * Get active class options for dropdowns (admin)
 */
export async function adminGetClassOptions(getIdToken: TokenGetter): Promise<ClassOption[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch('/api/v1/admin/classes/?options=true', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<ClassOptionsResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch class options');
  }

  return json.data!.options;
}

/**
 * Get a specific class (admin)
 */
export async function adminGetClass(
  getIdToken: TokenGetter,
  classId: string
): Promise<Class> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/classes/${classId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<{ class: Class }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch class');
  }

  return json.data!.class;
}

export interface CreateClassInput {
  name: string;
  level: string;
  day: string;
  time: string;
  capacity: number;
  teacherId?: string;
  teacherName?: string;
  academicYear?: string;
}

/**
 * Create a new class (admin)
 */
export async function adminCreateClass(
  getIdToken: TokenGetter,
  data: CreateClassInput
): Promise<Class> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch('/api/v1/admin/classes/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json() as ApiResponse<{ class: Class }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to create class');
  }

  return json.data!.class;
}

/**
 * Update a class (admin)
 */
export async function adminUpdateClass(
  getIdToken: TokenGetter,
  classId: string,
  data: Partial<CreateClassInput> & { status?: 'active' | 'inactive' }
): Promise<Class> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/classes/${classId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json() as ApiResponse<{ class: Class }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to update class');
  }

  return json.data!.class;
}
