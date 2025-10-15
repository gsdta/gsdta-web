import type {AttendanceRecord, AttendanceWithStudent, RosterStudent} from "./attendance-types";
import {apiFetch} from "@/lib/api-client";

export async function getClassRoster(classId: string): Promise<RosterStudent[]> {
    return apiFetch<RosterStudent[]>(`/classes/${classId}/roster`);
}

export async function getAttendance(
    classId: string,
    date: string,
): Promise<AttendanceWithStudent[]> {
    return apiFetch<AttendanceWithStudent[]>(`/classes/${classId}/attendance?date=${encodeURIComponent(date)}`);
}

export async function saveAttendance(
    classId: string,
    date: string,
    records: Array<{ studentId: string; status: string; notes?: string }>,
): Promise<AttendanceRecord[]> {
    return apiFetch<AttendanceRecord[]>(`/classes/${classId}/attendance`, {
        method: "POST",
        body: JSON.stringify({date, records}),
    });
}
