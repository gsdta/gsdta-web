/**
 * Parent API - Backward compatible wrappers
 *
 * These wrappers maintain the old function signatures (with getIdToken parameter)
 * but delegate to the shared-core APIs which use the platform adapter for auth.
 */

import {
  getProfile as _getProfile,
  updateProfile as _updateProfile,
  getLinkedStudents as _getLinkedStudents,
} from "@gsdta/shared-core/api";

import type {
  ProfileResponse,
  ProfileUpdatePayload,
  LinkedStudent,
} from "./parent-types";

type TokenGetter = () => Promise<string | null>;

/**
 * Get the authenticated user's profile
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function getProfile(
  _getIdToken: TokenGetter
): Promise<ProfileResponse> {
  return _getProfile();
}

/**
 * Update the authenticated user's profile
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function updateProfile(
  _getIdToken: TokenGetter,
  data: ProfileUpdatePayload
): Promise<ProfileResponse> {
  return _updateProfile(data);
}

/**
 * Get students linked to the authenticated user
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function getLinkedStudents(
  _getIdToken: TokenGetter
): Promise<LinkedStudent[]> {
  return _getLinkedStudents();
}
