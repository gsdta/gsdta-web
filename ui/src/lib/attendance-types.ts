export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
    id: string;
    studentId: string;
    classId: string;
    date: string; // ISO date string (YYYY-MM-DD)
    status: AttendanceStatus;
    notes?: string;
}

export interface RosterStudent {
    id: string;
    firstName: string;
    lastName: string;
    enrollmentId: string;
}

export interface AttendanceWithStudent extends AttendanceRecord {
    student: RosterStudent;
}
