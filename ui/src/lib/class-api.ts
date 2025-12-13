type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Teacher role within a class
 */
export type ClassTeacherRole = 'primary' | 'assistant';

/**
 * Teacher assignment within a class
 */
export interface ClassTeacher {
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  role: ClassTeacherRole;
  assignedAt: string;
  assignedBy: string;
}

export interface ClassOption {
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  available: number;
  status: 'active' | 'inactive';
  teachers: ClassTeacher[];
  // Legacy fields for backward compatibility
  level?: string;
}

export interface Class extends Omit<ClassOption, 'available'> {
  available: number;
  // Legacy fields for backward compatibility
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

interface TeachersResponse {
  classId: string;
  teachers: ClassTeacher[];
  total: number;
}

/**
 * Get all classes (admin)
 */
export async function adminGetClasses(
  getIdToken: TokenGetter,
  params: { status?: 'active' | 'inactive' | 'all'; gradeId?: string } = {}
): Promise<ClassesResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.gradeId) queryParams.set('gradeId', params.gradeId);

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const url = `/api/v1/admin/classes/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<ClassesResponse>;

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

  const json = (await res.json()) as ApiResponse<ClassOptionsResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch class options');
  }

  return json.data!.options;
}

/**
 * Get a specific class (admin)
 */
export async function adminGetClass(getIdToken: TokenGetter, classId: string): Promise<Class> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/classes/${classId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<{ class: Class }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch class');
  }

  return json.data!.class;
}

export interface CreateClassInput {
  name: string;
  gradeId: string;
  day: string;
  time: string;
  capacity: number;
  academicYear?: string;
}

export interface UpdateClassInput {
  name?: string;
  gradeId?: string;
  day?: string;
  time?: string;
  capacity?: number;
  status?: 'active' | 'inactive';
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

  const json = (await res.json()) as ApiResponse<{ class: Class }>;

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
  data: UpdateClassInput
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

  const json = (await res.json()) as ApiResponse<{ class: Class }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to update class');
  }

  return json.data!.class;
}

// ============================================================================
// Teacher Assignment Functions
// ============================================================================

export interface AssignTeacherInput {
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  role: ClassTeacherRole;
}

/**
 * Get teachers assigned to a class (admin)
 */
export async function adminGetClassTeachers(
  getIdToken: TokenGetter,
  classId: string
): Promise<ClassTeacher[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/classes/${classId}/teachers/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<TeachersResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch class teachers');
  }

  return json.data!.teachers;
}

/**
 * Assign a teacher to a class (admin)
 */
export async function adminAssignTeacher(
  getIdToken: TokenGetter,
  classId: string,
  data: AssignTeacherInput
): Promise<ClassTeacher[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/classes/${classId}/teachers/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = (await res.json()) as ApiResponse<TeachersResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to assign teacher');
  }

  return json.data!.teachers;
}

/**
 * Remove a teacher from a class (admin)
 */
export async function adminRemoveTeacher(
  getIdToken: TokenGetter,
  classId: string,
  teacherId: string
): Promise<ClassTeacher[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/classes/${classId}/teachers/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ teacherId }),
  });

  const json = (await res.json()) as ApiResponse<TeachersResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to remove teacher');
  }

  return json.data!.teachers;
}

/**
 * Update a teacher's role in a class (admin)
 */
export async function adminUpdateTeacherRole(
  getIdToken: TokenGetter,
  classId: string,
  teacherId: string,
  role: ClassTeacherRole
): Promise<ClassTeacher[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/classes/${classId}/teachers/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ teacherId, role }),
  });

  const json = (await res.json()) as ApiResponse<TeachersResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to update teacher role');
  }

  return json.data!.teachers;
}

/**
 * Helper to get the primary teacher from a class
 */
export function getPrimaryTeacher(teachers: ClassTeacher[]): ClassTeacher | undefined {
  return teachers.find((t) => t.role === 'primary');
}

/**
 * Helper to get assistant teachers from a class
 */
export function getAssistantTeachers(teachers: ClassTeacher[]): ClassTeacher[] {
  return teachers.filter((t) => t.role === 'assistant');
}

/**
 * Helper to format teacher display
 */
export function formatTeachersDisplay(teachers: ClassTeacher[]): string {
  if (!teachers || teachers.length === 0) return 'No teachers assigned';

  const primary = getPrimaryTeacher(teachers);
  const assistants = getAssistantTeachers(teachers);

  if (primary) {
    if (assistants.length > 0) {
      return `${primary.teacherName} + ${assistants.length} assistant${assistants.length > 1 ? 's' : ''}`;
    }
    return primary.teacherName;
  }

  if (assistants.length > 0) {
    return `${assistants.length} assistant${assistants.length > 1 ? 's' : ''} (no primary)`;
  }

  return 'No teachers assigned';
}
