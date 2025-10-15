"use client";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type {Role, User} from "@/lib/auth-types";
import {setDebugUser} from "@/lib/api-client";

declare global {
    interface Window {
        __mswReady?: Promise<void>;
    }
}

const STORAGE_KEY = "auth:user";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const USE_MSW = process.env.NEXT_PUBLIC_USE_MSW !== "false";

function buildDebugUserSpec(role: Role): string {
    const r = role;
    const id = `u-${r}`;
    const email = `${r}@example.com`;
    const name = r.charAt(0).toUpperCase() + r.slice(1);
    return `${id}|${r}|${email}|${name}`; // id|roles|email|name
}

async function fetchMe(): Promise<User | null> {
    try {
        const res = await fetch(`${BASE_URL}/auth/me`, {credentials: "include"});
        if (!res.ok) return null;
        const data: unknown = await res.json();
        if (typeof data === "object" && data !== null) {
            // If wrapped { user: {...} }
            if ("user" in data) {
                const wrapper = data as { user?: unknown };
                const userVal = wrapper.user;
                if (userVal && typeof userVal === "object") {
                    const u = userVal as Record<string, unknown>;
                    const roleRaw = (u.role as string) || (Array.isArray(u.roles) ? (u.roles[0] as string) : "parent");
                    return {
                        id: typeof u.id === "string" ? u.id : "",
                        name: typeof u.name === "string" ? u.name : "",
                        email: typeof u.email === "string" ? u.email : "",
                        role: (roleRaw as Role) || "parent",
                    };
                }
            }
            // Or flat principal
            const flat = data as Record<string, unknown>;
            const roleRaw = (flat.role as string) || (Array.isArray(flat.roles) ? (flat.roles[0] as string) : "parent");
            return {
                id: typeof flat.id === "string" ? flat.id : "",
                name: typeof flat.name === "string" ? flat.name : "",
                email: typeof flat.email === "string" ? flat.email : "",
                role: (roleRaw as Role) || "parent",
            };
        }
        return null;
    } catch {
        return null;
    }
}

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (role: Role) => Promise<void>;
    logout: () => Promise<void>;
    setRole: (role: Role) => Promise<void>;
}

async function waitForMsw() {
    if (!USE_MSW || typeof window === "undefined") return; // Skip waiting if MSW disabled
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
        } catch { /* ignore */
        }
    }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const hasManualAuth = useRef(false);

    // Hydrate from sessionStorage synchronously on first render
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as User;
                setUser(parsed);
            }
        } catch {
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            let hasStoredAuth = false;
            try {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                hasStoredAuth = raw !== null;
            } catch {
            }

            try {
                if (USE_MSW) {
                    await waitForMsw();
                    const res = await fetch(`${BASE_URL}/auth/session`, {credentials: "include"});
                    if (res.ok) {
                        const data = (await res.json()) as { user: User };
                        if (!cancelled && !hasManualAuth.current) {
                            setUser(data.user);
                            try {
                                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
                            } catch {
                            }
                        }
                    } else if (!cancelled && !hasManualAuth.current && !hasStoredAuth) {
                        setUser(null);
                        try {
                            sessionStorage.removeItem(STORAGE_KEY);
                        } catch {
                        }
                    }
                } else {
                    // Debug header mode: if a stored debug spec exists, fetch /auth/me
                    const me = await fetchMe();
                    if (me && !cancelled) {
                        setUser(me);
                        try {
                            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(me));
                        } catch {
                        }
                    } else if (!cancelled && !hasStoredAuth) {
                        setUser(null);
                        try {
                            sessionStorage.removeItem(STORAGE_KEY);
                        } catch {
                        }
                    }
                }
            } catch {
                if (!cancelled && !hasManualAuth.current && !hasStoredAuth) {
                    setUser(null);
                    try {
                        sessionStorage.removeItem(STORAGE_KEY);
                    } catch {
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback(async (role: Role) => {
        hasManualAuth.current = true;
        if (USE_MSW) {
            await waitForMsw();
            try {
                const res = await fetch(`${BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    credentials: "include",
                    body: JSON.stringify({role}),
                });
                if (!res.ok) throw new Error("Login failed");
                const data = (await res.json()) as { user: User };
                setUser(data.user);
                try {
                    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
                } catch {
                }
                return;
            } catch {/* fallback below */
            }
        }
        // Debug header mode or fallback
        const spec = buildDebugUserSpec(role);
        setDebugUser(spec);
        const me = await fetchMe();
        const fallback: User = me || {id: `u-${role}`, name: role, email: `${role}@example.com`, role};
        setUser(fallback);
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
        } catch {
        }
    }, []);

    const logout = useCallback(async () => {
        hasManualAuth.current = true;
        if (USE_MSW) {
            await waitForMsw();
            try {
                await fetch(`${BASE_URL}/auth/logout`, {method: "POST", credentials: "include"});
            } catch {
            }
        }
        setDebugUser(null);
        setUser(null);
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
        }
    }, []);

    const setRole = useCallback(async (role: Role) => {
        hasManualAuth.current = true;
        if (USE_MSW) {
            await waitForMsw();
            try {
                const res = await fetch(`${BASE_URL}/auth/role`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    credentials: "include",
                    body: JSON.stringify({role}),
                });
                if (res.ok) {
                    const data = (await res.json()) as { user: User };
                    setUser(data.user);
                    try {
                        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
                    } catch {
                    }
                    return;
                }
            } catch {/* fallback to debug */
            }
        }
        const spec = buildDebugUserSpec(role);
        setDebugUser(spec);
        const me = await fetchMe();
        setUser((/* prev */) => {
            const next = me || {id: `u-${role}`, name: role, email: `${role}@example.com`, role};
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
            }
            return next;
        });
    }, []);

    const value = useMemo(
        () => ({user, loading, login, logout, setRole}),
        [user, loading, login, logout, setRole],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
