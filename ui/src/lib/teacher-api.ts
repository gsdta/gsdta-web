/**
 * Teacher Portal API client
 */
import { apiFetch } from './api-client';

// Types
export interface TeacherClass {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  available: number;
  teacherRole: 'primary' | 'assistant';
  status: string;
  academicYear?: string;
}

export interface TeacherDashboard {
  teacher: {
    uid: string;
    name: string;
    email: string;
  };
  stats: {
    totalClasses: number;
    totalStudents: number;
    classesToday: number;
  };
  todaysSchedule: Array<{
    id: string;
    name: string;
    gradeName: string;
    time: string;
    studentCount: number;
    teacherRole: string;
    todayAttendance: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      attendanceRate: number;
    } | null;
  }>;
  classes: Array<{
    id: string;
    name: string;
    gradeName: string;
    day: string;
    time: string;
    teacherRole: string;
    studentCount: number;
    capacity: number;
  }>;
  recentAttendance: Array<{
    id: string;
    classId: string;
    className: string;
    date: string;
    studentName: string;
    status: string;
  }>;
}

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  grade?: string;
  status: string;
  contacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isEmergency?: boolean;
  }>;
  medicalNotes?: string;
}

export interface ClassRoster {
  students: RosterStudent[];
  total: number;
  class: {
    id: string;
    name: string;
    gradeName: string;
    day: string;
    time: string;
    teacherRole: string;
  };
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  arrivalTime?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;
  lastEditedBy?: string;
  lastEditedByName?: string;
  lastEditedAt?: string | null;
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  total: number;
  limit: number;
  offset: number;
  summary?: {
    date: string;
    classId: string;
    className: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    attendanceRate: number;
  } | null;
}

// API Functions

/**
 * Get teacher dashboard data
 */
export async function getTeacherDashboard(): Promise<TeacherDashboard> {
  const response = await apiFetch<{ success: boolean; data: TeacherDashboard }>(
    '/v1/teacher/dashboard'
  );
  return response.data;
}

/**
 * Get list of teacher's assigned classes
 */
export async function getTeacherClasses(): Promise<TeacherClass[]> {
  const response = await apiFetch<{ success: boolean; data: { classes: TeacherClass[]; total: number } }>(
    '/v1/teacher/classes'
  );
  return response.data.classes;
}

/**
 * Get details of a specific class
 */
export async function getTeacherClass(classId: string): Promise<TeacherClass> {
  const response = await apiFetch<{ success: boolean; data: { class: TeacherClass } }>(
    `/v1/teacher/classes/${classId}`
  );
  return response.data.class;
}

/**
 * Get student roster for a class
 */
export async function getClassRoster(classId: string, options?: { search?: string; status?: string }): Promise<ClassRoster> {
  const params = new URLSearchParams();
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  const queryString = params.toString();

  const response = await apiFetch<{ success: boolean; data: ClassRoster }>(
    `/v1/teacher/classes/${classId}/roster${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
}

/**
 * Get attendance records for a class
 */
export async function getClassAttendance(
  classId: string,
  options?: { date?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }
): Promise<AttendanceListResponse> {
  const params = new URLSearchParams();
  if (options?.date) params.set('date', options.date);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const queryString = params.toString();

  const response = await apiFetch<{ success: boolean; data: AttendanceListResponse }>(
    `/v1/teacher/classes/${classId}/attendance${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
}

/**
 * Mark attendance for a class
 */
export async function markClassAttendance(
  classId: string,
  date: string,
  records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    arrivalTime?: string;
    notes?: string;
  }>
): Promise<{ records: AttendanceRecord[]; count: number }> {
  const response = await apiFetch<{ success: boolean; data: { records: AttendanceRecord[]; count: number } }>(
    `/v1/teacher/classes/${classId}/attendance`,
    {
      method: 'POST',
      body: JSON.stringify({ date, records }),
    }
  );
  return response.data;
}

/**
 * Update a single attendance record
 */
export async function updateAttendanceRecord(
  classId: string,
  recordId: string,
  updates: {
    status?: 'present' | 'absent' | 'late' | 'excused';
    arrivalTime?: string;
    notes?: string;
    editReason?: string;
  }
): Promise<AttendanceRecord> {
  const response = await apiFetch<{ success: boolean; data: { record: AttendanceRecord } }>(
    `/v1/teacher/classes/${classId}/attendance/${recordId}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );
  return response.data.record;
}

/**
 * Get a single attendance record
 */
export async function getAttendanceRecord(classId: string, recordId: string): Promise<AttendanceRecord> {
  const response = await apiFetch<{ success: boolean; data: { record: AttendanceRecord } }>(
    `/v1/teacher/classes/${classId}/attendance/${recordId}`
  );
  return response.data.record;
}
