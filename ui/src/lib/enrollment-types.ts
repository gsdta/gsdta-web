export type EnrollmentStatus = "pending" | "accepted" | "waitlisted" | "rejected";

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    status: EnrollmentStatus;
    appliedAt: string;
    updatedAt: string;
    notes?: string;
}

export interface Class {
    id: string;
    name: string;
    gradeName: string;
    day: string;
    time: string;
    capacity: number;
    enrolled: number;
    teacher?: string;
}

export interface EnrollmentWithDetails extends Enrollment {
    student?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    class?: Class;
}
