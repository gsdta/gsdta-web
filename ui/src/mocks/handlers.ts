import {http, HttpResponse} from "msw";

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

type EnrollmentStatus = "pending" | "accepted" | "waitlisted" | "rejected";

interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    status: EnrollmentStatus;
    appliedAt: string;
    updatedAt: string;
    notes?: string;
}

interface Class {
    id: string;
    name: string;
    level: string;
    day: string;
    time: string;
    capacity: number;
    enrolled: number;
    teacher?: string;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceRecord {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
}

// Make sure these are module-level variables that persist across requests
let nextStudentId = 3; // Start from 3 since we have s1 and s2
let nextEnrollmentId = 1;
let nextAttendanceId = 1;

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

const initialClasses: Class[] = [
    {
        id: "c1",
        name: "Beginner Bharatanatyam",
        level: "Beginner",
        day: "Saturday",
        time: "10:00 AM - 11:30 AM",
        capacity: 15,
        enrolled: 12,
        teacher: "Ms. Lakshmi",
    },
    {
        id: "c2",
        name: "Intermediate Bharatanatyam",
        level: "Intermediate",
        day: "Saturday",
        time: "12:00 PM - 1:30 PM",
        capacity: 12,
        enrolled: 12,
        teacher: "Ms. Lakshmi",
    },
    {
        id: "c3",
        name: "Advanced Bharatanatyam",
        level: "Advanced",
        day: "Sunday",
        time: "10:00 AM - 12:00 PM",
        capacity: 10,
        enrolled: 8,
        teacher: "Ms. Priya",
    },
];

const initialEnrollments: Enrollment[] = [];

const initialAttendance: AttendanceRecord[] = [];

// Use a global object to ensure state persistence
const globalDb: {
    user: User | null;
    students: Student[];
    classes: Class[];
    enrollments: Enrollment[];
    attendance: AttendanceRecord[];
} = {
    user: null,
    students: [...initialStudents],
    classes: [...initialClasses],
    enrollments: [...initialEnrollments],
    attendance: [...initialAttendance],
};

// Simple in-memory invites store for mock mode
const invitesDb: Record<string, { email: string; role: "teacher"; status: "pending" | "accepted"; expiresAt: string }> = {
    "valid-teacher-token": {
        email: "teacher@example.com",
        role: "teacher",
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
};

// Function to reset database state
export function resetDatabase() {
    globalDb.user = null;
    globalDb.students = [...initialStudents]; // Reset to initial state
    globalDb.classes = [...initialClasses];
    globalDb.enrollments = [...initialEnrollments];
    globalDb.attendance = [...initialAttendance];
    nextStudentId = 3; // Reset ID counter
    nextEnrollmentId = 1;
    nextAttendanceId = 1;
    console.log("Database reset. Current students:", globalDb.students.length);
}

export const handlers = [
    // Reset endpoint for tests
    http.post("/test/reset", () => {
        resetDatabase();
        return HttpResponse.json({success: true});
    }),

    // Auth handlers
    http.get("/auth/session", () => {
        if (!globalDb.user) return HttpResponse.json({message: "Unauthorized"}, {status: 401});
        return HttpResponse.json({user: globalDb.user});
    }),
    http.post("/auth/login", async ({request}) => {
        const body = (await request.json().catch(() => ({}))) as Partial<User> & { role?: Role };
        const role: Role = (body.role as Role) || "parent";
        globalDb.user = {id: "u1", name: "Priya", email: "priya@example.com", role};
        return HttpResponse.json({user: globalDb.user});
    }),
    http.post("/auth/logout", () => {
        globalDb.user = null;
        return HttpResponse.json({ok: true});
    }),
    http.post("/auth/role", async ({request}) => {
        const body = (await request.json().catch(() => ({}))) as { role?: Role };
        if (!globalDb.user) return HttpResponse.json({message: "Unauthorized"}, {status: 401});
        if (!body.role) return HttpResponse.json({message: "Bad Request"}, {status: 400});
        globalDb.user = {...globalDb.user, role: body.role};
        return HttpResponse.json({user: globalDb.user});
    }),

    // Students handlers
    http.get("/students", () => {
        console.log("GET /students - returning", globalDb.students.length, "students");
        return HttpResponse.json(globalDb.students as Student[]);
    }),
    http.get("/students/:id", ({params}) => {
        const {id} = params as { id: string };
        const student = globalDb.students.find((s) => s.id === id);
        if (!student) return HttpResponse.json({message: "Not found"}, {status: 404});
        return HttpResponse.json(student);
    }),
    http.post("/students", async ({request}) => {
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
        return HttpResponse.json(newStudent, {status: 201});
    }),
    http.patch("/students/:id", async ({params, request}) => {
        const {id} = params as { id: string };
        const body = (await request.json()) as Partial<Student>;
        const idx = globalDb.students.findIndex((s) => s.id === id);
        if (idx === -1) return HttpResponse.json({message: "Not found"}, {status: 404});
        const patch: Partial<Student> = {
            ...body,
            priorLevel: body.priorLevel === "" ? null : body.priorLevel,
            medicalNotes: body.medicalNotes === "" ? null : body.medicalNotes,
        };
        globalDb.students[idx] = {...globalDb.students[idx], ...patch} as Student;
        return HttpResponse.json(globalDb.students[idx]);
    }),

    // Classes handlers
    http.get("/classes", () => {
        return HttpResponse.json(globalDb.classes);
    }),
    http.get("/classes/:id", ({params}) => {
        const {id} = params as { id: string };
        const cls = globalDb.classes.find((c) => c.id === id);
        if (!cls) return HttpResponse.json({message: "Not found"}, {status: 404});
        return HttpResponse.json(cls);
    }),

    // Enrollments handlers
    http.get("/enrollments", ({request}) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const studentId = url.searchParams.get("studentId");

        let filtered = globalDb.enrollments;
        if (status) {
            filtered = filtered.filter((e) => e.status === status);
        }
        if (studentId) {
            filtered = filtered.filter((e) => e.studentId === studentId);
        }

        // Enrich with student and class details
        const enriched = filtered.map((enrollment) => {
            const student = globalDb.students.find((s) => s.id === enrollment.studentId);
            const cls = globalDb.classes.find((c) => c.id === enrollment.classId);
            return {
                ...enrollment,
                student: student
                    ? {
                        id: student.id,
                        firstName: student.firstName,
                        lastName: student.lastName,
                    }
                    : undefined,
                class: cls,
            };
        });

        return HttpResponse.json(enriched);
    }),

    http.post("/enrollments", async ({request}) => {
        const body = (await request.json()) as { studentId: string; classId: string; notes?: string };

        // Find the class
        const cls = globalDb.classes.find((c) => c.id === body.classId);
        if (!cls) {
            return HttpResponse.json({message: "Class not found"}, {status: 404});
        }

        // Check if student exists
        const student = globalDb.students.find((s) => s.id === body.studentId);
        if (!student) {
            return HttpResponse.json({message: "Student not found"}, {status: 404});
        }

        // Check for duplicate enrollment
        const existing = globalDb.enrollments.find(
            (e) => e.studentId === body.studentId && e.classId === body.classId,
        );
        if (existing) {
            return HttpResponse.json(
                {message: "Student is already enrolled in this class"},
                {status: 409},
            );
        }

        const now = new Date().toISOString();

        // Determine status based on capacity
        let status: EnrollmentStatus = "pending";
        if (cls.enrolled >= cls.capacity) {
            status = "waitlisted";
        }

        const newEnrollment: Enrollment = {
            id: "e" + nextEnrollmentId++,
            studentId: body.studentId,
            classId: body.classId,
            status,
            appliedAt: now,
            updatedAt: now,
            notes: body.notes,
        };

        globalDb.enrollments.push(newEnrollment);
        console.log("POST /enrollments - created enrollment", newEnrollment.id, "Status:", status);

        return HttpResponse.json(newEnrollment, {status: 201});
    }),

    http.patch("/enrollments/:id", async ({params, request}) => {
        const {id} = params as { id: string };
        const body = (await request.json()) as { status?: EnrollmentStatus; notes?: string };

        const idx = globalDb.enrollments.findIndex((e) => e.id === id);
        if (idx === -1) {
            return HttpResponse.json({message: "Not found"}, {status: 404});
        }

        const enrollment = globalDb.enrollments[idx];
        const oldStatus = enrollment.status;

        // Update enrollment
        globalDb.enrollments[idx] = {
            ...enrollment,
            status: body.status ?? enrollment.status,
            notes: body.notes ?? enrollment.notes,
            updatedAt: new Date().toISOString(),
        };

        // Update class enrolled count if status changed to/from accepted
        const cls = globalDb.classes.find((c) => c.id === enrollment.classId);
        if (cls) {
            if (body.status === "accepted" && oldStatus !== "accepted") {
                cls.enrolled++;
            } else if (body.status !== "accepted" && oldStatus === "accepted") {
                cls.enrolled--;
            }
        }

        console.log("PATCH /enrollments/" + id, "Status:", oldStatus, "->", body.status);

        return HttpResponse.json(globalDb.enrollments[idx]);
    }),

    // Attendance handlers
    http.get("/classes/:classId/roster", ({params}) => {
        const {classId} = params as { classId: string };

        // Get accepted enrollments for this class
        const classEnrollments = globalDb.enrollments.filter(
            (e) => e.classId === classId && e.status === "accepted",
        );

        // Get student details for each enrollment
        const roster = classEnrollments.map((enrollment) => {
            const student = globalDb.students.find((s) => s.id === enrollment.studentId);
            return {
                id: student?.id || "",
                firstName: student?.firstName || "",
                lastName: student?.lastName || "",
                enrollmentId: enrollment.id,
            };
        });

        return HttpResponse.json(roster);
    }),

    http.get("/classes/:classId/attendance", ({params, request}) => {
        const {classId} = params as { classId: string };
        const url = new URL(request.url);
        const date = url.searchParams.get("date");

        if (!date) {
            return HttpResponse.json({message: "Date parameter required"}, {status: 400});
        }

        // Get attendance records for this class and date
        const records = globalDb.attendance.filter((a) => a.classId === classId && a.date === date);

        // Enrich with student details
        const enriched = records.map((record) => {
            const student = globalDb.students.find((s) => s.id === record.studentId);
            const enrollment = globalDb.enrollments.find(
                (e) => e.studentId === record.studentId && e.classId === classId,
            );
            return {
                ...record,
                student: {
                    id: student?.id || "",
                    firstName: student?.firstName || "",
                    lastName: student?.lastName || "",
                    enrollmentId: enrollment?.id || "",
                },
            };
        });

        return HttpResponse.json(enriched);
    }),

    http.post("/classes/:classId/attendance", async ({params, request}) => {
        const {classId} = params as { classId: string };
        const body = (await request.json()) as {
            date: string;
            records: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>;
        };

        if (!body.date || !body.records) {
            return HttpResponse.json({message: "Invalid request"}, {status: 400});
        }

        // Remove existing attendance for this class/date
        globalDb.attendance = globalDb.attendance.filter(
            (a) => !(a.classId === classId && a.date === body.date),
        );

        // Add new attendance records
        const newRecords = body.records.map((record) => ({
            id: "a" + nextAttendanceId++,
            studentId: record.studentId,
            classId,
            date: body.date,
            status: record.status,
            notes: record.notes,
        }));

        globalDb.attendance.push(...newRecords);

        console.log(
            "POST /classes/" + classId + "/attendance",
            "Date:",
            body.date,
            "Records:",
            newRecords.length,
        );

        return HttpResponse.json(newRecords, {status: 201});
    }),

    // Invite verification (public)
    http.get("/api/v1/invites/verify", ({ request }) => {
        const url = new URL(request.url);
        const token = (url.searchParams.get("token") || "").trim();
        const inv = invitesDb[token];
        if (!inv || inv.status !== "pending" || new Date(inv.expiresAt).getTime() <= Date.now()) {
            return HttpResponse.json({ code: "invite/not-found", message: "Invite not found or expired" }, { status: 404 });
        }
        return HttpResponse.json({ id: token, email: inv.email, role: inv.role, status: inv.status, expiresAt: inv.expiresAt });
    }),

    // Invite accept (requires user in real backend; here we just flip state)
    http.post("/api/v1/invites/accept", async ({ request }) => {
        try {
            const body = (await request.json().catch(() => ({}))) as { token?: string };
            const token = (body.token || "").trim();
            const inv = invitesDb[token];
            if (!inv || inv.status !== "pending") {
                return HttpResponse.json({ code: "invite/not-found", message: "Invite not found or expired" }, { status: 404 });
            }
            inv.status = "accepted";
            return HttpResponse.json({ ok: true });
        } catch {
            return HttpResponse.json({ code: "internal/error", message: "Failed to accept invite" }, { status: 500 });
        }
    }),
];
