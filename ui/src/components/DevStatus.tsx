"use client";
import {useEffect, useState} from "react";

export function DevStatus() {
    const [msg, setMsg] = useState<string>("");
    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;

        async function run() {
            try {
                const [sesh, students] = await Promise.all([
                    fetch("/auth/session")
                        .then((r) => r.json())
                        .catch(() => null),
                    fetch("/students")
                        .then((r) => r.json())
                        .catch(() => null),
                ]);
                if (sesh && students) {
                    setMsg(`MSW: user=${sesh.user?.name ?? "unknown"}, students=${students.length ?? 0}`);
                } else {
                    setMsg("MSW not active");
                }
            } catch {
                setMsg("MSW check failed");
            }
        }

        run();
    }, []);

    if (process.env.NODE_ENV !== "development") return null;
    return (
        <div className="text-xs text-muted mt-2" aria-live="polite">
            {msg}
        </div>
    );
}
