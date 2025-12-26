/**
 * Volunteer API - Backward compatible wrappers
 *
 * These wrappers maintain the old function signatures (with getIdToken parameter)
 * but delegate to the shared-core APIs which use the platform adapter for auth.
 */

import {
  adminGetVolunteers as _adminGetVolunteers,
  adminGetVolunteer as _adminGetVolunteer,
  adminCreateVolunteer as _adminCreateVolunteer,
  adminUpdateVolunteer as _adminUpdateVolunteer,
  adminDeleteVolunteer as _adminDeleteVolunteer,
} from "@gsdta/shared-core/api";

import type {
  Volunteer,
  CreateVolunteerInput,
  UpdateVolunteerInput,
  VolunteerListFilters,
  VolunteerListResponse,
} from "./volunteer-types";

type GetIdTokenFn = () => Promise<string | null>;

/**
 * Get all volunteers with optional filters
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetVolunteers(
  _getIdToken: GetIdTokenFn,
  filters: VolunteerListFilters = {}
): Promise<VolunteerListResponse> {
  return _adminGetVolunteers(filters);
}

/**
 * Get a single volunteer by ID
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetVolunteer(
  _getIdToken: GetIdTokenFn,
  id: string
): Promise<Volunteer> {
  return _adminGetVolunteer(id);
}

/**
 * Create a new volunteer
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminCreateVolunteer(
  _getIdToken: GetIdTokenFn,
  input: CreateVolunteerInput
): Promise<Volunteer> {
  return _adminCreateVolunteer(input);
}

/**
 * Update a volunteer
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminUpdateVolunteer(
  _getIdToken: GetIdTokenFn,
  id: string,
  input: UpdateVolunteerInput
): Promise<Volunteer> {
  return _adminUpdateVolunteer(id, input);
}

/**
 * Delete a volunteer (soft delete)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminDeleteVolunteer(
  _getIdToken: GetIdTokenFn,
  id: string
): Promise<void> {
  return _adminDeleteVolunteer(id);
}
