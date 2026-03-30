"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";

import RouteToastListener from "@/components/layout/RouteToastListener";
import { ThemeProvider, useTheme } from "@/components/layout/ThemeProvider";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      richColors
      position="top-right"
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast:
            "font-sans border border-border/70 bg-card text-card-foreground shadow-panel backdrop-blur",
          description: "text-slate-500 dark:text-slate-400",
        },
      }}
    />
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Suspense fallback={null}>
        <RouteToastListener />
      </Suspense>
      {children}
      <ThemedToaster />
    </ThemeProvider>
  );
}
