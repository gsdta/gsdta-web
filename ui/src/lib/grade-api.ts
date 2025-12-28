/**
 * Grade API - Backward compatible wrappers
 *
 * These wrappers maintain the old function signatures (with getIdToken parameter)
 * but delegate to the shared-core APIs which use the platform adapter for auth.
 */

import {
  adminGetGrades as _adminGetGrades,
  adminGetGradeOptions as _adminGetGradeOptions,
  adminGetGrade as _adminGetGrade,
  adminCreateGrade as _adminCreateGrade,
  adminUpdateGrade as _adminUpdateGrade,
  adminSeedGrades as _adminSeedGrades,
  adminCheckGradesSeeded as _adminCheckGradesSeeded,
} from "@gsdta/shared-core/api";

import type {
  Grade,
  GradeOption,
  CreateGradeInput,
  UpdateGradeInput,
  GradesResponse,
  SeedGradesResponse,
  GradeStatus,
} from "./grade-types";

type TokenGetter = () => Promise<string | null>;

/**
 * Get all grades (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetGrades(
  _getIdToken: TokenGetter,
  params: { status?: GradeStatus | "all" } = {}
): Promise<GradesResponse> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetGrades(params);
}

/**
 * Get active grade options for dropdowns (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetGradeOptions(
  _getIdToken: TokenGetter
): Promise<GradeOption[]> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetGradeOptions();
}

/**
 * Get a single grade by ID (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetGrade(
  _getIdToken: TokenGetter,
  gradeId: string
): Promise<Grade> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetGrade(gradeId);
}

/**
 * Create a new grade (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminCreateGrade(
  _getIdToken: TokenGetter,
  data: CreateGradeInput
): Promise<Grade> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminCreateGrade(data);
}

/**
 * Update a grade (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminUpdateGrade(
  _getIdToken: TokenGetter,
  gradeId: string,
  data: UpdateGradeInput
): Promise<Grade> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminUpdateGrade(gradeId, data);
}

/**
 * Seed default grades (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminSeedGrades(
  _getIdToken: TokenGetter
): Promise<SeedGradesResponse> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminSeedGrades();
}

/**
 * Check if grades have been seeded (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminCheckGradesSeeded(
  _getIdToken: TokenGetter
): Promise<boolean> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminCheckGradesSeeded();
}
