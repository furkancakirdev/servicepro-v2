import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { JobRole, JobStatus, Role } from "@prisma/client";

import { resolveDispatchTab } from "@/lib/dispatch";
import { getJobOperationalReference, openStatuses } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import type { MyJobQualityCheck } from "@/types";

type MyJobsOverviewSourceJob = {
  id: string;
  createdAt: Date;
  dispatchDate: Date | null;
  plannedStartAt: Date | null;
  location: string | null;
  multiplier: number;
  boat: {
    name: string;
    isVip: boolean;
  };
  category: {
    name: string;
  };
  assignments: Array<{
    userId: string;
    role: JobRole;
  }>;
};

type ContactQualitySource = {
  id: string;
  isPrimary: boolean;
  phone: string | null;
  email: string | null;
  whatsappOptIn: boolean;
  language: string;
};

type RecentVisitSource = {
  id: string;
  completedAt: Date | null;
  actualEndAt: Date | null;
  plannedStartAt: Date | null;
  createdAt: Date;
};

type ClientNotificationQualitySource = {
  id: string;
  createdAt: Date;
};

function buildPlanningRangeWhere(start: Date, end: Date) {
  return [
    {
      dispatchDate: {
        gte: start,
        lte: end,
      },
    },
    {
      dispatchDate: null,
      plannedStartAt: {
        gte: start,
        lte: end,
      },
    },
    {
      dispatchDate: null,
      plannedStartAt: null,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  ];
}

export function getMyJobPlanningDate(job: {
  createdAt: Date;
  dispatchDate?: Date | null;
  plannedStartAt?: Date | null;
}) {
  return job.dispatchDate ?? job.plannedStartAt ?? job.createdAt;
}

function getVisitReferenceDate(visit: RecentVisitSource) {
  return visit.actualEndAt ?? visit.completedAt ?? visit.plannedStartAt ?? visit.createdAt;
}

export function buildMyJobsOverviewData(
  jobs: MyJobsOverviewSourceJob[],
  userId: string,
  date = new Date()
) {
  const dayStart = startOfDay(date);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));

  const sortedJobs = [...jobs].sort((left, right) => {
    const leftDate = getMyJobPlanningDate(left);
    const rightDate = getMyJobPlanningDate(right);

    if (leftDate.getTime() !== rightDate.getTime()) {
      return leftDate.getTime() - rightDate.getTime();
    }

    return left.boat.name.localeCompare(right.boat.name, "tr");
  });

  const mapJob = (job: MyJobsOverviewSourceJob) => {
    const role = job.assignments.find((assignment) => assignment.userId === userId)?.role ?? null;
    const planningDate = getMyJobPlanningDate(job);
    const timeReference = job.plannedStartAt ?? planningDate;

    return {
      id: job.id,
      boatName: job.boat.name,
      isVip: job.boat.isVip,
      locationLabel: job.location ?? "Lokasyon bekleniyor",
      dispatchTab: resolveDispatchTab(job.location),
      categoryName: job.category.name,
      role,
      multiplier: job.multiplier,
      timeLabel: format(timeReference, "HH:mm"),
      planningDateIso: planningDate.toISOString(),
    };
  };

  const todayJobs = sortedJobs
    .filter((job) => isSameDay(getMyJobPlanningDate(job), dayStart))
    .map(mapJob);

  const weeklySummary = weekDays.map((day) => {
    const dayJobs = sortedJobs
      .filter((job) => isSameDay(getMyJobPlanningDate(job), day))
      .map(mapJob);

    return {
      dateIso: startOfDay(day).toISOString(),
      dateValue: format(day, "yyyy-MM-dd"),
      label: format(day, "EEE", { locale: tr }),
      isToday: isSameDay(day, date),
      count: dayJobs.length,
      jobs: dayJobs,
    };
  });

  return {
    todayJobs,
    weeklySummary,
  };
}

