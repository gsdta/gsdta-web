import type {Student} from "@/lib/student-types";
import {apiFetch} from "@/lib/api-client";

export async function listStudents(): Promise<Student[]> {
    return apiFetch<Student[]>("/students");
}

export async function getStudent(id: string): Promise<Student> {
    return apiFetch<Student>(`/students/${id}`);
}

export async function createStudent(input: Omit<Student, "id">): Promise<Student> {
    return apiFetch<Student>(`/students`, {method: "POST", body: JSON.stringify(input)});
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<Student> {
    return apiFetch<Student>(`/students/${id}`, {method: "PATCH", body: JSON.stringify(patch)});
}
