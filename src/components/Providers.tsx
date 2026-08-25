"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { AppProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppProvider>{children}</AppProvider>
    </ThemeProvider>
  );
}
