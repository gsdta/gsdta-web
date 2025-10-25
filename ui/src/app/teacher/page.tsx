// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\teacher\page.tsx
"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function TeacherPage() {
  return (
    <Protected roles={["teacher"]}>
      <div className="prose">
        <h1>Teacher</h1>
        <p>Welcome to the teacher dashboard.</p>
      </div>
    </Protected>
  );
}

