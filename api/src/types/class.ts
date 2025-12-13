import { Timestamp } from 'firebase-admin/firestore';

/**
 * Tamil proficiency levels for classes (LEGACY - use gradeId instead)
 * @deprecated Use gradeId field instead
 */
export type TamilLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * Class status
 */
export type ClassStatus = 'active' | 'inactive';

/**
 * Teacher role within a class
 */
export type ClassTeacherRole = 'primary' | 'assistant';

/**
 * Teacher assignment within a class
 */
export interface ClassTeacher {
  teacherId: string;                // Teacher's user UID
  teacherName: string;              // Denormalized teacher name
  teacherEmail?: string;            // Denormalized teacher email
  role: ClassTeacherRole;           // Role in class (primary or assistant)
  assignedAt: Timestamp;            // When assigned
  assignedBy: string;               // Admin UID who assigned
}

/**
 * Full Class record as stored in Firestore
 */
export interface Class {
  id: string;
  name: string;                     // e.g., "PS-1 Class A - Saturday 10AM"

  // Grade reference (replaces level)
  gradeId: string;                  // Reference to grades collection (e.g., "ps-1", "grade-5")
  gradeName?: string;               // Denormalized grade name for display

  day: string;                      // e.g., "Saturday"
  time: string;                     // e.g., "10:00 AM - 12:00 PM"
  capacity: number;                 // Max students
  enrolled: number;                 // Current count (denormalized)

  // Multiple teacher assignments
  teachers: ClassTeacher[];         // Array of teacher assignments

  // Legacy fields - kept for backward compatibility
  /** @deprecated Use gradeId instead */
  level?: TamilLevel;               // LEGACY: Proficiency level
  /** @deprecated Use teachers array instead */
  teacherId?: string;               // LEGACY: Single assigned teacher UID
  /** @deprecated Use teachers array instead */
  teacherName?: string;             // LEGACY: Denormalized teacher name

  // Status
  status: ClassStatus;
  academicYear?: string;            // e.g., "2024-2025"

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DTO for creating a new class
 */
export interface CreateClassDto {
  name: string;
  gradeId: string;                  // Reference to grades collection
  day: string;
  time: string;
  capacity: number;
  academicYear?: string;
  // Teachers are assigned separately after creation via teacher assignment endpoint
}

/**
 * DTO for updating a class
 */
export interface UpdateClassDto {
  name?: string;
  gradeId?: string;
  day?: string;
  time?: string;
  capacity?: number;
  status?: ClassStatus;
  academicYear?: string;
}

/**
 * DTO for assigning a teacher to a class
 */
export interface AssignTeacherDto {
  teacherId: string;
  role: ClassTeacherRole;
}

/**
 * DTO for removing a teacher from a class
 */
export interface RemoveTeacherDto {
  teacherId: string;
}

/**
 * DTO for updating a teacher's role in a class
 */
export interface UpdateTeacherRoleDto {
  role: ClassTeacherRole;
}

/**
 * Class list query filters
 */
export interface ClassListFilters {
  status?: ClassStatus | 'all';
  gradeId?: string;                 // Filter by grade
  teacherId?: string;               // Filter by assigned teacher
  limit?: number;
  offset?: number;
}

/**
 * Class list response
 */
export interface ClassListResponse {
  classes: Class[];
  total: number;
}

/**
 * Simplified class view for dropdowns/selection
 */
export interface ClassOption {
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  available: number;                // Computed: capacity - enrolled
  status: ClassStatus;
  teachers: ClassTeacher[];
}
