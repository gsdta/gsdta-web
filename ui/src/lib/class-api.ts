/**
 * Class API - Backward compatible wrappers
 *
 * These wrappers maintain the old function signatures (with getIdToken parameter)
 * but delegate to the shared-core APIs which use the platform adapter for auth.
 */

import {
  adminGetClasses as _adminGetClasses,
  adminGetClassOptions as _adminGetClassOptions,
  adminGetClass as _adminGetClass,
  adminCreateClass as _adminCreateClass,
  adminUpdateClass as _adminUpdateClass,
  adminGetClassTeachers as _adminGetClassTeachers,
  adminAssignTeacher as _adminAssignTeacher,
  adminRemoveTeacher as _adminRemoveTeacher,
  adminUpdateTeacherRole as _adminUpdateTeacherRole,
  getPrimaryTeacher,
  getAssistantTeachers,
  formatTeachersDisplay,
  type ClassTeacherRole,
  type ClassTeacher,
  type ClassOption,
  type AdminClass,
  type CreateClassInput,
  type UpdateClassInput,
  type AssignTeacherInput,
} from "@gsdta/shared-core/api";

// Re-export types and helpers
export {
  getPrimaryTeacher,
  getAssistantTeachers,
  formatTeachersDisplay,
  type ClassTeacherRole,
  type ClassTeacher,
  type ClassOption,
  type CreateClassInput,
  type UpdateClassInput,
  type AssignTeacherInput,
};

// Alias AdminClass as Class for backward compatibility
export type Class = AdminClass;

type TokenGetter = () => Promise<string | null>;

interface ClassesResponse {
  classes: AdminClass[];
  total: number;
}

/**
 * Get all classes (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetClasses(
  _getIdToken: TokenGetter,
  params: { status?: "active" | "inactive" | "all"; gradeId?: string } = {}
): Promise<ClassesResponse> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetClasses(params);
}

/**
 * Get active class options for dropdowns (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetClassOptions(
  _getIdToken: TokenGetter
): Promise<ClassOption[]> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetClassOptions();
}

/**
 * Get a specific class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetClass(
  _getIdToken: TokenGetter,
  classId: string
): Promise<AdminClass> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetClass(classId);
}

/**
 * Create a new class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminCreateClass(
  _getIdToken: TokenGetter,
  data: CreateClassInput
): Promise<AdminClass> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminCreateClass(data);
}

/**
 * Update a class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminUpdateClass(
  _getIdToken: TokenGetter,
  classId: string,
  data: UpdateClassInput
): Promise<AdminClass> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminUpdateClass(classId, data);
}

/**
 * Get teachers assigned to a class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminGetClassTeachers(
  _getIdToken: TokenGetter,
  classId: string
): Promise<ClassTeacher[]> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminGetClassTeachers(classId);
}

/**
 * Assign a teacher to a class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminAssignTeacher(
  _getIdToken: TokenGetter,
  classId: string,
  data: AssignTeacherInput
): Promise<ClassTeacher[]> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminAssignTeacher(classId, data);
}

/**
 * Remove a teacher from a class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminRemoveTeacher(
  _getIdToken: TokenGetter,
  classId: string,
  teacherId: string
): Promise<ClassTeacher[]> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminRemoveTeacher(classId, teacherId);
}

/**
 * Update a teacher's role in a class (admin)
 * @deprecated Use shared-core API directly - getIdToken is no longer needed
 */
export async function adminUpdateTeacherRole(
  _getIdToken: TokenGetter,
  classId: string,
  teacherId: string,
  role: ClassTeacherRole
): Promise<ClassTeacher[]> {
  void _getIdToken; // Backward compatibility - parameter no longer used
  return _adminUpdateTeacherRole(classId, teacherId, role);
}
