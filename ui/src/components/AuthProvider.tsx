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
import type {Role, User, AuthProvider as AuthProviderType} from "@/lib/auth-types";
import type { User as FirebaseUser } from "firebase/auth";
import {setDebugUser, EFFECTIVE_BASE_URL, setAuthTokenProvider, apiFetch} from "@/lib/api-client";

// Firebase (loaded lazily to avoid errors in mock mode)
let firebaseLoaded = false as boolean;
async function lazyLoadFirebase() {
    if (firebaseLoaded) return;
    // Dynamic import to avoid bundling when not used
    await import("@/lib/firebase/client");
    firebaseLoaded = true;
}

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

declare global {
    interface Window { __mswReady?: Promise<void>; }
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

async function fetchMeLegacy(): Promise<User | null> {
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
                    const rolesRaw = Array.isArray(u.roles) ? (u.roles as string[]) : [];
                    const roles = toRoleArray(rolesRaw);
                    const role = pickRole(rolesRaw);
                    return {
                        id: typeof u.id === "string" ? u.id : "",
                        name: typeof u.name === "string" ? u.name : "",
                        email: typeof u.email === "string" ? u.email : "",
                        role,
                        roles,
                    };
                }
            }
            // Or flat principal
            const flat = data as Record<string, unknown>;
            const rolesRaw = Array.isArray(flat.roles) ? (flat.roles as string[]) : [];
            const roles = toRoleArray(rolesRaw);
            const role = pickRole(rolesRaw);
            return {
                id: typeof flat.id === "string" ? flat.id : "",
                name: typeof flat.name === "string" ? flat.name : "",
                email: typeof flat.email === "string" ? flat.email : "",
                role,
                roles,
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
    // Mock mode API (existing)
    login: (role: Role) => Promise<void>;
    logout: () => Promise<void>;
    setRole: (role: Role) => Promise<void>;
    // Firebase mode extras
    loginWithGoogle: () => Promise<void>;
    loginWithEmailPassword: (email: string, password: string) => Promise<void>;
    sendEmailVerification: () => Promise<void>;
    getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
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
        try { await window.__mswReady; } catch { /* ignore */ }
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
        } catch {}
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadMock() {
            let hasStoredAuth = false;
            try {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                hasStoredAuth = raw !== null;
            } catch {}
            try {
                if (USE_MSW) {
                    await waitForMsw();
                    const res = await fetch(`${BASE_URL}/auth/session`, {credentials: "include"});
                    if (res.ok) {
                        const data = (await res.json()) as { user: User };
                        if (!cancelled && !hasManualAuth.current) {
                            setUser(data.user);
                            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user)); } catch {}
                        }
                    } else if (!cancelled && !hasManualAuth.current && !hasStoredAuth) {
                        setUser(null);
                        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
                    }
                } else {
                    const me = await fetchMeLegacy();
                    if (me && !cancelled) {
                        setUser(me);
                        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(me)); } catch {}
                    } else if (!cancelled && !hasStoredAuth) {
                        setUser(null);
                        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
                    }
                }
            } catch {
                if (!cancelled && !hasManualAuth.current && !hasStoredAuth) {
                    setUser(null);
                    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        async function loadFirebase() {
            try {
                await lazyLoadFirebase();
                const { getFirebaseAuth } = await import("@/lib/firebase/client");
                const { onAuthStateChanged, onIdTokenChanged } = await import("firebase/auth");

                const auth = getFirebaseAuth();

                // Register token provider for apiFetch
                setAuthTokenProvider(async () => auth.currentUser ? await auth.currentUser.getIdToken() : null);

                const unsubscribeState = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
                    if (!fbUser) {
                        setUser(null);
                        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
                        if (!loading) setLoading(false);
                        return;
                    }
                    try {
                        const token = await fbUser.getIdToken();
                        const base = EFFECTIVE_BASE_URL || "/api";
                        type Me = { uid: string; email: string; name?: string; roles: string[]; emailVerified?: boolean };
                        let data: Me | null = null;
                        try {
                            // Use trailing slash to match UI's trailingSlash config and avoid 308 redirect that strips Auth header
                            data = await apiFetch<Me>(`${base}/v1/me/`, { rawUrl: true, headers: { Authorization: `Bearer ${token}` } });
                        } catch {
                            data = null;
                        }
                        if (!data) {
                             // If forbidden or not found, treat as signed out from app perspective
                             setUser(null);
                             try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
                         } else {
                            const roles = toRoleArray(data.roles);
                            const role = pickRole(data.roles);
                            const emailVerified = typeof data.emailVerified === 'boolean' ? data.emailVerified : fbUser.emailVerified;
                            const authProvider = getAuthProvider(fbUser);
                            const mapped: User = { id: data.uid, email: data.email, name: data.name || data.email, role, roles, emailVerified, authProvider };
                            setUser(mapped);
                            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mapped)); } catch {}
                         }
                    } catch {
                        setUser(null);
                        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
                    } finally {
                        if (loading) setLoading(false);
                    }
                });

                const unsubscribeToken = onIdTokenChanged(auth, async () => {
                    // Token changed. api-client token provider reads currentUser on demand; no action.
                });

                return () => {
                    unsubscribeState();
                    unsubscribeToken();
                    setAuthTokenProvider(null);
                };
            } catch {
                // Fallback to mock if firebase fails to init
                await loadMock();
                return () => {};
            }
        }

        if (AUTH_MODE === "firebase") {
            let cleanup: (() => void) | undefined;
            (async () => { cleanup = await loadFirebase(); })();
            return () => { cancelled = true; cleanup?.(); };
        }

        // In mock mode, kick off load and set cancellation on unmount
        (async () => { await loadMock(); })();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (role: Role) => {
        hasManualAuth.current = true;
        if (AUTH_MODE === "firebase") {
            // Not applicable; use loginWithGoogle/loginWithEmailPassword instead.
            throw new Error("Use Firebase sign-in methods in firebase auth mode");
        }
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
                try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user)); } catch {}
                return;
            } catch {/* fallback below */}
        }
        const spec = buildDebugUserSpec(role);
        setDebugUser(spec);
        const me = await fetchMeLegacy();
        const fallback: User = me || {id: `u-${role}`, name: role, email: `${role}@example.com`, role, roles: [role]};
        setUser(fallback);
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fallback)); } catch {}
    }, []);

    const logout = useCallback(async () => {
        hasManualAuth.current = true;
        if (AUTH_MODE === "firebase") {
            try {
                await lazyLoadFirebase();
                const { getFirebaseAuth } = await import("@/lib/firebase/client");
                const { signOut } = await import("firebase/auth");
                await signOut(getFirebaseAuth());
            } catch { /* ignore */ }
        }
        if (USE_MSW) {
            await waitForMsw();
            try { await fetch(`${BASE_URL}/auth/logout`, {method: "POST", credentials: "include"}); } catch {}
        }
        setDebugUser(null);
        setUser(null);
        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }, []);

    const setRole = useCallback(async (role: Role) => {
        hasManualAuth.current = true;
        if (AUTH_MODE === "firebase") {
            // In firebase mode, just update local state (role is client-side only)
            setUser((prev) => {
                if (!prev) return prev;
                // Verify the user has this role
                if (!prev.roles.includes(role)) {
                    console.warn(`User does not have role: ${role}`);
                    return prev;
                }
                const next = { ...prev, role };
                try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
                return next;
            });
            return;
        }
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
                    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user)); } catch {}
                    return;
                }
            } catch {/* fallback to debug */}
        }
        const spec = buildDebugUserSpec(role);
        setDebugUser(spec);
        const me = await fetchMeLegacy();
        setUser(() => {
            const next = me || {id: `u-${role}`, name: role, email: `${role}@example.com`, role, roles: [role]};
            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const loginWithGoogle = useCallback(async () => {
        if (AUTH_MODE !== "firebase") throw new Error("Google sign-in only in firebase mode");
        await lazyLoadFirebase();
        const { getFirebaseAuth, googleProvider } = await import("@/lib/firebase/client");
        const { signInWithRedirect } = await import("firebase/auth");
        await signInWithRedirect(getFirebaseAuth(), googleProvider);
        // onAuthStateChanged will set the user after redirect back
    }, []);

    const loginWithEmailPassword = useCallback(async (email: string, password: string) => {
        if (AUTH_MODE !== "firebase") throw new Error("Email/password sign-in only in firebase mode");
        await lazyLoadFirebase();
        const { getFirebaseAuth } = await import("@/lib/firebase/client");
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    }, []);
    const sendEmailVerification = useCallback(async () => {
        if (AUTH_MODE !== "firebase") throw new Error("Email verification only in firebase mode");
        await lazyLoadFirebase();
        const { getFirebaseAuth } = await import("@/lib/firebase/client");
        const { sendEmailVerification: sendVerification } = await import("firebase/auth");
        const auth = getFirebaseAuth();
        const u = auth.currentUser;
        if (!u) throw new Error("No user signed in");
        await sendVerification(u);
    }, []);


    const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
        if (AUTH_MODE !== "firebase") return null;
        try {
            await lazyLoadFirebase();
            const { getFirebaseAuth } = await import("@/lib/firebase/client");
            const auth = getFirebaseAuth();
            const u = auth.currentUser;
            if (!u) return null;
            return await u.getIdToken(forceRefresh);
        } catch { return null; }
    }, []);

    const value = useMemo(
        () => ({user, loading, login, logout, setRole, loginWithGoogle, loginWithEmailPassword, sendEmailVerification, getIdToken}),
        [user, loading, login, logout, setRole, loginWithGoogle, loginWithEmailPassword, sendEmailVerification, getIdToken],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

function pickRole(roles: string[]): Role {
    const rset = new Set(roles);
    if (rset.has("admin")) return "admin";
    if (rset.has("teacher")) return "teacher";
    return "parent";
}

function toRoleArray(roles: string[]): Role[] {
    const validRoles: Role[] = [];
    for (const r of roles) {
        if (r === "admin" || r === "teacher" || r === "parent") {
            validRoles.push(r);
        }
    }
    return validRoles.length > 0 ? validRoles : ["parent"];
}

function getAuthProvider(fbUser: FirebaseUser): AuthProviderType {
    const providerIds = fbUser.providerData.map(p => p.providerId);
    if (providerIds.includes("google.com")) return "google";
    if (providerIds.includes("password")) return "password";
    return null;
}
