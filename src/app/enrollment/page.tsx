"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function EnrollmentPage() {
  return (
    <Protected roles={["parent", "admin"]}>
      <div className="prose">
        <h1>Enrollment</h1>
        <p>Apply for classes and review status (mocked).</p>
      </div>
    </Protected>
  );
}
