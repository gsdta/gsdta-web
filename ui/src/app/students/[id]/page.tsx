"use client";
import React, {useEffect, useState} from "react";
import {useRouter, useParams} from "next/navigation";
import {Protected} from "@/components/Protected";
import {StudentForm} from "@/components/StudentForm";
import {getStudent, updateStudent} from "@/lib/student-api";
import type {Student} from "@/lib/student-types";
import {newStudentDefaults} from "@/lib/student-types";

async function waitForMsw() {
    if (typeof window === "undefined") return;
    const anyWin = window as unknown as { __mswReady?: Promise<void> };
    if (anyWin.__mswReady) {
        try {
            await anyWin.__mswReady;
        } catch {
        }
    }
}

export default function EditStudentPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await waitForMsw();
                const s = await getStudent(id);
                if (!cancelled) setStudent(s);
            } catch {
                if (!cancelled) setError("Not found");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    async function handleUpdate(values: Partial<Student>) {
        await updateStudent(id, values);
        router.replace("/students");
    }

    return (
        <Protected roles={["parent", "admin"]} deferUnauthRedirect>
            <div className="prose">
                <h1>Edit student</h1>
                {loading && <p>Loading…</p>}
                {error && (
                    <p role="alert" className="text-red-600">
                        {error}
                    </p>
                )}
            </div>
            <StudentForm
                key={student ? `edit-${student.id}` : "edit-loading"}
                initial={student ?? newStudentDefaults}
                onSubmit={handleUpdate}
                submitLabel="Update"
            />
        </Protected>
    );
}
