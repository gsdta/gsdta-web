// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\admin\page.tsx
"use client";
import React from "react";
import { Protected } from "@/components/Protected";
import { TeacherInviteForm } from "@/components/TeacherInviteForm";
import Link from "next/link";

export default function AdminPage() {
  return (
    <Protected roles={["admin"]}>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="prose max-w-none">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to the admin dashboard.</p>
        </div>

        {/* Quick Links */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/users/teachers/list"
              className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-500 transition-all"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">View All Teachers</h3>
              <p className="text-sm text-gray-600">
                View, search, and manage teacher accounts
              </p>
            </Link>
          </div>
        </section>

        {/* Teacher Invites */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Teacher</h2>
          <TeacherInviteForm />
        </section>
      </div>
    </Protected>
  );
}

