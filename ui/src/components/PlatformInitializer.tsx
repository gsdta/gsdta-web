"use client";

import { useEffect } from "react";
import { initializeWebPlatform } from "@/platform";
import { isPlatformInitialized } from "@gsdta/shared-core";

/**
 * Initializes the web platform adapter.
 * This should be rendered early in the app tree, before any API calls are made.
 */
export function PlatformInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize once
    if (!isPlatformInitialized()) {
      initializeWebPlatform();
    }
  }, []);

  // Also initialize during SSR/initial render for immediate availability
  if (typeof window !== "undefined" && !isPlatformInitialized()) {
    initializeWebPlatform();
  }

  return <>{children}</>;
}
