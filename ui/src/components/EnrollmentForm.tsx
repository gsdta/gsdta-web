"use client";
import React, {useState, useEffect} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import Link from "next/link";
import type {Student} from "@/lib/student-types";
import type {Class} from "@/lib/enrollment-types";
import {listStudents} from "@/lib/student-api";
import {getClasses, createEnrollment} from "@/lib/enrollment-api";

const enrollmentSchema = z.object({
    studentId: z.string().min(1, "Please select a student"),
    classId: z.string().min(1, "Please select a class"),
    notes: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface EnrollmentFormProps {
    onSuccess?: () => void;
}

export function EnrollmentForm({onSuccess}: EnrollmentFormProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: {errors},
        watch,
        reset,
    } = useForm<EnrollmentFormData>({
        resolver: zodResolver(enrollmentSchema),
    });

    const selectedClassId = watch("classId");
    const selectedClass = classes.find((c) => c.id === selectedClassId);

    useEffect(() => {
        void Promise.all([listStudents(), getClasses()])
            .then(([studentsData, classesData]) => {
                setStudents(studentsData);
                setClasses(classesData);
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load data");
                setLoading(false);
            });
    }, []);

    const onSubmit = async (data: EnrollmentFormData) => {
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const enrollment = await createEnrollment({
                studentId: data.studentId,
                classId: data.classId,
                notes: data.notes,
            });

            const student = students.find((s) => s.id === data.studentId);
            const cls = classes.find((c) => c.id === data.classId);

            if (enrollment.status === "waitlisted") {
                setSuccess(
                    `${student?.firstName} has been added to the waitlist for ${cls?.name}. You will be notified when a spot becomes available.`,
                );
            } else {
                setSuccess(
                    `Application submitted successfully for ${student?.firstName} to ${cls?.name}. Status: ${enrollment.status}`,
                );
            }

            reset();
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit enrollment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-gray-600">Loading...</div>;
    }

    if (students.length === 0) {
        return (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-yellow-800">
                    You need to add a student profile before enrolling in classes.{" "}
                    <Link href="/students/new" className="underline hover:text-yellow-900">
                        Add a student
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
                >
                    {success}
                </div>
            )}

            <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                    Student *
                </label>
                <select
                    id="studentId"
                    {...register("studentId")}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    aria-invalid={!!errors.studentId}
                    aria-describedby={errors.studentId ? "studentId-error" : undefined}
                >
                    <option value="">-- Select a student --</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                            {student.firstName} {student.lastName}
                        </option>
                    ))}
                </select>
                {errors.studentId && (
                    <p id="studentId-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.studentId.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
                    Class *
                </label>
                <select
                    id="classId"
                    {...register("classId")}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    aria-invalid={!!errors.classId}
                    aria-describedby={errors.classId ? "classId-error" : undefined}
                >
                    <option value="">-- Select a class --</option>
                    {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                            {cls.name} - {cls.day} {cls.time} ({cls.enrolled}/{cls.capacity} enrolled)
                        </option>
                    ))}
                </select>
                {errors.classId && (
                    <p id="classId-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.classId.message}
                    </p>
                )}
                {selectedClass && (
                    <div className="mt-2 text-sm text-gray-600">
                        <p>
                            <strong>Level:</strong> {selectedClass.level}
                        </p>
                        <p>
                            <strong>Teacher:</strong> {selectedClass.teacher}
                        </p>
                        <p>
                            <strong>Availability:</strong>{" "}
                            {selectedClass.enrolled >= selectedClass.capacity ? (
                                <span className="text-red-600 font-semibold">Full - Will be added to waitlist</span>
                            ) : (
                                <span className="text-green-600">
                  {selectedClass.capacity - selectedClass.enrolled} spots available
                </span>
                            )}
                        </p>
                    </div>
                )}
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Additional Notes (Optional)
                </label>
                <textarea
                    id="notes"
                    {...register("notes")}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Any special requests or information..."
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {submitting ? "Submitting..." : "Submit Application"}
            </button>
        </form>
    );
}
