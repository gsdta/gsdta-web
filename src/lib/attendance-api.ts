import type { AttendanceRecord, AttendanceWithStudent, RosterStudent } from "./attendance-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function getClassRoster(classId: string): Promise<RosterStudent[]> {
  const res = await fetch(`${BASE_URL}/classes/${classId}/roster`);
  if (!res.ok) throw new Error("Failed to fetch class roster");
  return res.json();
}

export async function getAttendance(
  classId: string,
  date: string,
): Promise<AttendanceWithStudent[]> {
  const res = await fetch(`${BASE_URL}/classes/${classId}/attendance?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch attendance");
  return res.json();
}

export async function saveAttendance(
  classId: string,
  date: string,
  records: Array<{ studentId: string; status: string; notes?: string }>,
): Promise<AttendanceRecord[]> {
  const res = await fetch(`${BASE_URL}/classes/${classId}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, records }),
  });
  if (!res.ok) throw new Error("Failed to save attendance");
  return res.json();
}
