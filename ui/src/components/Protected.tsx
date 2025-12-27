"use client";
import {useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";
import type {Role} from "@/lib/auth-types";

const STORAGE_KEY = "auth:user";
// Compute auth mode at runtime so tests can flip env per test
function isFirebaseMode(): boolean {
    return process.env.NEXT_PUBLIC_AUTH_MODE === "firebase";
}

function routeForRole(role: Role): string {
    switch (role) {
        case "super_admin": return "/admin";  // Super admin uses admin dashboard
        case "admin": return "/admin";
        case "teacher": return "/teacher";
        default: return "/parent";
    }
}

/**
 * Check if user has required role, with role hierarchy:
 * - super_admin can access anything requiring 'admin'
 */
function hasRequiredRole(userRole: Role, requiredRoles: Role[]): boolean {
    // Direct match
    if (requiredRoles.includes(userRole)) return true;
    // Role hierarchy: super_admin has admin privileges
    if (userRole === "super_admin" && requiredRoles.includes("admin")) return true;
    return false;
}

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
                if (typeof window === "undefined") return;
                const raw = sessionStorage.getItem(STORAGE_KEY);
                if (raw) return;
                if (!redirectTimer.current) {
                    redirectTimer.current = setTimeout(() => {
                        router.replace(isFirebaseMode() ? "/signin" : "/login");
                    }, 300);
                }
            } else if (isFirebaseMode() && process.env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION !== "true" && user.emailVerified === false) {
                // Gate unverified email/password users; send them to /signin to see banner
                router.replace("/signin?verify=true");
            } else if (roles && !hasRequiredRole(user.role, roles)) {
                router.replace(routeForRole(user.role));
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
        if (deferUnauthRedirect) return <>{children}</>;
        return null;
    }
    if (isFirebaseMode() && process.env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION !== "true" && user.emailVerified === false) return null; // redirected to /signin
    if (roles && !hasRequiredRole(user.role, roles)) return null; // redirected to allowed landing
    return <>{children}</>;
}
