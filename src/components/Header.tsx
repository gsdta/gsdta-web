"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/auth-types";

const roleNav: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/students", label: "Students" },
    { href: "/classes", label: "Classes" },
    { href: "/enrollment", label: "Enrollment" },
  ],
  teacher: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/classes", label: "Classes" },
  ],
  parent: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/students", label: "Students" },
    { href: "/enrollment", label: "Enrollment" },
    { href: "/classes", label: "Classes" }, // Show Classes for parent per test expectation
  ],
};

export function Header() {
  const { user, setRole } = useAuth();

  const onRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await setRole(e.target.value as Role);
  };

  return (
    <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold">
          GSDTA
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          {user ? (
            <>
              {roleNav[user.role].map((item) => (
                <Link key={item.href} href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              ))}
              <span aria-live="polite" className="text-gray-600">
                {user.name} ({user.role})
              </span>
              <label className="sr-only" htmlFor="role-select">
                Switch role
              </label>
              <select
                id="role-select"
                value={user.role}
                onChange={onRoleChange}
                className="border rounded px-2 py-1 text-xs"
                aria-label="Switch role"
              >
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <Link href="/logout" className="hover:underline">
                Logout
              </Link>
            </>
          ) : (
            <Link href="/login" className="hover:underline">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
