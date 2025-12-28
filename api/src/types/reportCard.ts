import { Timestamp } from 'firebase-admin/firestore';

/**
 * Report card status
 */
export type ReportCardStatus = 'draft' | 'published';

/**
 * Document status for soft delete support
 */
export type ReportCardDocStatus = 'active' | 'deleted';

/**
 * Academic term/period for report card
 */
export type AcademicTerm = 'semester1' | 'semester2' | 'annual';

/**
 * Grade breakdown by assignment type
 */
export interface GradeBreakdown {
  homework: { points: number; maxPoints: number; percentage: number; count: number };
  quiz: { points: number; maxPoints: number; percentage: number; count: number };
  test: { points: number; maxPoints: number; percentage: number; count: number };
  project: { points: number; maxPoints: number; percentage: number; count: number };
  classwork: { points: number; maxPoints: number; percentage: number; count: number };
  participation: { points: number; maxPoints: number; percentage: number; count: number };
}

/**
 * Attendance summary for report card
 */
export interface AttendanceSummaryForReport {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;        // Percentage
}

/**
 * Full ReportCard record as stored in Firestore
 */
export interface ReportCard {
  id: string;

  // Student reference
  studentId: string;             // Reference to students collection
  studentName: string;           // Denormalized for display
  parentId: string;              // Parent UID for access control

  // Class reference
  classId: string;               // Reference to classes collection
  className: string;             // Denormalized for display
  gradeId?: string;              // Reference to grades collection
  gradeName?: string;            // Denormalized grade name

  // Term/period
  term: AcademicTerm;
  academicYear: string;          // e.g., "2024-2025"

  // Overall grade
  overallPercentage: number;     // Calculated average
  letterGrade: string;           // A, B, C, D, F
  totalPoints: number;           // Sum of all points earned
  maxPoints: number;             // Sum of all max points

  // Breakdown by assignment type
  gradeBreakdown: GradeBreakdown;

  // Attendance
  attendance: AttendanceSummaryForReport;

  // Comments
  teacherComments?: string;      // Teacher's written comments
  conductGrade?: string;         // Optional conduct/behavior grade

  // Status
  status: ReportCardStatus;
  publishedAt?: Timestamp;       // When report was published to parent

  // Teacher who generated
  generatedBy: string;           // Teacher UID
  generatedByName: string;       // Denormalized teacher name

  // Edit tracking
  updatedBy?: string;            // UID of last editor
  updatedByName?: string;        // Name of last editor

  // Document status (for soft delete)
  docStatus: ReportCardDocStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DTO for generating a report card
 */
export interface GenerateReportCardDto {
  classId: string;
  studentId: string;
  term: AcademicTerm;
  academicYear: string;
  teacherComments?: string;
  conductGrade?: string;
}

/**
 * DTO for bulk generating report cards for a class
 */
export interface BulkGenerateReportCardDto {
  classId: string;
  term: AcademicTerm;
  academicYear: string;
  studentIds?: string[];         // Optional: specific students, otherwise all in class
}

/**
 * DTO for updating a report card
 */
export interface UpdateReportCardDto {
  teacherComments?: string;
  conductGrade?: string;
  status?: ReportCardStatus;
}

/**
 * Report card list response
 */
export interface ReportCardListResponse {
  reportCards: ReportCard[];
  total: number;
}

/**
 * Report card query filters
 */
export interface ReportCardFilters {
  classId?: string;
  studentId?: string;
  term?: AcademicTerm;
  academicYear?: string;
  status?: ReportCardStatus;
  limit?: number;
  offset?: number;
}

/**
 * Report card summary for parent view
 */
export interface ReportCardSummary {
  id: string;
  className: string;
  gradeName?: string;
  term: AcademicTerm;
  academicYear: string;
  letterGrade: string;
  overallPercentage: number;
  status: ReportCardStatus;
  publishedAt?: Timestamp;
}

/**
 * Term display names
 */
export const TERM_NAMES: Record<AcademicTerm, string> = {
  semester1: 'Semester 1',
  semester2: 'Semester 2',
  annual: 'Annual',
};

/**
 * Report card validation constants
 */
export const REPORT_CARD_CONSTANTS = {
  /** Valid terms */
  VALID_TERMS: ['semester1', 'semester2', 'annual'] as const,

  /** Valid statuses */
  VALID_STATUSES: ['draft', 'published'] as const,

  /** Conduct grade options */
  CONDUCT_GRADES: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'] as const,
};
