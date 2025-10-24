// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\parent\page.tsx
"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function ParentPage() {
  return (
    <Protected roles={["parent"]}>
      <div className="prose">
        <h1>Parent</h1>
        <p>Welcome to the parent dashboard.</p>
      </div>
    </Protected>
  );
}

