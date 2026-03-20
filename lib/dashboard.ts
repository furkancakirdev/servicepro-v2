import "server-only";

import { endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { EvaluatorType, JobStatus, Role } from "@prisma/client";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getMonthlyScoreboard, resolveScoreboardPeriod } from "@/lib/scoreboard";
import type { CurrentAppUser } from "@/lib/auth";
import type {
  DashboardActivityPoint,
  DashboardAlert,
  DashboardAssignedJobGroup,
  DashboardData,
  NotificationCenterData,
} from "@/types";

const activeJobStatuses: JobStatus[] = [
  JobStatus.PLANLANDI,
  JobStatus.DEVAM_EDIYOR,
  JobStatus.BEKLEMEDE,
];

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
    const leftDate = left.startedAt ?? left.createdAt;
    const rightDate = right.startedAt ?? right.createdAt;

    return leftDate.getTime() - rightDate.getTime();
  });

  for (const job of sortedJobs) {
    const location = job.location?.trim() || "Lokasyon bekleniyor";
    const sortDate = (job.startedAt ?? job.createdAt).toISOString();
    const items = grouped.get(location) ?? [];

    items.push({
      id: job.id,
      boatName: job.boat.name,
      categoryName: job.category.name,
      status: job.status,
      location,
      timeLabel: formatJobTimeLabel(job.startedAt ?? job.createdAt),
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

async function syncOperationalNotifications() {
  if (!isDatabaseConfigured()) {
    return;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const { month, year, label } = resolveScoreboardPeriod();
  const monthStart = startOfMonth(now);

  const [
    adminUsers,
    coordinatorUsers,
    workshopUsers,
    overdueHoldJobs,
    todayHoldNotifications,
    monthEvalNotifications,
    technicianCount,
    workshopCount,
    coordinatorCount,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { role: Role.COORDINATOR },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { role: Role.WORKSHOP_CHIEF },
      select: { id: true },
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
    }),
    prisma.notification.findMany({
      where: {
        type: "HOLD_REMINDER",
        createdAt: {
          gte: todayStart,
        },
      },
      select: {
        userId: true,
        metadata: true,
      },
    }),
    prisma.notification.findMany({
      where: {
        type: {
          in: ["MISSING_WORKSHOP_EVAL", "MISSING_COORDINATOR_EVAL"],
        },
        createdAt: {
          gte: monthStart,
        },
      },
      select: {
        userId: true,
        type: true,
        metadata: true,
      },
    }),
    prisma.user.count({
      where: {
        role: Role.TECHNICIAN,
      },
    }),
    prisma.monthlyEvaluation.count({
      where: {
        month,
        year,
        evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
      },
    }),
    prisma.monthlyEvaluation.count({
      where: {
        month,
        year,
        evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
      },
    }),
  ]);

  const existingHoldKeys = new Set(
    todayHoldNotifications
      .map((notification) => {
        const metadata = notification.metadata as { jobId?: string } | null;
        return metadata?.jobId ? `${notification.userId}:${metadata.jobId}` : null;
      })
      .filter(Boolean) as string[]
  );

  const overdueRecipients = [...adminUsers, ...coordinatorUsers];
  const holdNotificationsToCreate = overdueHoldJobs.flatMap((job) =>
    overdueRecipients
      .filter((recipient) => !existingHoldKeys.has(`${recipient.id}:${job.id}`))
      .map((recipient) => ({
        userId: recipient.id,
        type: "HOLD_REMINDER",
        title: "Beklemedeki is hatirlatmasi",
        body: `${job.boat.name} - ${job.category.name} isi icin bekleme suresi doldu.`,
        metadata: {
          jobId: job.id,
          createdForDate: format(now, "yyyy-MM-dd"),
        },
      }))
  );

  const missingWorkshopCount = Math.max(technicianCount - workshopCount, 0);
  const missingCoordinatorCount = Math.max(technicianCount - coordinatorCount, 0);
  const shouldSendMonthlyReminder = now.getDate() >= 25;

  const existingMonthlyKeys = new Set(
    monthEvalNotifications
      .map((notification) => {
        const metadata = notification.metadata as { month?: number; year?: number } | null;

        if (!metadata?.month || !metadata?.year) {
          return null;
        }

        return `${notification.userId}:${notification.type}:${metadata.year}-${metadata.month}`;
      })
      .filter(Boolean) as string[]
  );

  const workshopReminderRecipients = [...workshopUsers, ...adminUsers];
  const coordinatorReminderRecipients = [...coordinatorUsers, ...adminUsers];
  const evalNotificationsToCreate = [
    ...(shouldSendMonthlyReminder && missingWorkshopCount > 0
      ? workshopReminderRecipients
          .filter(
            (recipient) =>
              !existingMonthlyKeys.has(
                `${recipient.id}:MISSING_WORKSHOP_EVAL:${year}-${month}`
              )
          )
          .map((recipient) => ({
            userId: recipient.id,
            type: "MISSING_WORKSHOP_EVAL",
            title: "Aylik usta degerlendirmesi bekleniyor",
            body: `${label} icin ${missingWorkshopCount} teknisyenin Form 2 degerlendirmesi eksik.`,
            metadata: {
              month,
              year,
            },
          }))
      : []),
    ...(shouldSendMonthlyReminder && missingCoordinatorCount > 0
      ? coordinatorReminderRecipients
          .filter(
            (recipient) =>
              !existingMonthlyKeys.has(
                `${recipient.id}:MISSING_COORDINATOR_EVAL:${year}-${month}`
              )
          )
          .map((recipient) => ({
            userId: recipient.id,
            type: "MISSING_COORDINATOR_EVAL",
            title: "Aylik koordinator degerlendirmesi bekleniyor",
            body: `${label} icin ${missingCoordinatorCount} teknisyenin Form 3 degerlendirmesi eksik.`,
            metadata: {
              month,
              year,
            },
          }))
      : []),
  ];

  const notificationsToCreate = [
    ...holdNotificationsToCreate,
    ...evalNotificationsToCreate,
  ];

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({
      data: notificationsToCreate,
    });
  }
}

