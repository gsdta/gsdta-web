/**
 * Textbook API
 *
 * Platform-agnostic textbook management functions.
 */

import type {
  Textbook,
  CreateTextbookInput,
  UpdateTextbookInput,
  TextbookListFilters,
  TextbookListResponse,
} from "../types/textbook";
import { apiFetch } from "./client";

interface ApiDataResponse<T> {
  data: T;
}

/**
 * Get all textbooks with optional filters
 */
export async function adminGetTextbooks(
  filters: TextbookListFilters = {}
): Promise<TextbookListResponse> {
  const params = new URLSearchParams();
  if (filters.gradeId) params.append("gradeId", filters.gradeId);
  if (filters.type) params.append("type", filters.type);
  if (filters.academicYear) params.append("academicYear", filters.academicYear);
  if (filters.status) params.append("status", filters.status);
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.offset) params.append("offset", String(filters.offset));

  const qs = params.toString();
  const path = `/v1/admin/textbooks/${qs ? `?${qs}` : ""}`;

  const json = await apiFetch<ApiDataResponse<TextbookListResponse>>(path);
  return json.data;
}

/**
 * Get a single textbook by ID
 */
export async function adminGetTextbook(id: string): Promise<Textbook> {
  const json = await apiFetch<ApiDataResponse<{ textbook: Textbook }>>(
    `/v1/admin/textbooks/${id}/`
  );
  return json.data.textbook;
}

/**
 * Create a new textbook
 */
export async function adminCreateTextbook(
  input: CreateTextbookInput
): Promise<Textbook> {
  const json = await apiFetch<ApiDataResponse<{ textbook: Textbook }>>(
    "/v1/admin/textbooks/",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return json.data.textbook;
}

/**
 * Update a textbook
 */
export async function adminUpdateTextbook(
  id: string,
  input: UpdateTextbookInput
): Promise<Textbook> {
  const json = await apiFetch<ApiDataResponse<{ textbook: Textbook }>>(
    `/v1/admin/textbooks/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return json.data.textbook;
}

/**
 * Delete a textbook (soft delete)
 */
export async function adminDeleteTextbook(id: string): Promise<void> {
  await apiFetch<void>(`/v1/admin/textbooks/${id}/`, {
    method: "DELETE",
  });
}
