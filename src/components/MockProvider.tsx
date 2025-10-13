"use client";
import { ReactNode, useEffect } from "react";

export function MockProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const useMsw = process.env.NEXT_PUBLIC_USE_MSW !== "false";
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development" && useMsw) {
      import("@/mocks/browser").then(({ worker }) => {
        worker.start({ onUnhandledRequest: "bypass" });
      });
    }
  }, []);

  return <>{children}</>;
}
