"use client";
import React, {useState, useEffect} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Protected} from "@/components/Protected";
import {getClasses} from "@/lib/enrollment-api";
import {getClassRoster} from "@/lib/attendance-api";
import type {Class} from "@/lib/enrollment-types";
import type {RosterStudent} from "@/lib/attendance-types";

export default function ClassDetailPage() {
    const params = useParams();
    const classId = params.id as string;

    const [classData, setClassData] = useState<Class | null>(null);
    const [roster, setRoster] = useState<RosterStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            getClasses().then((classes) => classes.find((c) => c.id === classId)),
            getClassRoster(classId),
        ])
            .then(([cls, rosterData]) => {
                if (!cls) {
                    setError("Class not found");
                } else {
                    setClassData(cls);
                    setRoster(rosterData);
                }
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load class details");
                setLoading(false);
            });
    }, [classId]);

    return (
        <Protected roles={["teacher", "admin"]}>
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href="/classes"
                            className="mb-2 inline-block text-sm text-blue-600 hover:underline"
                        >
                            ← Back to Classes
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">{classData?.name || "Loading..."}</h1>
                    </div>
                    {classData && (
                        <Link
                            href={`/classes/${classId}/attendance`}
                            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            Take Attendance
                        </Link>
                    )}
                </div>

                {loading && <div className="text-gray-600">Loading...</div>}

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
                )}

                {!loading && !error && classData && (
                    <>
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-semibold text-gray-900">Class Information</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-gray-600">Grade</p>
                                    <p className="font-medium text-gray-900">{classData.gradeName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Schedule</p>
                                    <p className="font-medium text-gray-900">
                                        {classData.day} {classData.time}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Teacher</p>
                                    <p className="font-medium text-gray-900">{classData.teacher}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Enrollment</p>
                                    <p className="font-medium text-gray-900">
                                        {classData.enrolled}/{classData.capacity} students
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-semibold text-gray-900">
                                Class Roster ({roster.length})
                            </h2>
                            {roster.length === 0 ? (
                                <p className="text-gray-600">No students enrolled yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                Student Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                Student ID
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                        {roster.map((student) => (
                                            <tr key={student.id}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                    {student.firstName} {student.lastName}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {student.id}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Protected>
    );
}
