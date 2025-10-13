import type { Student } from "@/lib/student-types";

async function jsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export async function listStudents(): Promise<Student[]> {
  return jsonFetch<Student[]>("/students");
}

export async function getStudent(id: string): Promise<Student> {
  return jsonFetch<Student>(`/students/${id}`);
}

export async function createStudent(input: Omit<Student, "id">): Promise<Student> {
  return jsonFetch<Student>("/students", { method: "POST", body: JSON.stringify(input) });
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<Student> {
  return jsonFetch<Student>(`/students/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
