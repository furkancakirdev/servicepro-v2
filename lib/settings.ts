import "server-only";

import type { Prisma } from "@prisma/client";

import { calculateYearlyBadgeStandings } from "@/lib/badges";
import { getScoreObjectionQueue } from "@/lib/objections";
import { prisma } from "@/lib/prisma";
import { getOnHoldDefaultDays } from "@/lib/system-settings";

export type SettingsUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
  };
}>;

export type SettingsBoat = Prisma.BoatGetPayload<{
  include: {
    _count: {
      select: {
        jobs: true;
      };
    };
  };
}>;

export type SettingsCategory = Prisma.ServiceCategoryGetPayload<{
  select: {
    id: true;
    name: true;
    subScope: true;
    multiplier: true;
    brandHints: true;
    isActive: true;
    sortOrder: true;
  };
}>;

export type SettingsPageData = {
  yearlyStandings: Awaited<ReturnType<typeof calculateYearlyBadgeStandings>>;
  objectionQueue: Awaited<ReturnType<typeof getScoreObjectionQueue>>;
  users: SettingsUser[];
  boats: SettingsBoat[];
  categories: SettingsCategory[];
  onHoldDefaultDays: Awaited<ReturnType<typeof getOnHoldDefaultDays>>;
};

export async function getSettingsPageData(
  selectedYear: number
): Promise<SettingsPageData> {
  const [
    yearlyStandings,
    objectionQueue,
    users,
    boats,
    categories,
    onHoldDefaultDays,
  ] = await Promise.all([
    calculateYearlyBadgeStandings(selectedYear),
    getScoreObjectionQueue(6),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
    prisma.boat.findMany({
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.serviceCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        subScope: true,
        multiplier: true,
        brandHints: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    getOnHoldDefaultDays(),
  ]);

  return {
    yearlyStandings,
    objectionQueue,
    users,
    boats,
    categories,
    onHoldDefaultDays,
  };
}
