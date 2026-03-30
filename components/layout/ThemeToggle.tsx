"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/layout/ThemeProvider";
import { Button } from "@/components/ui/button";

const nextThemeMap = {
  light: "dark",
  dark: "system",
  system: "light",
} as const;

const themeCopy = {
  light: {
    label: "Acik tema",
    icon: Sun,
  },
  dark: {
    label: "Koyu tema",
    icon: Moon,
  },
  system: {
    label: "Sistem temasi",
    icon: Monitor,
  },
} as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = themeCopy[theme];
  const Icon = current.icon;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      title={current.label}
      aria-label={current.label}
      className="border-border/70 bg-card/80 text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-muted"
      onClick={() => setTheme(nextThemeMap[theme])}
    >
      <Icon className="size-4" />
      <span className="sr-only">{current.label}</span>
    </Button>
  );
}
