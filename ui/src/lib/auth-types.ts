export type Role = "super_admin" | "admin" | "admin_readonly" | "teacher" | "parent";

export type AuthProvider = "password" | "google" | null;

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    // All roles the user has (for multi-role users)
    roles: Role[];
    // Optional email verification flag (only meaningful in Firebase auth mode)
    emailVerified?: boolean;
    // Auth provider used for sign-in (only meaningful in Firebase auth mode)
    authProvider?: AuthProvider;
}