export async function getNotificationCenterData(
  userId: string
): Promise<NotificationCenterData> {
  if (!isDatabaseConfigured()) {
    return {
      unreadCount: 0,
      items: [],
    };
  }

  await syncOperationalNotifications();

  const [unreadCount, items] = await Promise.all([
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
    prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  return {
    unreadCount,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
      metadata:
        item.metadata && typeof item.metadata === "object"
          ? (item.metadata as Record<string, unknown>)
          : null,
    })),
  };
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
          in: activeJobStatuses,
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
      },
    }),
    prisma.serviceJob.findMany({
      where: {
        status: {
          in: activeJobStatuses,
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
  const missingWorkshopCount = scoreboard.entries.filter(
    (entry) => entry.workshopEvaluation === null
  ).length;
  const missingCoordinatorCount = scoreboard.entries.filter(
    (entry) => entry.coordinatorEvaluation === null
  ).length;

  const alerts: DashboardAlert[] = [];

  if (pendingScoringCount > 0) {
    alerts.push({
      id: "pending-scoring",
      tone: "amber",
      title: `${pendingScoringCount} is puanlanmayi bekliyor`,
      description:
        "Tamamlandi durumundaki isler teslim raporu ve Form 1 sonrasinda kapanmayi bekliyor.",
    });
  }

  if (missingWorkshopCount > 0 || missingCoordinatorCount > 0) {
    alerts.push({
      id: "missing-evaluations",
      tone: "sky",
      title: "Aylik degerlendirme eksikleri var",
      description: `${missingWorkshopCount} usta ve ${missingCoordinatorCount} koordinator degerlendirmesi bekleniyor.`,
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
      title: `${overdueHoldJobs.length} is beklemede`,
      description: `En eski bekleme kaydi ${maxOverdueDays} gun gecikmis durumda.`,
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
