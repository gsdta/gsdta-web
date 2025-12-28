import { Timestamp } from 'firebase-admin/firestore';

/**
 * Document status for soft delete support
 */
export type GradeDocStatus = 'active' | 'deleted';

/**
 * Edit history entry for tracking grade changes
 */
export interface GradeEditHistory {
  previousPoints: number;
  newPoints: number;
  editedBy: string;              // UID of editor
  editedByName: string;          // Name of editor
  editedAt: Timestamp;
  reason?: string;               // Optional reason for edit
}

/**
 * Full StudentGrade record as stored in Firestore
 */
export interface StudentGrade {
  id: string;

  // References
  assignmentId: string;          // Reference to assignments collection
  assignmentTitle: string;       // Denormalized for display
  classId: string;               // Reference to classes collection
  className: string;             // Denormalized for display
  studentId: string;             // Reference to students collection
  studentName: string;           // Denormalized: firstName lastName

  // Grade details
  pointsEarned: number;          // Points earned
  maxPoints: number;             // Max points (from assignment)
  percentage: number;            // Calculated: (pointsEarned / maxPoints) * 100
  letterGrade?: string;          // Optional letter grade (A, B, C, D, F)

  // Feedback
  feedback?: string;             // Teacher feedback/comments
  submittedAt?: Timestamp;       // When student submitted (if applicable)
  gradedAt: Timestamp;           // When teacher graded

  // Teacher who graded
  gradedBy: string;              // Teacher UID
  gradedByName: string;          // Denormalized teacher name

  // Edit tracking
  lastEditedBy?: string;         // UID of last editor
  lastEditedByName?: string;     // Name of last editor
  lastEditedAt?: Timestamp;      // When last edited
  editHistory?: GradeEditHistory[];

  // Document status (for soft delete)
  docStatus: GradeDocStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DTO for creating/updating a grade
 */
export interface CreateGradeDto {
  studentId: string;
  pointsEarned: number;
  feedback?: string;
}

/**
 * DTO for bulk grading (grade multiple students for one assignment)
 */
export interface BulkGradeDto {
  grades: CreateGradeDto[];
}

/**
 * DTO for updating a grade
 */
export interface UpdateGradeDto {
  pointsEarned?: number;
  feedback?: string;
  editReason?: string;
}

/**
 * Grade list response
 */
export interface GradeListResponse {
  grades: StudentGrade[];
  total: number;
}

/**
 * Grade query filters
 */
export interface GradeFilters {
  assignmentId?: string;
  studentId?: string;
  classId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Gradebook row (student with all their grades)
 */
export interface GradebookRow {
  studentId: string;
  studentName: string;
  grades: Record<string, StudentGrade | null>;  // assignmentId -> grade (null if not graded)
  averagePercentage: number;     // Current average across all graded assignments
  letterGrade: string;           // Calculated letter grade
  totalPoints: number;           // Sum of points earned
  maxPoints: number;             // Sum of max points (for graded assignments only)
}

/**
 * Full gradebook view for a class
 */
export interface GradebookView {
  classId: string;
  className: string;
  assignments: {
    id: string;
    title: string;
    type: string;
    maxPoints: number;
    dueDate: string;
  }[];
  students: GradebookRow[];
  classAverage: number;          // Class average percentage
}

/**
 * Letter grade calculation helper
 */
export function calculateLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Grade validation constants
 */
export const GRADE_CONSTANTS = {
  /** Letter grade thresholds */
  GRADE_THRESHOLDS: {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
    F: 0,
  },

  /** Maximum edit history entries to keep */
  MAX_EDIT_HISTORY: 50,
};
