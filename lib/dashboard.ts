import "server-only";

import { endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { JobStatus, Role } from "@prisma/client";

import { activeOperationalStatuses, getJobOperationalReference } from "@/lib/jobs";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  getMonthlyScoreboard,
  resolveScoreboardPeriod,
  summarizeMissingEvaluations,
} from "@/lib/scoreboard";
import type { CurrentAppUser } from "@/lib/auth";
import type {
  DashboardActivityPoint,
  DashboardAlert,
  DashboardAssignedJobGroup,
  DashboardData,
} from "@/types";

function getEmptyDashboardData(): DashboardData {
  const now = new Date();
  const activity: DashboardActivityPoint[] = Array.from({ length: 30 }, (_, index) => {
    const date = subDays(startOfDay(now), 29 - index);

    return {
      date: date.toISOString(),
      label: format(date, "d MMM", { locale: tr }),
      created: 0,
      completed: 0,
      closed: 0,
    };
  });

  return {
    activeJobsCount: 0,
    completedThisMonthCount: 0,
    pendingScoringCount: 0,
    leader: null,
    myJobs: [],
    alerts: [],
    activity,
    topFive: [],
    overdueHoldCount: 0,
    missingWorkshopCount: 0,
    missingCoordinatorCount: 0,
  };
}

function formatJobTimeLabel(date: Date) {
  return format(date, "HH:mm", { locale: tr });
}

function groupAssignedJobs(
  jobs: Array<{
    id: string;
    status: JobStatus;
    location: string | null;
    startedAt: Date | null;
    createdAt: Date;
    boat: { name: string };
    category: { name: string };
  }>
): DashboardAssignedJobGroup[] {
  const grouped = new Map<
    string,
    Array<{
      id: string;
      boatName: string;
      categoryName: string;
      status: JobStatus;
      location: string;
      timeLabel: string;
      sortDate: string;
    }>
  >();

  const sortedJobs = [...jobs].sort((left, right) => {
    const leftDate = getJobOperationalReference(left);
    const rightDate = getJobOperationalReference(right);

    return leftDate.getTime() - rightDate.getTime();
  });

  for (const job of sortedJobs) {
    const location = job.location?.trim() || "Lokasyon bekleniyor";
    const operationalReference = getJobOperationalReference(job);
    const sortDate = operationalReference.toISOString();
    const items = grouped.get(location) ?? [];

    items.push({
      id: job.id,
      boatName: job.boat.name,
      categoryName: job.category.name,
      status: job.status,
      location,
      timeLabel: formatJobTimeLabel(operationalReference),
      sortDate,
    });

    grouped.set(location, items);
  }

  return Array.from(grouped.entries())
    .map(([location, locationJobs]) => ({
      location,
      jobs: locationJobs,
    }))
    .sort((left, right) => left.location.localeCompare(right.location, "tr"));
}

