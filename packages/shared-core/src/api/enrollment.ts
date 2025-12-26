/**
 * Enrollment API
 *
 * Platform-agnostic enrollment management functions.
 */

import type {
  Enrollment,
  EnrollmentWithDetails,
  Class,
} from "../types/enrollment";
import { apiFetch } from "./client";

/**
 * Get all classes
 */
export async function getClasses(): Promise<Class[]> {
  return apiFetch<Class[]>(`/v1/classes/`);
}

/**
 * Get enrollments with optional filters
 */
export async function getEnrollments(params?: {
  status?: string;
  studentId?: string;
}): Promise<EnrollmentWithDetails[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.studentId) query.set("studentId", params.studentId);
  const qs = query.toString();
  return apiFetch<EnrollmentWithDetails[]>(
    `/v1/enrollments/${qs ? `?${qs}` : ""}`
  );
}

/**
 * Create a new enrollment
 */
export async function createEnrollment(data: {
  studentId: string;
  classId: string;
  notes?: string;
}): Promise<Enrollment> {
  return apiFetch<Enrollment>(`/v1/enrollments/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update enrollment status
 */
export async function updateEnrollmentStatus(
  id: string,
  status: string,
  notes?: string
): Promise<Enrollment> {
  return apiFetch<Enrollment>(`/v1/enrollments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}
