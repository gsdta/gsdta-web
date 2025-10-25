// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\admin\page.tsx
"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function AdminPage() {
  return (
    <Protected roles={["admin"]}>
      <div className="prose">
        <h1>Admin</h1>
        <p>Welcome to the admin dashboard.</p>
      </div>
    </Protected>
  );
}

