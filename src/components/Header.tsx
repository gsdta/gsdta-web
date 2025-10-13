"use client";
import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          GSDTA
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/students" className="hover:underline">
            Students
          </Link>
          <Link href="/enrollment" className="hover:underline">
            Enrollment
          </Link>
          <Link href="/classes" className="hover:underline">
            Classes
          </Link>
          <Link href="/login" className="hover:underline">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
