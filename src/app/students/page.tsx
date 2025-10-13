"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function StudentsPage() {
  return (
    <Protected roles={["parent", "admin"]}>
      <div className="prose">
        <h1>Students</h1>
        <p>Manage student profiles (mocked).</p>
      </div>
    </Protected>
  );
}
