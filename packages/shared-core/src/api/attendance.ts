/**
 * Attendance API
 *
 * Platform-agnostic attendance management functions.
 */

import type {
  AttendanceRecord,
  AttendanceWithStudent,
  RosterStudent,
} from "../types/attendance";
import { apiFetch } from "./client";

/**
 * Get class roster
 */
export async function getClassRoster(classId: string): Promise<RosterStudent[]> {
  return apiFetch<RosterStudent[]>(`/v1/classes/${classId}/roster/`);
}

/**
 * Get attendance for a class on a specific date
 */
export async function getAttendance(
  classId: string,
  date: string
): Promise<AttendanceWithStudent[]> {
  return apiFetch<AttendanceWithStudent[]>(
    `/v1/classes/${classId}/attendance/?date=${encodeURIComponent(date)}`
  );
}

/**
 * Save attendance records for a class
 */
export async function saveAttendance(
  classId: string,
  date: string,
  records: Array<{ studentId: string; status: string; notes?: string }>
): Promise<AttendanceRecord[]> {
  return apiFetch<AttendanceRecord[]>(`/v1/classes/${classId}/attendance/`, {
    method: "POST",
    body: JSON.stringify({ date, records }),
  });
}
