"use client";

import { useAuth } from "@/components/AuthProvider";

/**
 * Hook to check if the current user has write access in admin sections.
 * Returns true if user has admin or super_admin role.
 * Returns false if user only has admin_readonly role.
 */
export function useAdminWriteAccess(): boolean {
    const { user } = useAuth();

    if (!user) return false;

    const roles = user.roles || [];

    // If user has admin or super_admin, they can write
    if (roles.includes("admin") || roles.includes("super_admin")) {
        return true;
    }

    // admin_readonly cannot write
    return false;
}

/**
 * Hook to check if the current user is a read-only admin.
 * Returns true if user has admin_readonly but NOT admin or super_admin.
 */
export function useIsReadOnlyAdmin(): boolean {
    const { user } = useAuth();

    if (!user) return false;

    const roles = user.roles || [];

    return (
        roles.includes("admin_readonly") &&
        !roles.includes("admin") &&
        !roles.includes("super_admin")
    );
}
