"use client";
import React from "react";
import { Protected } from "@/components/Protected";

export default function DashboardPage() {
  return (
    <Protected>
      <div className="prose">
        <h1>Dashboard</h1>
        <p>Welcome to your dashboard.</p>
      </div>
    </Protected>
  );
}
