"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function ClassesPage() {
  return (
    <Protected roles={["teacher", "parent", "admin"]}>
      <div className="prose">
        <h1>Classes</h1>
        <p>View classes and rosters (mocked).</p>
      </div>
    </Protected>
  );
}
