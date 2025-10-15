"use client";
import React, {useCallback, useEffect, useState} from "react";
import Link from "next/link";
import {listStudents} from "@/lib/student-api";
import type {Student} from "@/lib/student-types";

export function StudentsList() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    const waitForMsw = useCallback(async () => {
        if (typeof window === "undefined") return;
        const anyWin = window as unknown as { __mswReady?: Promise<void> };
        if (anyWin.__mswReady) {
            try {
                await anyWin.__mswReady;
            } catch {
            }
        }
    }, []);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await waitForMsw();
            const data = await listStudents();
            setStudents(data);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [waitForMsw]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Refresh data when the window regains focus (for better UX after navigation)
    useEffect(() => {
        const handleFocus = () => {
            fetchStudents();
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchStudents]);

    return (
        <div className="prose">
            <div className="flex items-center justify-between">
                <h1>Students</h1>
                <Link
                    data-testid="add-student-link"
                    href="/students/new"
                    className="border rounded px-3 py-1"
                >
                    Add student
                </Link>
            </div>
            {loading ? (
                <p>Loading students…</p>
            ) : error ? (
                <p role="alert" className="text-red-600">
                    {error}
                </p>
            ) : (
                <table className="table-auto w-full text-sm">
                    <thead>
                    <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">DOB</th>
                        <th className="text-left p-2">Prior level</th>
                        <th className="text-left p-2">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {students.map((s) => (
                        <tr key={s.id} className="border-t">
                            <td className="p-2">
                                {s.firstName} {s.lastName}
                            </td>
                            <td className="p-2">{s.dob ?? "—"}</td>
                            <td className="p-2">{s.priorLevel || "—"}</td>
                            <td className="p-2">
                                <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline">
                                    Edit
                                </Link>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
