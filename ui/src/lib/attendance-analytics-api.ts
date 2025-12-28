/**
 * Attendance Analytics API client
 */

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AttendanceTrendPoint {
  date: string;
  attendanceRate: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

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

type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Get attendance analytics for a date range
 */
export async function getAttendanceAnalytics(
  getIdToken: TokenGetter,
  params: {
    startDate: string;
    endDate: string;
    classId?: string;
    gradeId?: string;
  }
): Promise<AttendanceAnalytics> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  if (params.classId) queryParams.set('classId', params.classId);
  if (params.gradeId) queryParams.set('gradeId', params.gradeId);

  const res = await fetch(`/api/v1/admin/attendance/analytics/?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<AttendanceAnalytics>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch analytics');
  }

  return json.data!;
}

/**
 * Get class comparison data
 */
export async function getClassComparison(
  getIdToken: TokenGetter,
  params: {
    startDate: string;
    endDate: string;
    gradeId?: string;
  }
): Promise<ClassComparison[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  if (params.gradeId) queryParams.set('gradeId', params.gradeId);

  const res = await fetch(`/api/v1/admin/attendance/comparison/?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<{ comparisons: ClassComparison[] }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch comparison');
  }

  return json.data!.comparisons;
}

/**
 * Get chronic absentees
 */
export async function getChronicAbsentees(
  getIdToken: TokenGetter,
  params: {
    startDate: string;
    endDate: string;
    classId?: string;
    gradeId?: string;
    threshold?: number;
    limit?: number;
    offset?: number;
  }
): Promise<{ absentees: ChronicAbsentee[]; total: number }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  if (params.classId) queryParams.set('classId', params.classId);
  if (params.gradeId) queryParams.set('gradeId', params.gradeId);
  if (params.threshold) queryParams.set('threshold', params.threshold.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  const res = await fetch(`/api/v1/admin/attendance/chronic-absentees/?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<{ absentees: ChronicAbsentee[]; total: number }>;

  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch chronic absentees');
  }

  return json.data!;
}

/**
 * Export attendance data as CSV
 */
export async function exportAttendanceCSV(
  getIdToken: TokenGetter,
  params: {
    startDate: string;
    endDate: string;
    classId?: string;
    studentId?: string;
  }
): Promise<Blob> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const queryParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    format: 'csv',
  });
  if (params.classId) queryParams.set('classId', params.classId);
  if (params.studentId) queryParams.set('studentId', params.studentId);

  const res = await fetch(`/api/v1/admin/attendance/export/?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || 'Failed to export attendance');
  }

  return res.blob();
}
