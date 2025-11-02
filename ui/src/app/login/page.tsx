"use client";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/AuthProvider";
import type {Role} from "@/lib/auth-types";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

function routeForRole(role: Role): string {
  switch (role) {
    case "admin": return "/admin";
    case "teacher": return "/teacher";
    default: return "/parent";
  }
}

export default function LoginPage() {
    const {user, login} = useAuth();
    const router = useRouter();
    const [role, setRole] = useState<Role>("parent");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // In Firebase mode, redirect to /signin page which has the proper UI
        if (AUTH_MODE === "firebase") {
            router.replace("/signin");
            return;
        }

        // In mock mode, if already logged in, redirect to appropriate dashboard
        if (user) {
            router.replace(routeForRole(user.role));
        }
    }, [user, router]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await login(role);
            router.replace(routeForRole(role));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    // In Firebase mode, show loading while redirecting
    if (AUTH_MODE === "firebase") {
        return (
            <div className="prose">
                <p>Redirecting to sign in...</p>
            </div>
        );
    }

    // Mock mode: show the role selector form
    return (
        <div className="prose">
            <h1>Login</h1>
            <p>Select your role to continue</p>
            <form onSubmit={onSubmit} className="not-prose flex items-center gap-3">
                <label htmlFor="role">Role</label>
                <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="border rounded px-2 py-1"
                >
                    <option value="parent">Parent</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={submitting} className="border rounded px-3 py-1">
                    {submitting ? "Signing in..." : "Sign in"}
                </button>
            </form>
            {error && (
                <div role="alert" className="text-red-600 text-sm mt-2">
                    {error}
                </div>
            )}
        </div>
    );
}
