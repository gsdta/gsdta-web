import type { Student, CreateStudentInput, UpdateStudentInput, StudentStatusCounts } from './student-types';

type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

interface StudentResponse {
  student: Student;
}

interface StudentsResponse {
  students: Student[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  counts?: StudentStatusCounts;
}

/**
 * Create a new student (parent registration)
 */
export async function createStudent(
  getIdToken: TokenGetter,
  data: CreateStudentInput
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch('/api/v1/me/students/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to create student');
  }

  return json.data!.student;
}

/**
 * Get all students for the current parent
 */
export async function getMyStudents(getIdToken: TokenGetter): Promise<Student[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch('/api/v1/me/students/', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<{ students: Student[] }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch students');
  }

  return json.data?.students || [];
}

/**
 * Get a specific student by ID (parent view)
 */
export async function getStudentById(
  getIdToken: TokenGetter,
  studentId: string
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/me/students/${studentId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch student');
  }

  return json.data!.student;
}

/**
 * Update a student (parent can update if pending/admitted)
 */
export async function updateStudent(
  getIdToken: TokenGetter,
  studentId: string,
  data: UpdateStudentInput
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/me/students/${studentId}/`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to update student');
  }

  return json.data!.student;
}

// Admin API functions

export interface AdminStudentsListParams {
  status?: 'pending' | 'admitted' | 'active' | 'inactive' | 'withdrawn' | 'all';
  search?: string;
  classId?: string;
  teacherId?: string;
  enrollingGrade?: string;
  schoolDistrict?: string;
  unassigned?: boolean;
  dateField?: 'createdAt' | 'admittedAt';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all students (admin)
 */
export async function adminGetStudents(
  getIdToken: TokenGetter,
  params: AdminStudentsListParams = {}
): Promise<StudentsResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.search) queryParams.set('search', params.search);
  if (params.classId) queryParams.set('classId', params.classId);
  if (params.teacherId) queryParams.set('teacherId', params.teacherId);
  if (params.enrollingGrade) queryParams.set('enrollingGrade', params.enrollingGrade);
  if (params.schoolDistrict) queryParams.set('schoolDistrict', params.schoolDistrict);
  if (params.unassigned) queryParams.set('unassigned', 'true');
  if (params.dateField) queryParams.set('dateField', params.dateField);
  if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.set('dateTo', params.dateTo);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const url = `/api/v1/admin/students/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<StudentsResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch students');
  }

  return json.data!;
}

/**
 * Get student details (admin)
 */
export async function adminGetStudent(
  getIdToken: TokenGetter,
  studentId: string
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/students/${studentId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch student');
  }

  return json.data!.student;
}

/**
 * Admit a student (admin)
 */
export async function adminAdmitStudent(
  getIdToken: TokenGetter,
  studentId: string
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/students/${studentId}/admit/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to admit student');
  }

  return json.data!.student;
}

/**
 * Assign a class to a student (admin)
 */
export async function adminAssignClass(
  getIdToken: TokenGetter,
  studentId: string,
  classId: string
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/students/${studentId}/assign-class/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ classId }),
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to assign class');
  }

  return json.data!.student;
}

/**
 * Update student (admin)
 */
export async function adminUpdateStudent(
  getIdToken: TokenGetter,
  studentId: string,
  data: Record<string, unknown>
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  // Use trailing slash to avoid 308 redirect that strips Authorization header
  const res = await fetch(`/api/v1/admin/students/${studentId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to update student');
  }

  return json.data!.student;
}

// Bulk Import Types and Functions

export interface BulkImportRowError {
  row: number;
  errors: Array<{
    field: string;
    value: string;
    message: string;
  }>;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  total: number;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    parentEmail: string;
    parentId: string;
    status: string;
  }>;
  errors: BulkImportRowError[];
  warnings: string[];
  createdParents: string[];
  message: string;
  dryRun?: boolean;
  valid?: number;
  invalid?: number;
}

export interface BulkImportRequest {
  csvData: string;
  dryRun?: boolean;
  createParents?: boolean;
}

/**
 * Bulk import students from CSV (admin)
 */
export async function adminBulkImportStudents(
  getIdToken: TokenGetter,
  request: BulkImportRequest
): Promise<BulkImportResult> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/admin/students/bulk-import/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const json = await res.json();

  if (!res.ok && res.status !== 207) {
    throw new Error(json.message || 'Failed to import students');
  }

  return json as BulkImportResult;
}

// Bulk Class Assignment Types and Functions

export interface BulkAssignClassResult {
  success: boolean;
  updated: string[];
  failed: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  message: string;
  enrolledCount?: number;
}

/**
 * Bulk assign class to multiple students (admin)
 */
export async function adminBulkAssignClass(
  getIdToken: TokenGetter,
  studentIds: string[],
  classId: string
): Promise<BulkAssignClassResult> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/admin/students/bulk-assign-class/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ studentIds, classId }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || 'Failed to assign class');
  }

  return json as BulkAssignClassResult;
}

// Transfer Class Types and Functions

export interface TransferClassResult {
  success: boolean;
  message: string;
  data: {
    student: {
      id: string;
      firstName: string;
      lastName: string;
      name: string;
      status: string;
      classId: string;
      className: string;
    };
    previousClassId?: string;
    previousClassName?: string;
    newClassId: string;
    newClassName: string;
  };
}

/**
 * Transfer a student to a different class (admin)
 */
export async function adminTransferClass(
  getIdToken: TokenGetter,
  studentId: string,
  newClassId: string
): Promise<TransferClassResult> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/students/${studentId}/transfer-class/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newClassId }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || 'Failed to transfer student');
  }

  return json as TransferClassResult;
}

/**
 * Unassign a student from their current class (admin)
 */
export async function adminUnassignClass(
  getIdToken: TokenGetter,
  studentId: string
): Promise<Student> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/admin/students/${studentId}/unassign-class/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const json = await res.json() as ApiResponse<StudentResponse>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to unassign student from class');
  }

  return json.data!.student;
}

// Aliases for legacy/refactored components
export const getStudent = getStudentById;
export const listStudents = getMyStudents;