export function buildJobDetailQualityChecks(input: {
  contacts: ContactQualitySource[];
  primaryContactId: string | null;
  recentVisits: RecentVisitSource[];
  clientNotifications: ClientNotificationQualitySource[];
}): MyJobQualityCheck[] {
  const checks: MyJobQualityCheck[] = [];
  const primaryContact =
    input.contacts.find((contact) => contact.id === input.primaryContactId) ??
    input.contacts.find((contact) => contact.isPrimary) ??
    null;

  if (!primaryContact) {
    checks.push({
      id: "primary-contact-missing",
      tone: "rose",
      title: "Birincil irtibat eksik",
      description: "Tekne için işaretlenmiş birincil irtibat bulunmuyor.",
    });
  } else if (!primaryContact.phone) {
    checks.push({
      id: "primary-contact-phone",
      tone: "rose",
      title: "Birincil irtibatta telefon yok",
      description: "WhatsApp ve arama akışı için telefon numarası eklenmeli.",
    });
  } else if (!primaryContact.whatsappOptIn) {
    checks.push({
      id: "primary-contact-whatsapp",
      tone: "amber",
      title: "WhatsApp izni kapalı",
      description: "Birincil irtibat telefona sahip ama WhatsApp bildirimi için uygun değil.",
    });
  } else {
    checks.push({
      id: "primary-contact-ready",
      tone: "emerald",
      title: "İletişim kanalı hazır",
      description: `${primaryContact.language} dilinde aranabilir ve WhatsApp'a uygun birincil irtibat mevcut.`,
    });
  }

  if (!primaryContact?.email) {
    checks.push({
      id: "primary-contact-email",
      tone: "sky",
      title: "E-posta kaydı zayıf",
      description: "Birincil irtibatta e-posta bulunmuyor; rapor paylaşımı sınırlı olabilir.",
    });
  }

  if (input.recentVisits.length === 0) {
    checks.push({
      id: "visit-history",
      tone: "amber",
      title: "Ziyaret geçmişi boş",
      description: "Bu tekne için tamamlanmış önceki servis ziyareti görünmüyor.",
    });
  } else {
    checks.push({
      id: "visit-history-ok",
      tone: "emerald",
      title: "Ziyaret geçmişi mevcut",
      description: `Son servis kaydı ${format(
        getVisitReferenceDate(input.recentVisits[0]),
        "dd MMM yyyy",
        { locale: tr }
      )} tarihinde işlendi.`,
    });
  }

  if (input.clientNotifications.length === 0) {
    checks.push({
      id: "notification-history",
      tone: "sky",
      title: "İletişim geçmişi boş",
      description: "Bu iş için kayıtlı müşteri bildirimi görünmüyor.",
    });
  } else {
    checks.push({
      id: "notification-history-ok",
      tone: "emerald",
      title: "İletişim geçmişi kayıtlı",
      description: `${input.clientNotifications.length} müşteri bildirimi iş kaydına bağlanmış durumda.`,
    });
  }

  return checks;
}

export async function getMyJobsOverview(userId: string, date = new Date()) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfDay(addDays(weekStart, 5));

  const jobs = await prisma.serviceJob.findMany({
    where: {
      status: {
        in: openStatuses,
      },
      OR: buildPlanningRangeWhere(weekStart, weekEnd),
    },
    include: {
      boat: {
        select: {
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
        select: {
          userId: true,
          role: true,
        },
      },
    },
    orderBy: [{ dispatchDate: "asc" }, { plannedStartAt: "asc" }, { createdAt: "asc" }],
  });

  return buildMyJobsOverviewData(jobs, userId, date);
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
            orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
          },
        },
      },
      category: true,
      assignments: {
        include: {
          user: true,
        },
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
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
    !openStatuses.includes(job.status)
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
        in: [JobStatus.TAMAMLANDI, JobStatus.KAPANDI, JobStatus.GARANTI],
      },
    },
    select: {
      id: true,
      createdAt: true,
      plannedStartAt: true,
      completedAt: true,
      actualEndAt: true,
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
    orderBy: [{ completedAt: "desc" }, { actualEndAt: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  const primaryContact =
    job.boat.contacts.find((contact) => contact.isPrimary) ?? job.boat.contacts[0] ?? null;

  return {
    job,
    primaryContactId: primaryContact?.id ?? null,
    recentVisits,
    qualityChecks: buildJobDetailQualityChecks({
      contacts: job.boat.contacts,
      primaryContactId: primaryContact?.id ?? null,
      recentVisits,
      clientNotifications: job.clientNotifications,
    }),
  };
}
