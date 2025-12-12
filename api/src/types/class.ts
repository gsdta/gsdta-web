import { Timestamp } from 'firebase-admin/firestore';

/**
 * Tamil proficiency levels for classes
 */
export type TamilLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * Class status
 */
export type ClassStatus = 'active' | 'inactive';

/**
 * Full Class record as stored in Firestore
 */
export interface Class {
  id: string;
  name: string;                     // e.g., "Tamil Beginners - Saturday 10AM"
  level: TamilLevel;                // Proficiency level
  day: string;                      // e.g., "Saturday"
  time: string;                     // e.g., "10:00 AM - 12:00 PM"
  capacity: number;                 // Max students
  enrolled: number;                 // Current count (denormalized)

  // Teacher assignment
  teacherId?: string;               // Assigned teacher UID
  teacherName?: string;             // Denormalized teacher name

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
  level: TamilLevel;
  day: string;
  time: string;
  capacity: number;
  teacherId?: string;
  teacherName?: string;
  academicYear?: string;
}

/**
 * DTO for updating a class
 */
export interface UpdateClassDto {
  name?: string;
  level?: TamilLevel;
  day?: string;
  time?: string;
  capacity?: number;
  teacherId?: string;
  teacherName?: string;
  status?: ClassStatus;
  academicYear?: string;
}

/**
 * Class list query filters
 */
export interface ClassListFilters {
  status?: ClassStatus | 'all';
  level?: TamilLevel;
  teacherId?: string;
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
  level: TamilLevel;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  available: number;                // Computed: capacity - enrolled
  status: ClassStatus;
}
