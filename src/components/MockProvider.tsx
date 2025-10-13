"use client";
import { ReactNode, useEffect } from "react";

declare global {
  interface Window {
    __mswReady?: Promise<void>;
  }
}

export function MockProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const useMsw = process.env.NEXT_PUBLIC_USE_MSW !== "false";

    if (typeof window !== "undefined" && useMsw) {
      import("@/mocks/browser").then(({ worker }) => {
        const p = worker.start({
          onUnhandledRequest: "bypass",
        }) as Promise<void>;

        window.__mswReady = p;
      });
    }
  }, []);

  return <>{children}</>;
}
