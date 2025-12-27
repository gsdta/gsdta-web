/**
 * Volunteer API
 *
 * Platform-agnostic volunteer management functions.
 */

import type {
  Volunteer,
  CreateVolunteerInput,
  UpdateVolunteerInput,
  VolunteerListFilters,
  VolunteerListResponse,
} from "../types/volunteer";
import { apiFetch } from "./client";

interface ApiDataResponse<T> {
  data: T;
}

/**
 * Get all volunteers with optional filters
 */
export async function adminGetVolunteers(
  filters: VolunteerListFilters = {}
): Promise<VolunteerListResponse> {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.status) params.append("status", filters.status);
  if (filters.classId) params.append("classId", filters.classId);
  if (filters.academicYear) params.append("academicYear", filters.academicYear);
  if (filters.search) params.append("search", filters.search);
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.offset) params.append("offset", String(filters.offset));

  const qs = params.toString();
  const path = `/v1/admin/volunteers/${qs ? `?${qs}` : ""}`;

  const json = await apiFetch<ApiDataResponse<VolunteerListResponse>>(path);
  return json.data;
}

/**
 * Get a single volunteer by ID
 */
export async function adminGetVolunteer(id: string): Promise<Volunteer> {
  const json = await apiFetch<ApiDataResponse<{ volunteer: Volunteer }>>(
    `/v1/admin/volunteers/${id}/`
  );
  return json.data.volunteer;
}

/**
 * Create a new volunteer
 */
export async function adminCreateVolunteer(
  input: CreateVolunteerInput
): Promise<Volunteer> {
  const json = await apiFetch<ApiDataResponse<{ volunteer: Volunteer }>>(
    "/v1/admin/volunteers/",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return json.data.volunteer;
}

/**
 * Update a volunteer
 */
export async function adminUpdateVolunteer(
  id: string,
  input: UpdateVolunteerInput
): Promise<Volunteer> {
  const json = await apiFetch<ApiDataResponse<{ volunteer: Volunteer }>>(
    `/v1/admin/volunteers/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return json.data.volunteer;
}

/**
 * Delete a volunteer (soft delete)
 */
export async function adminDeleteVolunteer(id: string): Promise<void> {
  await apiFetch<void>(`/v1/admin/volunteers/${id}/`, {
    method: "DELETE",
  });
}
