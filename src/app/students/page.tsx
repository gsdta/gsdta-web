"use client";
import React from "react";
import { Protected } from "@/components/Protected";
import { StudentsList } from "@/components/StudentsList";

export default function StudentsPage() {
  return (
    <Protected roles={["parent", "admin"]} deferUnauthRedirect>
      <StudentsList />
    </Protected>
  );
}
