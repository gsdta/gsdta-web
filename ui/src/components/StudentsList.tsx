"use client";
import React, {useCallback, useEffect, useState} from "react";
import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";
import {listStudents} from "@/lib/student-api";
import type {Student} from "@/lib/student-types";
import { useI18n } from "@/i18n/LanguageProvider";

export function StudentsList() {
    const { t } = useI18n();
    const { getIdToken } = useAuth();
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
            const data = await listStudents(getIdToken);
            setStudents(data);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [waitForMsw, getIdToken]);

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
                <h1>{t("students.title")}</h1>
                <Link
                    data-testid="add-student-link"
                    href="/students/new"
                    className="border rounded px-3 py-1"
                >
                    {t("students.add")}
                </Link>
            </div>
            {loading ? (
                <p>{t("students.loading")}</p>
            ) : error ? (
                <p role="alert" className="text-red-600">
                    {error}
                </p>
            ) : (
                <table className="table-auto w-full text-sm">
                    <thead>
                    <tr>
                        <th className="text-left p-2">{t("students.name")}</th>
                        <th className="text-left p-2">{t("students.dob")}</th>
                        <th className="text-left p-2">{t("students.priorLevel")}</th>
                        <th className="text-left p-2">{t("students.actions")}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {students.map((s) => (
                        <tr key={s.id} className="border-t">
                            <td className="p-2">
                                {s.firstName} {s.lastName}
                            </td>
                            <td className="p-2">{s.dateOfBirth ?? "—"}</td>
                            <td className="p-2">{s.priorTamilLevel || "—"}</td>
                            <td className="p-2">
                                <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline">
                                    {t("students.edit")}
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