/**
 * Parent API
 *
 * Platform-agnostic profile and linked students management.
 */

import type {
  ProfileResponse,
  ProfileUpdatePayload,
  StudentsResponse,
  LinkedStudent,
} from "../types/parent";
import { apiFetch } from "./client";

/**
 * Get the authenticated user's profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/v1/me/");
}

/**
 * Update the authenticated user's profile
 */
export async function updateProfile(
  data: ProfileUpdatePayload
): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>("/v1/me/", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Get students linked to the authenticated user
 */
export async function getLinkedStudents(): Promise<LinkedStudent[]> {
  const data = await apiFetch<StudentsResponse>("/v1/me/students/");
  return data.data?.students || [];
}
