"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/auth-types";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role>("parent");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(role);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="prose">
      <h1>Login</h1>
      <p>Select a role to sign in (mocked):</p>
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
          {submitting ? "Signing in…" : "Sign in"}
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
