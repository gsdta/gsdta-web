import type {Enrollment, EnrollmentWithDetails, Class} from "./enrollment-types";
import {apiFetch} from "@/lib/api-client";

export async function getClasses(): Promise<Class[]> {
    return apiFetch<Class[]>(`/classes`);
}

export async function getEnrollments(params?: {
    status?: string;
    studentId?: string
}): Promise<EnrollmentWithDetails[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.studentId) query.set("studentId", params.studentId);
    const qs = query.toString();
    return apiFetch<EnrollmentWithDetails[]>(`/enrollments${qs ? `?${qs}` : ""}`);
}

export async function createEnrollment(data: {
    studentId: string;
    classId: string;
    notes?: string
}): Promise<Enrollment> {
    return apiFetch<Enrollment>(`/enrollments`, {method: "POST", body: JSON.stringify(data)});
}

export async function updateEnrollmentStatus(id: string, status: string, notes?: string): Promise<Enrollment> {
    return apiFetch<Enrollment>(`/enrollments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({status, notes}),
    });
}
