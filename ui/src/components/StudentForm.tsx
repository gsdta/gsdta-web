"use client";
import React from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {studentSchema, type Student, newStudentDefaults} from "@/lib/student-types";

export interface StudentFormProps {
    initial?: Partial<Student>;
    onSubmit: (values: Omit<Student, "id">) => Promise<void> | void;
    submitLabel?: string;
}

export function StudentForm({initial, onSubmit, submitLabel = "Save"}: StudentFormProps) {
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm<Omit<Student, "id">>({
        resolver: zodResolver(studentSchema),
        defaultValues: {...newStudentDefaults, ...(initial ?? {})},
        mode: "onBlur",
    });

    return (
        <form
            onSubmit={handleSubmit(async (values) => {
                await onSubmit(values);
            })}
            className="not-prose grid gap-3 max-w-xl"
            noValidate
        >
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium">
                    First name
                </label>
                <input
                    id="firstName"
                    className="border rounded px-2 py-1 w-full"
                    {...register("firstName")}
                />
                {errors.firstName && (
                    <p role="alert" className="text-red-600 text-sm mt-1">
                        {errors.firstName.message}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium">
                    Last name
                </label>
                <input
                    id="lastName"
                    className="border rounded px-2 py-1 w-full"
                    {...register("lastName")}
                />
                {errors.lastName && (
                    <p role="alert" className="text-red-600 text-sm mt-1">
                        {errors.lastName.message}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium">
                    Date of birth
                </label>
                <input
                    id="dateOfBirth"
                    type="date"
                    className="border rounded px-2 py-1 w-full"
                    {...register("dateOfBirth")}
                />
            </div>
            <div>
                <label htmlFor="priorTamilLevel" className="block text-sm font-medium">
                    Prior Tamil Experience
                </label>
                <select
                    id="priorTamilLevel"
                    className="border rounded px-2 py-1 w-full"
                    {...register("priorTamilLevel")}
                >
                    <option value="">Select…</option>
                    <option value="none">No prior experience</option>
                    <option value="beginner">Beginner - Can read basic letters</option>
                    <option value="intermediate">Intermediate - Can read and write simple sentences</option>
                    <option value="advanced">Advanced - Can read and write fluently</option>
                </select>
            </div>
            <div>
                <label htmlFor="medicalNotes" className="block text-sm font-medium">
                    Medical notes
                </label>
                <textarea
                    id="medicalNotes"
                    className="border rounded px-2 py-1 w-full"
                    rows={3}
                    {...register("medicalNotes")}
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    id="photoConsent"
                    type="checkbox"
                    className="border rounded"
                    {...register("photoConsent")}
                />
                <label htmlFor="photoConsent">Photo consent</label>
            </div>
            <div>
                <button type="submit" disabled={isSubmitting} className="border rounded px-3 py-1">
                    {isSubmitting ? "Saving…" : submitLabel}
                </button>
            </div>
        </form>
    );
}
