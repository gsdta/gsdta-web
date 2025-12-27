/**
 * Grade API
 *
 * Platform-agnostic grade management functions.
 */

import type {
  Grade,
  GradeOption,
  CreateGradeInput,
  UpdateGradeInput,
  GradesResponse,
  SeedGradesResponse,
  GradeStatus,
} from "../types/grade";
import { apiFetch, type ApiResponse } from "./client";

/**
 * Get all grades (admin)
 */
export async function adminGetGrades(
  params: { status?: GradeStatus | "all" } = {}
): Promise<GradesResponse> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set("status", params.status);

  const qs = queryParams.toString();
  const path = `/v1/admin/grades/${qs ? "?" + qs : ""}`;

  const json = await apiFetch<ApiResponse<GradesResponse>>(path);
  if (!json.data) throw new Error("Failed to fetch grades");
  return json.data;
}

/**
 * Get active grade options for dropdowns (admin)
 */
export async function adminGetGradeOptions(): Promise<GradeOption[]> {
  const result = await adminGetGrades({ status: "active" });
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
export async function adminGetGrade(gradeId: string): Promise<Grade> {
  const json = await apiFetch<ApiResponse<{ grade: Grade }>>(
    `/v1/admin/grades/${gradeId}/`
  );
  if (!json.data) throw new Error("Failed to fetch grade");
  return json.data.grade;
}

/**
 * Create a new grade (admin)
 */
export async function adminCreateGrade(data: CreateGradeInput): Promise<Grade> {
  const json = await apiFetch<ApiResponse<{ grade: Grade }>>(
    "/v1/admin/grades/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!json.data) throw new Error("Failed to create grade");
  return json.data.grade;
}

/**
 * Update a grade (admin)
 */
export async function adminUpdateGrade(
  gradeId: string,
  data: UpdateGradeInput
): Promise<Grade> {
  const json = await apiFetch<ApiResponse<{ grade: Grade }>>(
    `/v1/admin/grades/${gradeId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
  if (!json.data) throw new Error("Failed to update grade");
  return json.data.grade;
}

/**
 * Seed default grades (admin)
 */
export async function adminSeedGrades(): Promise<SeedGradesResponse> {
  const json = await apiFetch<ApiResponse<SeedGradesResponse>>(
    "/v1/admin/grades/seed/",
    {
      method: "POST",
    }
  );
  if (!json.data) throw new Error("Failed to seed grades");
  return json.data;
}

/**
 * Check if grades have been seeded (admin)
 */
export async function adminCheckGradesSeeded(): Promise<boolean> {
  const json = await apiFetch<ApiResponse<{ seeded: boolean }>>(
    "/v1/admin/grades/seed/"
  );
  if (!json.data) throw new Error("Failed to check seed status");
  return json.data.seeded;
}
