/**
 * Student API
 *
 * API functions for student management.
 * These functions use the shared API client and PlatformAdapter.
 */

import { apiFetch, withTrailingSlash, type ApiResponse } from "./client";
import type {
  Student,
  CreateStudentInput,
  UpdateStudentInput,
  StudentStatusCounts,
} from "../types/student";

// Response types
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

// ============================================================================
// Parent API Functions
// ============================================================================

/**
 * Create a new student (parent registration)
 */
export async function createStudent(data: CreateStudentInput): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash("/v1/me/students"),
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to create student");
  }

  return res.data.student;
}

/**
 * Get all students for the current parent
 */
export async function getMyStudents(): Promise<Student[]> {
  const res = await apiFetch<ApiResponse<{ students: Student[] }>>(
    withTrailingSlash("/v1/me/students")
  );

  return res.data?.students || [];
}

/**
 * Get a specific student by ID (parent view)
 */
export async function getStudentById(studentId: string): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash(`/v1/me/students/${studentId}`)
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to fetch student");
  }

  return res.data.student;
}

/**
 * Update a student (parent can update if pending/admitted)
 */
export async function updateStudent(
  studentId: string,
  data: UpdateStudentInput
): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash(`/v1/me/students/${studentId}`),
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to update student");
  }

  return res.data.student;
}

// ============================================================================
// Admin API Functions
// ============================================================================

export interface AdminStudentsListParams {
  status?: "pending" | "admitted" | "active" | "inactive" | "withdrawn" | "all";
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all students (admin)
 */
export async function adminGetStudents(
  params: AdminStudentsListParams = {}
): Promise<StudentsResponse> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set("status", params.status);
  if (params.search) queryParams.set("search", params.search);
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.offset) queryParams.set("offset", params.offset.toString());

  const query = queryParams.toString();
  const path = `/v1/admin/students/${query ? `?${query}` : ""}`;

  const res = await apiFetch<ApiResponse<StudentsResponse>>(path);

  if (!res.data) {
    throw new Error(res.message || "Failed to fetch students");
  }

  return res.data;
}

/**
 * Get student details (admin)
 */
export async function adminGetStudent(studentId: string): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash(`/v1/admin/students/${studentId}`)
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to fetch student");
  }

  return res.data.student;
}

/**
 * Admit a student (admin)
 */
export async function adminAdmitStudent(studentId: string): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash(`/v1/admin/students/${studentId}/admit`),
    { method: "PATCH" }
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to admit student");
  }

  return res.data.student;
}

/**
 * Assign a class to a student (admin)
 */
export async function adminAssignClass(
  studentId: string,
  classId: string
): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash(`/v1/admin/students/${studentId}/assign-class`),
    {
      method: "PATCH",
      body: JSON.stringify({ classId }),
    }
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to assign class");
  }

  return res.data.student;
}

/**
 * Update student (admin)
 */
export async function adminUpdateStudent(
  studentId: string,
  data: Record<string, unknown>
): Promise<Student> {
  const res = await apiFetch<ApiResponse<StudentResponse>>(
    withTrailingSlash(`/v1/admin/students/${studentId}`),
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );

  if (!res.data?.student) {
    throw new Error(res.message || "Failed to update student");
  }

  return res.data.student;
}

// Aliases for backwards compatibility
export const getStudent = getStudentById;
export const listStudents = getMyStudents;
