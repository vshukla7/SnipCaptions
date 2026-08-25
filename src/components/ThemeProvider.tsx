"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Single-theme app. The black, clean Apple-style tokens live in globals.css
 * under :root, so the provider only flags the document for clarity.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);
  return <>{children}</>;
}
