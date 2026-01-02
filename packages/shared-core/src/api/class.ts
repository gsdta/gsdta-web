/**
 * Class API
 *
 * Platform-agnostic class management functions.
 */

import { apiFetch, withTrailingSlash, type ApiResponse } from "./client";

/**
 * Teacher role within a class
 */
export type ClassTeacherRole = "primary" | "assistant";

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
  section?: string;
  room?: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  available: number;
  status: "active" | "inactive";
  teachers: ClassTeacher[];
  // Legacy fields for backward compatibility
  level?: string;
}

export interface AdminClass extends Omit<ClassOption, "available"> {
  available: number;
  // Legacy fields for backward compatibility
  teacherId?: string;
  teacherName?: string;
  academicYear?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClassesResponse {
  classes: AdminClass[];
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

export interface CreateClassInput {
  name: string;
  gradeId: string;
  section?: string;
  room?: string;
  day: string;
  time: string;
  capacity: number;
  academicYear?: string;
}

export interface UpdateClassInput {
  name?: string;
  gradeId?: string;
  section?: string;
  room?: string;
  day?: string;
  time?: string;
  capacity?: number;
  status?: "active" | "inactive";
  academicYear?: string;
}

export interface AssignTeacherInput {
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  role: ClassTeacherRole;
}

/**
 * Get all classes (admin)
 */
export async function adminGetClasses(
  params: { status?: "active" | "inactive" | "all"; gradeId?: string; limit?: number; offset?: number } = {}
): Promise<ClassesResponse> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set("status", params.status);
  if (params.gradeId) queryParams.set("gradeId", params.gradeId);
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.offset) queryParams.set("offset", params.offset.toString());

  const qs = queryParams.toString();
  const path = withTrailingSlash(`/v1/admin/classes${qs ? `?${qs}` : ""}`);

  const json = await apiFetch<ApiResponse<ClassesResponse>>(path);
  if (!json.data) throw new Error("Failed to fetch classes");
  return json.data;
}

/**
 * Get active class options for dropdowns (admin)
 */
export async function adminGetClassOptions(): Promise<ClassOption[]> {
  const json = await apiFetch<ApiResponse<ClassOptionsResponse>>(
    "/v1/admin/classes/?options=true"
  );
  if (!json.data) throw new Error("Failed to fetch class options");
  return json.data.options;
}

/**
 * Get a specific class (admin)
 */
export async function adminGetClass(classId: string): Promise<AdminClass> {
  const json = await apiFetch<ApiResponse<{ class: AdminClass }>>(
    `/v1/admin/classes/${classId}/`
  );
  if (!json.data) throw new Error("Failed to fetch class");
  return json.data.class;
}

/**
 * Create a new class (admin)
 */
export async function adminCreateClass(data: CreateClassInput): Promise<AdminClass> {
  const json = await apiFetch<ApiResponse<{ class: AdminClass }>>(
    "/v1/admin/classes/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!json.data) throw new Error("Failed to create class");
  return json.data.class;
}

/**
 * Update a class (admin)
 */
export async function adminUpdateClass(
  classId: string,
  data: UpdateClassInput
): Promise<AdminClass> {
  const json = await apiFetch<ApiResponse<{ class: AdminClass }>>(
    `/v1/admin/classes/${classId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
  if (!json.data) throw new Error("Failed to update class");
  return json.data.class;
}

// ============================================================================
// Teacher Assignment Functions
// ============================================================================

/**
 * Get teachers assigned to a class (admin)
 */
export async function adminGetClassTeachers(
  classId: string
): Promise<ClassTeacher[]> {
  const json = await apiFetch<ApiResponse<TeachersResponse>>(
    `/v1/admin/classes/${classId}/teachers/`
  );
  if (!json.data) throw new Error("Failed to fetch class teachers");
  return json.data.teachers;
}

/**
 * Assign a teacher to a class (admin)
 */
export async function adminAssignTeacher(
  classId: string,
  data: AssignTeacherInput
): Promise<ClassTeacher[]> {
  const json = await apiFetch<ApiResponse<TeachersResponse>>(
    `/v1/admin/classes/${classId}/teachers/`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!json.data) throw new Error("Failed to assign teacher");
  return json.data.teachers;
}

/**
 * Remove a teacher from a class (admin)
 */
export async function adminRemoveTeacher(
  classId: string,
  teacherId: string
): Promise<ClassTeacher[]> {
  const json = await apiFetch<ApiResponse<TeachersResponse>>(
    `/v1/admin/classes/${classId}/teachers/`,
    {
      method: "DELETE",
      body: JSON.stringify({ teacherId }),
    }
  );
  if (!json.data) throw new Error("Failed to remove teacher");
  return json.data.teachers;
}

/**
 * Update a teacher's role in a class (admin)
 */
export async function adminUpdateTeacherRole(
  classId: string,
  teacherId: string,
  role: ClassTeacherRole
): Promise<ClassTeacher[]> {
  const json = await apiFetch<ApiResponse<TeachersResponse>>(
    `/v1/admin/classes/${classId}/teachers/`,
    {
      method: "PATCH",
      body: JSON.stringify({ teacherId, role }),
    }
  );
  if (!json.data) throw new Error("Failed to update teacher role");
  return json.data.teachers;
}

/**
 * Helper to get the primary teacher from a class
 */
export function getPrimaryTeacher(
  teachers: ClassTeacher[]
): ClassTeacher | undefined {
  return teachers.find((t) => t.role === "primary");
}

/**
 * Helper to get assistant teachers from a class
 */
export function getAssistantTeachers(teachers: ClassTeacher[]): ClassTeacher[] {
  return teachers.filter((t) => t.role === "assistant");
}

/**
 * Helper to format teacher display
 */
export function formatTeachersDisplay(teachers: ClassTeacher[]): string {
  if (!teachers || teachers.length === 0) return "No teachers assigned";

  const primary = getPrimaryTeacher(teachers);
  const assistants = getAssistantTeachers(teachers);

  if (primary) {
    if (assistants.length > 0) {
      return `${primary.teacherName} + ${assistants.length} assistant${assistants.length > 1 ? "s" : ""}`;
    }
    return primary.teacherName;
  }

  if (assistants.length > 0) {
    return `${assistants.length} assistant${assistants.length > 1 ? "s" : ""} (no primary)`;
  }

  return "No teachers assigned";
}
