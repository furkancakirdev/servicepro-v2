import { prisma } from "@/lib/prisma";

export const DEFAULT_ON_HOLD_DAYS = 3;
export const MAX_ON_HOLD_DAYS = 14;

export const SYSTEM_SETTING_KEYS = {
  onHoldDefaultDays: "ON_HOLD_DEFAULT_DAYS",
} as const;

function parseSettingInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), MAX_ON_HOLD_DAYS);
}

export async function getOnHoldDefaultDays() {
  const setting = await prisma.systemSetting.findUnique({
    where: {
      key: SYSTEM_SETTING_KEYS.onHoldDefaultDays,
    },
    select: {
      value: true,
    },
  });

  return parseSettingInt(setting?.value, DEFAULT_ON_HOLD_DAYS);
}