export async function getDashboardData(
  currentUser: Pick<CurrentAppUser, "id" | "role">
): Promise<DashboardData> {
  if (!isDatabaseConfigured()) {
    return getEmptyDashboardData();
  }

  const now = new Date();
  const { month, year } = resolveScoreboardPeriod();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thirtyDaysAgo = subDays(startOfDay(now), 29);
  const assignedJobWhere =
    currentUser.role === Role.TECHNICIAN
      ? {
          assignments: {
            some: {
              userId: currentUser.id,
            },
          },
        }
      : {};

  const [
    activeJobsCount,
    completedThisMonthCount,
    pendingScoringCount,
    assignedJobs,
    overdueHoldJobs,
    recentJobs,
    scoreboard,
  ] = await Promise.all([
    prisma.serviceJob.count({
      where: {
        status: {
          in: activeOperationalStatuses,
        },
      },
    }),
    prisma.serviceJob.count({
      where: {
        completedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    }),
    prisma.serviceJob.count({
      where: {
        status: JobStatus.TAMAMLANDI,
        deliveryReport: {
          isNot: null,
        },
        evaluation: {
          is: null,
        },
        jobScores: {
          none: {},
        },
      },
    }),
    prisma.serviceJob.findMany({
      where: {
        status: {
          in: activeOperationalStatuses,
        },
        ...assignedJobWhere,
      },
      select: {
        id: true,
        status: true,
        location: true,
        startedAt: true,
        createdAt: true,
        boat: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        {
          startedAt: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      take: 20,
    }),
    prisma.serviceJob.findMany({
      where: {
        status: JobStatus.BEKLEMEDE,
        holdUntil: {
          lt: now,
        },
      },
      select: {
        id: true,
        holdUntil: true,
      },
    }),
    prisma.serviceJob.findMany({
      where: {
        OR: [
          {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
          {
            completedAt: {
              gte: thirtyDaysAgo,
            },
          },
          {
            closedAt: {
              gte: thirtyDaysAgo,
            },
          },
        ],
      },
      select: {
        createdAt: true,
        completedAt: true,
        closedAt: true,
      },
    }),
    getMonthlyScoreboard(month, year),
  ]);

  const myJobs = groupAssignedJobs(assignedJobs);
  const { missingWorkshopCount, missingCoordinatorCount } = summarizeMissingEvaluations(
    scoreboard.entries
  );

  const alerts: DashboardAlert[] = [];

  if (pendingScoringCount > 0) {
    alerts.push({
      id: "pending-scoring",
      tone: "amber",
      title: `${pendingScoringCount} iş puanlanmayı bekliyor`,
      description:
        "Tamamlandı durumundaki işler teslim raporu ve Form 1 sonrasında kapanmayı bekliyor.",
      href: "/jobs?status=TAMAMLANDI&pendingScoring=1",
    });
  }

  if (missingWorkshopCount > 0 || missingCoordinatorCount > 0) {
    alerts.push({
      id: "missing-evaluations",
      tone: "sky",
      title: "Aylık değerlendirme eksikleri var",
      description: `${missingWorkshopCount} usta ve ${missingCoordinatorCount} koordinatör değerlendirmesi bekleniyor.`,
      href: "/scoreboard",
    });
  }

  if (overdueHoldJobs.length > 0) {
    const maxOverdueDays = overdueHoldJobs.reduce((max, job) => {
      if (!job.holdUntil) {
        return max;
      }

      const overdueDays = Math.max(
        Math.floor((now.getTime() - job.holdUntil.getTime()) / (24 * 60 * 60 * 1000)),
        0
      );

      return Math.max(max, overdueDays);
    }, 0);

    alerts.push({
      id: "overdue-hold",
      tone: "rose",
      title: `${overdueHoldJobs.length} iş beklemede`,
      description: `En eski bekleme kaydı ${maxOverdueDays} gün gecikmiş durumda.`,
      href: "/jobs?status=BEKLEMEDE",
    });
  }

  const activityMap = new Map<string, DashboardActivityPoint>();

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = subDays(startOfDay(now), offset);
    const key = format(date, "yyyy-MM-dd");

    activityMap.set(key, {
      date: date.toISOString(),
      label: format(date, "d MMM", { locale: tr }),
      created: 0,
      completed: 0,
      closed: 0,
    });
  }

  for (const job of recentJobs) {
    const createdKey = format(job.createdAt, "yyyy-MM-dd");
    const createdEntry = activityMap.get(createdKey);

    if (createdEntry) {
      createdEntry.created += 1;
    }

    if (job.completedAt) {
      const completedKey = format(job.completedAt, "yyyy-MM-dd");
      const completedEntry = activityMap.get(completedKey);

      if (completedEntry) {
        completedEntry.completed += 1;
      }
    }

    if (job.closedAt) {
      const closedKey = format(job.closedAt, "yyyy-MM-dd");
      const closedEntry = activityMap.get(closedKey);

      if (closedEntry) {
        closedEntry.closed += 1;
      }
    }
  }

  return {
    activeJobsCount,
    completedThisMonthCount,
    pendingScoringCount,
    leader: scoreboard.entries[0]
      ? {
          name: scoreboard.entries[0].user.name,
          score: scoreboard.entries[0].total,
        }
      : null,
    myJobs,
    alerts,
    activity: Array.from(activityMap.values()),
    topFive: scoreboard.entries.slice(0, 5),
    overdueHoldCount: overdueHoldJobs.length,
    missingWorkshopCount,
    missingCoordinatorCount,
  };
}
