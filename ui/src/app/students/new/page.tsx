"use client";
import React from "react";
import {useRouter} from "next/navigation";
import {Protected} from "@/components/Protected";
import {StudentForm} from "@/components/StudentForm";
import {createStudent} from "@/lib/student-api";

export default function NewStudentPage() {
    const router = useRouter();

    async function handleCreate(values: Parameters<typeof createStudent>[0]) {
        await createStudent(values);
        router.replace("/students");
    }

    return (
        <Protected roles={["parent", "admin"]} deferUnauthRedirect>
            <div className="prose">
                <h1>New student</h1>
            </div>
            <StudentForm onSubmit={handleCreate} submitLabel="Create"/>
        </Protected>
    );
}
