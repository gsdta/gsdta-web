"use client";
import {useEffect, useState} from "react";
import {getCurrentDebugUser, EFFECTIVE_BASE_URL} from "@/lib/api-client";

// Add global typing for window.__mswActive to avoid 'any'
declare global {
    interface Window {
        __mswActive?: boolean
    }
}

export default function HealthPage() {
    const [status, setStatus] = useState<
        | { ok: true; source: "mock" | "real"; status: number; count?: number; viaProxy: boolean }
        | { ok: false, error: string; viaProxy: boolean }
        | null
    >(null);

    const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const USE_MSW = process.env.NEXT_PUBLIC_USE_MSW !== "false";
    const viaProxy = BASE_URL.startsWith("/api");
    const debugSpec = !USE_MSW ? getCurrentDebugUser() : undefined;
    const parsed = debugSpec ? (() => {
        const [id, rolesStr, email, name] = debugSpec.split("|");
        return {id, roles: rolesStr?.split(",") ?? [], email, name};
    })() : undefined;
    const mswRuntimeActive = typeof window !== 'undefined' ? window.__mswActive === true : undefined;

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                const headers: Record<string, string> = {};
                if (!USE_MSW && debugSpec) headers["X-Debug-User"] = debugSpec;
                const res = await fetch(`${BASE_URL}/students`, {cache: "no-store", headers});
                const powered = res.headers.get("x-powered-by");
                const isMock = powered?.toLowerCase() === "msw";
                let count: number | undefined;
                try {
                    const data = (await res.json()) as unknown[];
                    if (Array.isArray(data)) count = data.length;
                } catch {
                }
                if (!cancelled) setStatus({
                    ok: true,
                    source: isMock ? "mock" : "real",
                    status: res.status,
                    count,
                    viaProxy
                });
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (!cancelled) setStatus({ok: false, error: msg, viaProxy});
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [BASE_URL, viaProxy, USE_MSW, debugSpec]);

    return (
        <main className="mx-auto max-w-2xl p-6 space-y-4">
            <h1 className="text-xl font-semibold">Health Check</h1>

            <section className="rounded border p-4">
                <h2 className="font-medium mb-2">Client configuration</h2>
                <ul className="list-disc ml-5 text-sm">
                    <li>NEXT_PUBLIC_USE_MSW: {String(USE_MSW)}</li>
                    <li>NEXT_PUBLIC_API_BASE_URL (raw): {BASE_URL || "(empty)"}</li>
                    <li>Effective base URL: {EFFECTIVE_BASE_URL || "(relative)"}</li>
                    <li>Proxy (via /api): {viaProxy ? "yes" : "no"}</li>
                    <li>MSW runtime active
                        flag: {mswRuntimeActive === undefined ? "(ssr)" : String(mswRuntimeActive)}</li>
                    {!USE_MSW && (
                        <li>
                            X-Debug-User: {debugSpec ? (
                            <code className="break-all">{debugSpec}</code>
                        ) : (
                            <span className="italic text-gray-500">(none set)</span>
                        )}
                        </li>
                    )}
                    {!USE_MSW && parsed && (
                        <li>
                            Parsed principal: id=<code>{parsed.id}</code> roles=[{parsed.roles.join(", ")}]
                            email={parsed.email}
                        </li>
                    )}
                </ul>
            </section>

            <section className="rounded border p-4">
                <h2 className="font-medium mb-2">Live request</h2>
                {status === null && <p className="text-sm text-gray-600">Checking …</p>}
                {status && status.ok && (
                    <div className="text-sm">
                        <p>
                            GET {BASE_URL}/students → status {status.status}, source {status.source}
                            {typeof status.count === "number" ? `, students=${status.count}` : ""}
                        </p>
                        <p>Proxy path in use: {status.viaProxy ? "/api (Next.js rewrite)" : "direct base URL"}</p>
                    </div>
                )}
                {status && !status.ok && (
                    <div className="text-sm text-red-600">
                        <p>Request failed: {status.error}</p>
                        <p>Proxy path expected: {status.viaProxy ? "/api" : "(none)"}</p>
                    </div>
                )}
            </section>

            <p className="text-xs text-gray-500">
                Hint: A response header of <code>X-Powered-By: msw</code> indicates the mock service worker handled the
                request. If the
                base URL starts with <code>/api</code>, the browser uses the Next.js rewrite proxy to reach the backend.
                When MSW is disabled, the
                <code>X-Debug-User</code> header (if present) authenticates requests in the current dev backend.
            </p>
        </main>
    );
}
