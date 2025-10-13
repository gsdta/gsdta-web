"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/auth-types";

export function Protected({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (roles && !roles.includes(user.role)) {
        // redirect unauthorized roles to dashboard
        router.replace("/dashboard");
      }
    }
  }, [user, loading, roles, router]);

  if (loading) return <div>Loading…</div>;
  if (!user) return null; // redirected
  if (roles && !roles.includes(user.role)) return null; // redirected
  return <>{children}</>;
}
