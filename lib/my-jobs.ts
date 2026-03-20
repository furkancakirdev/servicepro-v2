import "server-only";

import { addDays, endOfDay, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { JobRole, JobStatus, Role } from "@prisma/client";

import { resolveDispatchTab } from "@/lib/dispatch";
import { openStatuses } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

export async function getMyJobsOverview(userId: string, date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));

  const jobs = await prisma.serviceJob.findMany({
    where: {
      status: {
        in: openStatuses,
      },
      assignments: {
        some: {
          userId,
        },
      },
      createdAt: {
        gte: weekStart,
        lte: endOfDay(weekDays[weekDays.length - 1]),
      },
    },
    include: {
      boat: {
        select: {
          id: true,
          name: true,
          isVip: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const todayJobs = jobs
    .filter((job) => job.createdAt >= dayStart && job.createdAt <= dayEnd)
    .map((job) => {
      const role =
        job.assignments.find((assignment) => assignment.userId === userId)?.role ??
        JobRole.DESTEK;

      return {
        id: job.id,
        boatName: job.boat.name,
        isVip: job.boat.isVip,
        locationLabel: job.location ?? "Lokasyon bekleniyor",
        dispatchTab: resolveDispatchTab(job.location),
        categoryName: job.category.name,
        role,
        multiplier: job.multiplier,
        timeLabel: format(job.createdAt, "HH:mm"),
      };
    });

  const weeklySummary = weekDays.map((day) => {
    const dayJobs = jobs.filter((job) => isSameDay(job.createdAt, day));

    return {
      dateIso: startOfDay(day).toISOString(),
      dateValue: format(day, "yyyy-MM-dd"),
      label: format(day, "EEE", { locale: tr }),
      isToday: isSameDay(day, date),
      count: dayJobs.length,
    };
  });

  return {
    todayJobs,
    weeklySummary,
  };
}

export async function getMyJobDetail(params: {
  jobId: string;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const job = await prisma.serviceJob.findUnique({
    where: {
      id: params.jobId,
    },
    include: {
      boat: {
        include: {
          contacts: {
            orderBy: [
              {
                isPrimary: "desc",
              },
              {
                name: "asc",
              },
            ],
          },
        },
      },
      category: true,
      assignments: {
        include: {
          user: true,
        },
        orderBy: [
          {
            role: "asc",
          },
          {
            user: {
              name: "asc",
            },
          },
        ],
      },
      clientNotifications: {
        include: {
          contact: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  if (
    params.currentUserRole === Role.TECHNICIAN &&
    !job.assignments.some((assignment) => assignment.userId === params.currentUserId)
  ) {
    return null;
  }

  const recentVisits = await prisma.serviceJob.findMany({
    where: {
      boatId: job.boatId,
      id: {
        not: job.id,
      },
      status: {
        in: [JobStatus.TAMAMLANDI, JobStatus.KAPANDI],
      },
    },
    select: {
      id: true,
      createdAt: true,
      category: {
        select: {
          name: true,
        },
      },
      assignments: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });

  return {
    job,
    recentVisits,
  };
}
