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

const db: { user: User | null; students: Student[] } = {
  user: null,
  students: [
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
  ],
};

export const handlers = [
  // Auth
  http.get("/auth/session", () => {
    if (!db.user) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    return HttpResponse.json({ user: db.user });
  }),
  http.post("/auth/login", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<User> & { role?: Role };
    const role: Role = (body.role as Role) || "parent";
    db.user = { id: "u1", name: "Priya", email: "priya@example.com", role };
    return HttpResponse.json({ user: db.user });
  }),
  http.post("/auth/logout", () => {
    db.user = null;
    return HttpResponse.json({ ok: true });
  }),
  http.post("/auth/role", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { role?: Role };
    if (!db.user) return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!body.role) return HttpResponse.json({ message: "Bad Request" }, { status: 400 });
    db.user = { ...db.user, role: body.role };
    return HttpResponse.json({ user: db.user });
  }),

  // Students
  http.get("/students", () => {
    return HttpResponse.json(db.students as Student[]);
  }),

  http.post("/students", async ({ request }) => {
    const body = (await request.json()) as Partial<Student>;
    const newStudent: Student = {
      id: "s" + (db.students.length + 1),
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      dob: body.dob,
      priorLevel: body.priorLevel ?? null,
      medicalNotes: body.medicalNotes ?? null,
      photoConsent: !!body.photoConsent,
    };
    db.students.push(newStudent);
    return HttpResponse.json(newStudent, { status: 201 });
  }),

  http.patch("/students/:id", async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as Partial<Student>;
    const idx = db.students.findIndex((s) => s.id === id);
    if (idx === -1) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    db.students[idx] = { ...db.students[idx], ...body } as Student;
    return HttpResponse.json(db.students[idx]);
  }),
];
