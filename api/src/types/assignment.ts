import { Timestamp } from 'firebase-admin/firestore';

/**
 * Assignment type options
 */
export type AssignmentType = 'homework' | 'quiz' | 'test' | 'project' | 'classwork' | 'participation';

/**
 * Assignment status
 */
export type AssignmentStatus = 'draft' | 'published' | 'closed';

/**
 * Document status for soft delete support
 */
export type AssignmentDocStatus = 'active' | 'deleted';

/**
 * Full Assignment record as stored in Firestore
 */
export interface Assignment {
  id: string;

  // Class reference
  classId: string;               // Reference to classes collection
  className: string;             // Denormalized for display
  gradeId?: string;              // Reference to grades collection
  gradeName?: string;            // Denormalized grade name

  // Assignment details
  title: string;
  description?: string;
  type: AssignmentType;
  status: AssignmentStatus;

  // Points/scoring
  maxPoints: number;             // Maximum points possible (e.g., 100)
  weight?: number;               // Optional weight for weighted averages (default: 1)

  // Dates
  assignedDate: string;          // When assignment was given (YYYY-MM-DD)
  dueDate: string;               // When assignment is due (YYYY-MM-DD)

  // Teacher who created
  createdBy: string;             // Teacher UID
  createdByName: string;         // Denormalized teacher name

  // Edit tracking
  updatedBy?: string;            // UID of last editor
  updatedByName?: string;        // Name of last editor

  // Document status (for soft delete)
  docStatus: AssignmentDocStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DTO for creating an assignment
 */
export interface CreateAssignmentDto {
  classId: string;
  title: string;
  description?: string;
  type: AssignmentType;
  maxPoints: number;
  weight?: number;
  assignedDate: string;          // YYYY-MM-DD
  dueDate: string;               // YYYY-MM-DD
  status?: AssignmentStatus;     // Defaults to 'draft'
}

/**
 * DTO for updating an assignment
 */
export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  type?: AssignmentType;
  maxPoints?: number;
  weight?: number;
  assignedDate?: string;
  dueDate?: string;
  status?: AssignmentStatus;
}

/**
 * Assignment list response
 */
export interface AssignmentListResponse {
  assignments: Assignment[];
  total: number;
}

/**
 * Assignment query filters
 */
export interface AssignmentFilters {
  classId?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
  startDate?: string;            // Filter by assignedDate >= startDate
  endDate?: string;              // Filter by dueDate <= endDate
  limit?: number;
  offset?: number;
}

/**
 * Assignment summary with grade statistics
 */
export interface AssignmentSummary {
  assignment: Assignment;
  stats: {
    totalStudents: number;
    gradedCount: number;
    averageScore: number;        // Average points earned
    averagePercentage: number;   // Average as percentage
    highScore: number;
    lowScore: number;
  };
}

/**
 * Assignment type display names
 */
export const ASSIGNMENT_TYPE_NAMES: Record<AssignmentType, string> = {
  homework: 'Homework',
  quiz: 'Quiz',
  test: 'Test',
  project: 'Project',
  classwork: 'Classwork',
  participation: 'Participation',
};

/**
 * Assignment validation constants
 */
export const ASSIGNMENT_CONSTANTS = {
  /** Valid assignment types */
  VALID_TYPES: ['homework', 'quiz', 'test', 'project', 'classwork', 'participation'] as const,

  /** Valid statuses */
  VALID_STATUSES: ['draft', 'published', 'closed'] as const,

  /** Maximum points limits */
  MIN_POINTS: 1,
  MAX_POINTS: 1000,

  /** Default weight */
  DEFAULT_WEIGHT: 1,
};
