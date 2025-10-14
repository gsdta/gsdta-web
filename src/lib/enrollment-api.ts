import type { Enrollment, EnrollmentWithDetails, Class } from "./enrollment-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function getClasses(): Promise<Class[]> {
  const res = await fetch(`${BASE_URL}/classes`);
  if (!res.ok) throw new Error("Failed to fetch classes");
  return res.json();
}

export async function getEnrollments(params?: {
  status?: string;
  studentId?: string;
}): Promise<EnrollmentWithDetails[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.studentId) query.set("studentId", params.studentId);
  const res = await fetch(`${BASE_URL}/enrollments?${query}`);
  if (!res.ok) throw new Error("Failed to fetch enrollments");
  return res.json();
}

export async function createEnrollment(data: {
  studentId: string;
  classId: string;
  notes?: string;
}): Promise<Enrollment> {
  const res = await fetch(`${BASE_URL}/enrollments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create enrollment" }));
    throw new Error(error.message);
  }
  return res.json();
}

export async function updateEnrollmentStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<Enrollment> {
  const res = await fetch(`${BASE_URL}/enrollments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error("Failed to update enrollment");
  return res.json();
}
