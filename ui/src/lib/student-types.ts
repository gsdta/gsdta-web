import {z} from "zod";

export const studentSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string().optional(),
    priorLevel: z.string().nullable().optional(),
    medicalNotes: z.string().nullable().optional(),
    photoConsent: z.boolean().default(false),
});

export type Student = z.infer<typeof studentSchema>;

export const newStudentDefaults: Student = {
    firstName: "",
    lastName: "",
    dob: undefined,
    priorLevel: null,
    medicalNotes: null,
    photoConsent: false,
};
