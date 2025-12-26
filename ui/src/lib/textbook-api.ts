/**
 * Textbook API - Backward compatible wrappers
 *
 * These wrappers maintain the old function signatures (with getIdToken parameter)
 * but delegate to the shared-core APIs which use the platform adapter for auth.
 */

import {
  adminGetTextbooks as _adminGetTextbooks,
  adminGetTextbook as _adminGetTextbook,
  adminCreateTextbook as _adminCreateTextbook,
  adminUpdateTextbook as _adminUpdateTextbook,
  adminDeleteTextbook as _adminDeleteTextbook,
} from "@gsdta/shared-core/api";

import type {
  Textbook,
  CreateTextbookInput,
  UpdateTextbookInput,
  TextbookListFilters,
  TextbookListResponse,
} from "./textbook-types";

type GetIdTokenFn = () => Promise<string | null>;

/**
 * Get all textbooks with optional filters
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetTextbooks(
  _getIdToken: GetIdTokenFn,
  filters: TextbookListFilters = {}
): Promise<TextbookListResponse> {
  return _adminGetTextbooks(filters);
}

/**
 * Get a single textbook by ID
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetTextbook(
  _getIdToken: GetIdTokenFn,
  id: string
): Promise<Textbook> {
  return _adminGetTextbook(id);
}

/**
 * Create a new textbook
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminCreateTextbook(
  _getIdToken: GetIdTokenFn,
  input: CreateTextbookInput
): Promise<Textbook> {
  return _adminCreateTextbook(input);
}

/**
 * Update a textbook
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminUpdateTextbook(
  _getIdToken: GetIdTokenFn,
  id: string,
  input: UpdateTextbookInput
): Promise<Textbook> {
  return _adminUpdateTextbook(id, input);
}

/**
 * Delete a textbook (soft delete)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminDeleteTextbook(
  _getIdToken: GetIdTokenFn,
  id: string
): Promise<void> {
  return _adminDeleteTextbook(id);
}
