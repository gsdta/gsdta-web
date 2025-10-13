import { http, HttpResponse } from "msw";

type Role = "admin" | "teacher" | "parent";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dob?: string;
  priorLevel?: string | null;
  medicalNotes?: string | null;
  photoConsent: boolean;
}

// Make sure these are module-level variables that persist across requests
let nextStudentId = 3; // Start from 3 since we have s1 and s2

const initialStudents: Student[] = [
  {
    id: "s1",
    firstName: "Anya",
    lastName: "R.",
    dob: "2014-05-12",
    priorLevel: "Beginner",
    medicalNotes: null,
    photoConsent: true,
  },
  {
    id: "s2",
    firstName: "Vikram",
    lastName: "R.",
    dob: "2012-09-03",
    priorLevel: "Intermediate",
    medicalNotes: "Peanut allergy",
    photoConsent: false,
  },
];

// Use a global object to ensure state persistence
const globalDb: { user: User | null; students: Student[] } = {
  user: null,
  students: [...initialStudents], // Copy the initial data
};

// Function to reset database state
export function resetDatabase() {
  globalDb.user = null;
  globalDb.students = [...initialStudents]; // Reset to initial state
  nextStudentId = 3; // Reset ID counter
  console.log("Database reset. Current students:", globalDb.students.length);
}

export const handlers = [
  // Reset endpoint for tests
  http.post("/test/reset", () => {
    resetDatabase();
    return HttpResponse.json({ success: true });
  }),

  // Auth handlers
  http.get("/auth/session", () => {
    if (!globalDb.user) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    return HttpResponse.json({ user: globalDb.user });
  }),
  http.post("/auth/login", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<User> & { role?: Role };
    const role: Role = (body.role as Role) || "parent";
    globalDb.user = { id: "u1", name: "Priya", email: "priya@example.com", role };
    return HttpResponse.json({ user: globalDb.user });
  }),
  http.post("/auth/logout", () => {
    globalDb.user = null;
    return HttpResponse.json({ ok: true });
  }),
  http.post("/auth/role", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { role?: Role };
    if (!globalDb.user) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!body.role) return HttpResponse.json({ message: "Bad Request" }, { status: 400 });
    globalDb.user = { ...globalDb.user, role: body.role };
    return HttpResponse.json({ user: globalDb.user });
  }),

  // Students handlers
  http.get("/students", () => {
    console.log("GET /students - returning", globalDb.students.length, "students");
    return HttpResponse.json(globalDb.students as Student[]);
  }),
  http.get("/students/:id", ({ params }) => {
    const { id } = params as { id: string };
    const student = globalDb.students.find((s) => s.id === id);
    if (!student) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(student);
  }),
  http.post("/students", async ({ request }) => {
    const body = (await request.json()) as Partial<Student>;
    const newStudent: Student = {
      id: "s" + nextStudentId++,
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      dob: body.dob,
      priorLevel: body.priorLevel ? String(body.priorLevel) : null,
      medicalNotes: body.medicalNotes ? String(body.medicalNotes) : null,
      photoConsent: !!body.photoConsent,
    };
    globalDb.students.push(newStudent);
    console.log(
      "POST /students - created student",
      newStudent.id,
      "Total students:",
      globalDb.students.length,
    );
    return HttpResponse.json(newStudent, { status: 201 });
  }),
  http.patch("/students/:id", async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as Partial<Student>;
    const idx = globalDb.students.findIndex((s) => s.id === id);
    if (idx === -1) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const patch: Partial<Student> = {
      ...body,
      priorLevel: body.priorLevel === "" ? null : body.priorLevel,
      medicalNotes: body.medicalNotes === "" ? null : body.medicalNotes,
    };
    globalDb.students[idx] = { ...globalDb.students[idx], ...patch } as Student;
    return HttpResponse.json(globalDb.students[idx]);
  }),
];
