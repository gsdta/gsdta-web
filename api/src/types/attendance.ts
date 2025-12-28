import { Timestamp } from 'firebase-admin/firestore';

/**
 * Attendance status options
 */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

/**
 * Document status for soft delete support
 */
export type AttendanceDocStatus = 'active' | 'deleted';

/**
 * Edit history entry for tracking attendance changes
 */
export interface AttendanceEditHistory {
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  editedBy: string;              // UID of editor
  editedByName: string;          // Name of editor
  editedAt: Timestamp;
  reason?: string;               // Optional reason for edit
}

/**
 * Full Attendance record as stored in Firestore
 */
export interface AttendanceRecord {
  id: string;

  // Session identification
  classId: string;               // Reference to classes collection
  className: string;             // Denormalized for display
  date: string;                  // ISO date format YYYY-MM-DD

  // Student info
  studentId: string;             // Reference to students collection
  studentName: string;           // Denormalized: firstName lastName

  // Attendance details
  status: AttendanceStatus;
  arrivalTime?: string;          // For late arrivals, e.g., "10:15 AM"
  notes?: string;                // Optional teacher notes

  // Teacher who recorded
  recordedBy: string;            // Teacher UID
  recordedByName: string;        // Denormalized teacher name
  recordedAt: Timestamp;         // When attendance was recorded

  // Edit tracking
  lastEditedBy?: string;         // UID of last editor
  lastEditedByName?: string;     // Name of last editor
  lastEditedAt?: Timestamp;      // When last edited
  editHistory?: AttendanceEditHistory[];

  // Document status (for soft delete)
  docStatus: AttendanceDocStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * DTO for creating attendance records (single student)
 */
export interface CreateAttendanceDto {
  studentId: string;
  status: AttendanceStatus;
  arrivalTime?: string;          // Required if status is 'late'
  notes?: string;
}

/**
 * DTO for bulk creating attendance records for a class session
 */
export interface BulkCreateAttendanceDto {
  classId: string;
  date: string;                  // YYYY-MM-DD format
  records: CreateAttendanceDto[];
}

/**
 * DTO for updating an attendance record
 */
export interface UpdateAttendanceDto {
  status?: AttendanceStatus;
  arrivalTime?: string;
  notes?: string;
  editReason?: string;
}

/**
 * Attendance summary for a class session
 */
export interface AttendanceSummary {
  date: string;
  classId: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendanceRate: number;        // Percentage (0-100)
}

/**
 * Attendance query filters
 */
export interface AttendanceFilters {
  classId?: string;
  studentId?: string;
  date?: string;                 // Specific date YYYY-MM-DD
  startDate?: string;            // Range start YYYY-MM-DD
  endDate?: string;              // Range end YYYY-MM-DD
  status?: AttendanceStatus;
  recordedBy?: string;           // Filter by teacher who recorded
  limit?: number;
  offset?: number;
}

/**
 * Attendance list response
 */
export interface AttendanceListResponse {
  records: AttendanceRecord[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Grouped attendance by date for history view
 */
export interface AttendanceByDate {
  date: string;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
}

/**
 * Student attendance summary
 */
export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;        // Percentage (0-100)
}

/**
 * Attendance validation constants
 */
export const ATTENDANCE_CONSTANTS = {
  /** Maximum days in the past that attendance can be edited */
  MAX_EDIT_DAYS: 7,

  /** Valid attendance statuses */
  VALID_STATUSES: ['present', 'absent', 'late', 'excused'] as const,

  /** Date format for attendance records */
  DATE_FORMAT: 'YYYY-MM-DD',

  /** Chronic absentee threshold (below this percentage is concerning) */
  CHRONIC_ABSENTEE_THRESHOLD: 80,
};

// ============================================
// Analytics Types
// ============================================

/**
 * Date range for analytics queries
 */
export interface DateRange {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

/**
 * Analytics summary for a date range
 */
export interface AttendanceAnalytics {
  dateRange: DateRange;
  totalSessions: number;
  totalStudentRecords: number;
  overallStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
  trendData: AttendanceTrendPoint[];
}

/**
 * Data point for attendance trend chart
 */
export interface AttendanceTrendPoint {
  date: string;
  attendanceRate: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

/**
 * Class comparison data
 */
export interface ClassComparison {
  classId: string;
  className: string;
  gradeId?: string;
  gradeName?: string;
  totalSessions: number;
  totalStudents: number;
  stats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
}

/**
 * Chronic absentee (student with attendance below threshold)
 */
export interface ChronicAbsentee {
  studentId: string;
  studentName: string;
  parentEmail?: string;
  classId?: string;
  className?: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  lastAttendedDate?: string;
}

/**
 * Filters for analytics queries
 */
export interface AnalyticsFilters {
  dateRange: DateRange;
  classId?: string;
  gradeId?: string;
}

/**
 * Filters for chronic absentee query
 */
export interface ChronicAbsenteeFilters {
  dateRange: DateRange;
  classId?: string;
  gradeId?: string;
  threshold?: number;  // Default 80%
  limit?: number;
  offset?: number;
}

/**
 * Export format options
 */
export type AttendanceExportFormat = 'csv' | 'json';

/**
 * Export filters
 */
export interface AttendanceExportFilters {
  dateRange: DateRange;
  classId?: string;
  studentId?: string;
  format?: AttendanceExportFormat;
}
