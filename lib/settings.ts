import "server-only";

import type { Prisma } from "@prisma/client";

import { calculateYearlyBadgeStandings } from "@/lib/badges";
import { getScoreObjectionQueue } from "@/lib/objections";
import { prisma } from "@/lib/prisma";
import {
  buildRoleAuditLogPayload,
  buildSystemSettingAuditLogPayload,
  generateTemporaryPassword,
} from "@/lib/settings-audit";
import { getOnHoldDefaultDays } from "@/lib/system-settings";

export {
  buildRoleAuditLogPayload,
  buildSystemSettingAuditLogPayload,
  generateTemporaryPassword,
};

export type SettingsUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    mustChangePassword: true;
    tempPasswordIssuedAt: true;
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

export type SettingsAuditLog = Prisma.EvaluationChangeLogGetPayload<{
  include: {
    changedBy: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export type PersonnelActivationFlash = {
  name: string;
  email: string;
  temporaryPassword: string;
};

export type SettingsPageData = {
  yearlyStandings: Awaited<ReturnType<typeof calculateYearlyBadgeStandings>>;
  objectionQueue: Awaited<ReturnType<typeof getScoreObjectionQueue>>;
  users: SettingsUser[];
  boats: SettingsBoat[];
  categories: SettingsCategory[];
  onHoldDefaultDays: Awaited<ReturnType<typeof getOnHoldDefaultDays>>;
  personnelAuditLogs: SettingsAuditLog[];
  systemAuditLogs: SettingsAuditLog[];
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
    personnelAuditLogs,
    systemAuditLogs,
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
        mustChangePassword: true,
        tempPasswordIssuedAt: true,
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
    prisma.evaluationChangeLog.findMany({
      where: {
        entityType: {
          in: ["USER_CREATE", "USER_ROLE"],
        },
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
    prisma.evaluationChangeLog.findMany({
      where: {
        entityType: "SYSTEM_SETTING",
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  return {
    yearlyStandings,
    objectionQueue,
    users,
    boats,
    categories,
    onHoldDefaultDays,
    personnelAuditLogs,
    systemAuditLogs,
  };
}
