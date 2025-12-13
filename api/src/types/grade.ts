import { Timestamp } from 'firebase-admin/firestore';

/**
 * Grade status
 */
export type GradeStatus = 'active' | 'inactive';

/**
 * Full Grade record as stored in Firestore
 */
export interface Grade {
  id: string;                     // Custom ID matching textbooks (e.g., "ps-1", "grade-5")
  name: string;                   // Short name (e.g., "PS-1", "Grade-5")
  displayName: string;            // Full display name (e.g., "Pre-School 1", "Grade 5")
  displayOrder: number;           // Sorting order (1-11)
  status: GradeStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;             // Admin UID who created
}

/**
 * DTO for creating a new grade
 */
export interface CreateGradeDto {
  id: string;                     // Custom ID to match textbooks
  name: string;
  displayName: string;
  displayOrder: number;
}

/**
 * DTO for updating a grade
 */
export interface UpdateGradeDto {
  name?: string;
  displayName?: string;
  displayOrder?: number;
  status?: GradeStatus;
}

/**
 * Grade list query filters
 */
export interface GradeListFilters {
  status?: GradeStatus | 'all';
}

/**
 * Grade list response
 */
export interface GradeListResponse {
  grades: Grade[];
  total: number;
}

/**
 * Simplified grade view for dropdowns/selection
 */
export interface GradeOption {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
}

/**
 * Default grades matching textbooks.ts structure
 * Used for seeding the grades collection
 */
export const DEFAULT_GRADES: Omit<Grade, 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  { id: 'ps-1', name: 'PS-1', displayName: 'Pre-School 1', displayOrder: 1, status: 'active' },
  { id: 'ps-2', name: 'PS-2', displayName: 'Pre-School 2', displayOrder: 2, status: 'active' },
  { id: 'kg', name: 'KG', displayName: 'Kindergarten', displayOrder: 3, status: 'active' },
  { id: 'grade-1', name: 'Grade-1', displayName: 'Grade 1', displayOrder: 4, status: 'active' },
  { id: 'grade-2', name: 'Grade-2', displayName: 'Grade 2', displayOrder: 5, status: 'active' },
  { id: 'grade-3', name: 'Grade-3', displayName: 'Grade 3', displayOrder: 6, status: 'active' },
  { id: 'grade-4', name: 'Grade-4', displayName: 'Grade 4', displayOrder: 7, status: 'active' },
  { id: 'grade-5', name: 'Grade-5', displayName: 'Grade 5', displayOrder: 8, status: 'active' },
  { id: 'grade-6', name: 'Grade-6', displayName: 'Grade 6', displayOrder: 9, status: 'active' },
  { id: 'grade-7', name: 'Grade-7', displayName: 'Grade 7', displayOrder: 10, status: 'active' },
  { id: 'grade-8', name: 'Grade-8', displayName: 'Grade 8', displayOrder: 11, status: 'active' },
];
