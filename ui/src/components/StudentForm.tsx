"use client";
import React from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {createStudentSchema, type CreateStudentInput, newStudentDefaults} from "@/lib/student-types";

// For zod 4, use z.input for form values (before transforms/defaults applied)
type FormInput = z.input<typeof createStudentSchema>;

export interface StudentFormProps {
    initial?: Partial<FormInput>;
    onSubmit: (values: CreateStudentInput) => Promise<void> | void;
    submitLabel?: string;
}

export function StudentForm({initial, onSubmit, submitLabel = "Save"}: StudentFormProps) {
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm<FormInput>({
        resolver: zodResolver(createStudentSchema),
        defaultValues: {...newStudentDefaults, ...(initial ?? {})},
        mode: "onBlur",
    });

    return (
        <form
            onSubmit={handleSubmit(async (values) => {
                // After zod validation, values are fully validated CreateStudentInput
                await onSubmit(values as CreateStudentInput);
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
                    Prior level
                </label>
                <select
                    id="priorTamilLevel"
                    className="border rounded px-2 py-1 w-full"
                    {...register("priorTamilLevel")}
                >
                    <option value="">Select…</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
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
