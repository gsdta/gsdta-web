// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\admin\page.tsx
"use client";
import React from "react";
import { Protected } from "@/components/Protected";
import { TeacherInviteForm } from "@/components/TeacherInviteForm";

export default function AdminPage() {
  return (
    <Protected roles={["admin"]}>
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        <div className="prose">
          <h1>Admin Dashboard</h1>
          <p>Welcome to the admin dashboard.</p>
        </div>

        <section>
          <TeacherInviteForm />
        </section>
      </div>
    </Protected>
  );
}

