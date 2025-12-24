type TokenGetter = () => Promise<string | null>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================================================
// Teacher's Classes
// ============================================================================

export interface TeacherClass {
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  academicYear?: string;
  status: string;
  myRole: 'primary' | 'assistant' | null;
}

interface TeacherClassesResponse {
  classes: TeacherClass[];
  total: number;
}

/**
 * Get classes assigned to the authenticated teacher
 */
export async function teacherGetClasses(getIdToken: TokenGetter): Promise<TeacherClass[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/v1/teacher/classes', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<TeacherClassesResponse>;

  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to fetch classes');
  }

  return json.data!.classes;
}

// ============================================================================
// Class Roster
// ============================================================================

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  status: string;
}

export interface ClassRosterInfo {
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  academicYear?: string;
}

interface ClassRosterResponse {
  class: ClassRosterInfo;
  students: RosterStudent[];
  total: number;
}

/**
 * Get class roster (teacher)
 */
export async function teacherGetClassRoster(
  getIdToken: TokenGetter,
  classId: string
): Promise<ClassRosterResponse> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/teacher/classes/${classId}/roster`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<ClassRosterResponse>;

  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to fetch class roster');
  }

  return json.data!;
}

// ============================================================================
// Attendance
// ============================================================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy?: string;
  markedByName?: string;
}

interface AttendanceResponse {
  classId: string;
  date: string;
  records: AttendanceRecord[];
  total: number;
}

/**
 * Get attendance records for a class on a specific date
 */
export async function teacherGetAttendance(
  getIdToken: TokenGetter,
  classId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/teacher/classes/${classId}/attendance?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = (await res.json()) as ApiResponse<AttendanceResponse>;

  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to fetch attendance');
  }

  return json.data!.records;
}

export interface SaveAttendanceInput {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

/**
 * Save attendance records for a class
 */
export async function teacherSaveAttendance(
  getIdToken: TokenGetter,
  classId: string,
  date: string,
  records: SaveAttendanceInput[]
): Promise<{ savedCount: number }> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`/api/v1/teacher/classes/${classId}/attendance`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, records }),
  });

  const json = (await res.json()) as ApiResponse<{ savedCount: number }>;

  if (!res.ok) {
    throw new Error(json.error || json.message || 'Failed to save attendance');
  }

  return { savedCount: json.data!.savedCount };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'absent':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'late':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'excused':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get status button color class
 */
export function getStatusButtonClass(status: AttendanceStatus, isActive: boolean): string {
  const base = 'px-3 py-1 rounded-md text-sm font-medium transition-colors border';
  if (!isActive) {
    return `${base} bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100`;
  }
  switch (status) {
    case 'present':
      return `${base} bg-green-500 text-white border-green-600`;
    case 'absent':
      return `${base} bg-red-500 text-white border-red-600`;
    case 'late':
      return `${base} bg-yellow-500 text-white border-yellow-600`;
    case 'excused':
      return `${base} bg-blue-500 text-white border-blue-600`;
    default:
      return `${base} bg-gray-500 text-white border-gray-600`;
  }
}
