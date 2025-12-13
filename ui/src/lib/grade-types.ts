/**
 * Grade status
 */
export type GradeStatus = 'active' | 'inactive';

/**
 * Full Grade record
 */
export interface Grade {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
  status: GradeStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Grade option for dropdowns
 */
export interface GradeOption {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
}

/**
 * Input for creating a grade
 */
export interface CreateGradeInput {
  id: string;
  name: string;
  displayName: string;
  displayOrder: number;
}

/**
 * Input for updating a grade
 */
export interface UpdateGradeInput {
  name?: string;
  displayName?: string;
  displayOrder?: number;
  status?: GradeStatus;
}

/**
 * Grades list response
 */
export interface GradesResponse {
  grades: Grade[];
  total: number;
}

/**
 * Seed grades response
 */
export interface SeedGradesResponse {
  message: string;
  created: number;
  skipped: number;
}
