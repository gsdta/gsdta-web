"use client";
import {useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";
import type {Role} from "@/lib/auth-types";

const STORAGE_KEY = "auth:user";

type Props = { children: React.ReactNode; roles?: Role[]; deferUnauthRedirect?: boolean };

export function Protected({children, roles, deferUnauthRedirect = false}: Props) {
    const {user, loading} = useAuth();
    const router = useRouter();
    const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                if (deferUnauthRedirect) return;
                // If we have a stored user, defer redirect to allow AuthProvider to hydrate
                if (typeof window !== "undefined") {
                    const raw = sessionStorage.getItem(STORAGE_KEY);
                    if (raw) return;
                }
                if (!redirectTimer.current) {
                    redirectTimer.current = setTimeout(() => {
                        router.replace("/login");
                    }, 300);
                }
            } else if (roles && !roles.includes(user.role)) {
                router.replace("/dashboard");
            }
        }
        return () => {
            if (redirectTimer.current) {
                clearTimeout(redirectTimer.current);
                redirectTimer.current = null;
            }
        };
    }, [user, loading, roles, router, deferUnauthRedirect]);

    if (loading) return <div>Loading…</div>;
    if (!user) {
        if (deferUnauthRedirect) return <>{children}</>; // allow render while auth hydrates
        return null;
    }
    if (roles && !roles.includes(user.role)) return null; // redirected
    return <>{children}</>;
}
