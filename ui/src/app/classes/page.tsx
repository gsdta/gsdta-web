"use client";
import React, {useState, useEffect} from "react";
import Link from "next/link";
import {Protected} from "@/components/Protected";
import {getClasses} from "@/lib/enrollment-api";
import type {Class} from "@/lib/enrollment-types";

declare global {
    interface Window {
        __mswReady?: Promise<void>;
    }
}

async function waitForMsw() {
    if (typeof window === "undefined") return;
    const useMsw = process.env.NEXT_PUBLIC_USE_MSW !== "false";
    if (!useMsw) return;

    const maxWaitMs = 2000;
    const intervalMs = 50;
    let waited = 0;
    while (!window.__mswReady && waited < maxWaitMs) {
        await new Promise((r) => setTimeout(r, intervalMs));
        waited += intervalMs;
    }
    if (window.__mswReady) {
        try {
            await window.__mswReady;
        } catch {
            // ignore
        }
    }
}

export default function ClassesPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadClasses() {
            await waitForMsw();
            getClasses()
                .then((data) => {
                    setClasses(data);
                    setLoading(false);
                })
                .catch((err) => {
                    setError(err instanceof Error ? err.message : "Failed to load classes");
                    setLoading(false);
                });
        }

        loadClasses();
    }, []);

    return (
        <Protected roles={["teacher", "parent", "admin"]}>
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
                    <p className="mt-2 text-gray-600">View class schedules and rosters.</p>
                </div>

                {loading && <div className="text-gray-600">Loading classes...</div>}

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
                )}

                {!loading && !error && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {classes.map((cls) => (
                            <Link
                                key={cls.id}
                                href={`/classes/${cls.id}`}
                                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <h2 className="text-xl font-semibold text-gray-900">{cls.name}</h2>
                                <div className="mt-3 space-y-1 text-sm text-gray-600">
                                    <p>
                                        <strong>Level:</strong> {cls.level}
                                    </p>
                                    <p>
                                        <strong>Schedule:</strong> {cls.day} {cls.time}
                                    </p>
                                    <p>
                                        <strong>Teacher:</strong> {cls.teacher}
                                    </p>
                                    <p>
                                        <strong>Enrollment:</strong> {cls.enrolled}/{cls.capacity} students
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </Protected>
    );
}
