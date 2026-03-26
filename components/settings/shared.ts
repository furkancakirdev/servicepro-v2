import { Role } from "@prisma/client";

import { boatTypeOptions } from "@/lib/jobs";

export const settingsYearCardStyles = [
  "border-amber-300 bg-amber-50",
  "border-slate-300 bg-slate-50",
  "border-orange-300 bg-orange-50",
] as const;

export const settingsTabValues = [
  "profile",
  "team",
  "boats",
  "categories",
  "system",
] as const;

export type SettingsTabValue = (typeof settingsTabValues)[number];

export function parseSettingsTab(
  value: string | undefined,
  fallback: SettingsTabValue = "profile"
): SettingsTabValue {
  return settingsTabValues.includes(value as SettingsTabValue)
    ? (value as SettingsTabValue)
    : fallback;
}

export const settingsRoleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Koordinatör",
  TECHNICIAN: "Teknisyen",
  WORKSHOP_CHIEF: "Usta",
};

export const settingsBoatTypeChoices = [...new Set([...boatTypeOptions, "OTHER"])];

export const settingsInputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean";

export const settingsTextareaClassName =
  "min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean";
