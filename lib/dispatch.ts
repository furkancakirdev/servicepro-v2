import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { JobRole, JobStatus, Role } from "@prisma/client";

import { openStatuses } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { generateSahaTemplate, generateYatmarinTemplate } from "@/lib/wa-templates";

export type DispatchTab = "YATMARIN" | "NETSEL" | "SAHA";

export type DispatchWarning = {
  id: string;
  tone: "amber" | "rose" | "sky";
  title: string;
  description: string;
};

export type DispatchJobCard = {
  id: string;
  boatId: string;
  boatName: string;
  categoryName: string;
  locationLabel: string;
  dispatchTab: DispatchTab;
  status: JobStatus;
  multiplier: number;
  isKesif: boolean;
  isVip: boolean;
  contactName: string | null;
  contactPhone: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  supportNames: string[];
  hasMissingContact: boolean;
  continuityHint: string | null;
  createdAtIso: string;
  dispatchDateIso: string | null;
  plannedStartAtIso: string | null;
};

export type DispatchTimelineBlock = {
  id: string;
  type: "JOB" | "TRAVEL";
  title: string;
  subtitle: string;
  startMinutes: number;
  durationMinutes: number;
  startLabel: string;
  endLabel: string;
  tone: "blue" | "green" | "amber" | "purple" | "slate";
  hasWarningDot: boolean;
  jobId?: string;
};

export type DispatchScheduledJob = DispatchJobCard & {
  startMinutes: number;
  endMinutes: number;
  startLabel: string;
  endLabel: string;
  departureLabel: string | null;
  returnLabel: string;
  travelMinutes: number | null;
};

export type DispatchTechnicianLane = {
  id: string;
  name: string;
  initials: string;
  jobCount: number;
  locationLabel: string;
  isOverloaded: boolean;
  scheduledJobs: DispatchScheduledJob[];
  blocks: DispatchTimelineBlock[];
};

export type DispatchPublishedPlanLogEntry = {
  location: string;
  publishedAt: string | null;
  publishedAtLabel: string | null;
  publishedByName: string | null;
  hasTRTemplate: boolean;
  hasENTemplate: boolean;
};

export type DispatchBoardData = {
  dateIso: string;
  dateValue: string;
  dateLabel: string;
  selectedTab: DispatchTab;
  lanes: DispatchTechnicianLane[];
  unassignedJobs: DispatchJobCard[];
  warnings: DispatchWarning[];
  templates: {
    workshopTR: string;
    workshopEN: string;
    fieldTR: string;
    fieldEN: string;
  };
  publishedPlans: DispatchPublishedPlanLogEntry[];
};

export type WeeklyDispatchDay = {
  dateIso: string;
  dateValue: string;
  label: string;
  lanes: Array<{
    userId: string;
    name: string;
    jobCount: number;
    maxCapacity: number;
    jobs: DispatchJobCard[];
  }>;
  unassignedJobs: DispatchJobCard[];
};

export type WeeklyDispatchData = {
  weekLabel: string;
  days: WeeklyDispatchDay[];
  technicianLoads: Array<{
    userId: string;
    name: string;
    totalJobs: number;
    maxCapacity: number;
  }>;
};

type DispatchSourceJob = {
  id: string;
  location: string | null;
  createdAt: Date;
  dispatchDate: Date | null;
  plannedStartAt: Date | null;
  status: JobStatus;
  multiplier: number;
  isKesif: boolean;
  contactName: string | null;
  contactPhone: string | null;
  boat: {
    id: string;
    name: string;
    isVip: boolean;
  };
  category: {
    name: string;
  };
  assignments: Array<{
    role: JobRole;
    userId: string;
    user: {
      id: string;
      name: string;
    };
  }>;
};

type DispatchPlanningDateSource = {
  dispatchDate?: Date | null;
  plannedStartAt?: Date | null;
  createdAt: Date;
};

type DispatchPublishedPlanSource = {
  location: string;
  publishedAt: Date | string | null;
  publishedByName?: string | null;
  waTemplateTR?: string | null;
  waTemplateEN?: string | null;
};

const MORNING_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 17 * 60;
const MAX_DAILY_LOAD = 2;
const MAX_WEEKLY_LOAD = MAX_DAILY_LOAD * 6;
const CONTINUING_STATUSES: JobStatus[] = [JobStatus.DEVAM_EDIYOR, JobStatus.BEKLEMEDE];
const FIELD_TRAVEL_MINUTES = [
  ["gocek", 90],
  ["bodrum", 120],
  ["bozburun", 150],
  ["didim", 80],
] as const;

function normalizeLocationLabel(location: string | null | undefined) {
  return location?.trim() || "Lokasyon bekleniyor";
}

function normalizeSearchText(value: string | null | undefined) {
  return normalizeLocationLabel(value)
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTimelineLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clampTimelineMinutes(value: number) {
  return Math.max(MORNING_START_MINUTES, Math.min(value, DAY_END_MINUTES));
}

function getMinutesFromDate(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function parseOptionalIso(value: string | null | undefined) {
  return value ? parseISO(value) : null;
}

function resolveTravelDuration(location: string | null | undefined) {
  const normalized = normalizeSearchText(location);

  for (const [keyword, duration] of FIELD_TRAVEL_MINUTES) {
    if (normalized.includes(keyword)) {
      return duration;
    }
  }

  return null;
}

function getLocationColorTone(tab: DispatchTab) {
  switch (tab) {
    case "NETSEL":
      return "green" as const;
    case "SAHA":
      return "amber" as const;
    case "YATMARIN":
    default:
      return "blue" as const;
  }
}

function getJobDurationMinutes(job: Pick<DispatchSourceJob, "isKesif" | "multiplier">) {
  if (job.isKesif) {
    return 45;
  }

  return Math.min(150, Math.max(60, Math.round(40 + job.multiplier * 30)));
}

function getDispatchSortDateTime(source: DispatchPlanningDateSource) {
  return new Date(
    (source.plannedStartAt ?? source.dispatchDate ?? source.createdAt).getTime()
  );
}

function mapDispatchJob(job: DispatchSourceJob, continuityHint?: string | null): DispatchJobCard {
  const responsible =
    job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU) ??
    job.assignments[0] ??
    null;

  return {
    id: job.id,
    boatId: job.boat.id,
    boatName: job.boat.name,
    categoryName: job.category.name,
    locationLabel: normalizeLocationLabel(job.location),
    dispatchTab: resolveDispatchTab(job.location),
    status: job.status,
    multiplier: job.multiplier,
    isKesif: job.isKesif,
    isVip: job.boat.isVip,
    contactName: job.contactName,
    contactPhone: job.contactPhone,
    responsibleId: responsible?.userId ?? null,
    responsibleName: responsible?.user.name ?? null,
    supportNames: job.assignments
      .filter((assignment) => assignment.role === JobRole.DESTEK)
      .map((assignment) => assignment.user.name),
    hasMissingContact: !job.contactName || !job.contactPhone,
    continuityHint: continuityHint ?? null,
    createdAtIso: job.createdAt.toISOString(),
    dispatchDateIso: job.dispatchDate?.toISOString() ?? null,
    plannedStartAtIso: job.plannedStartAt?.toISOString() ?? null,
  };
}

function scheduleJobs(jobs: DispatchJobCard[]) {
  const scheduledJobs: DispatchScheduledJob[] = [];
  const blocks: DispatchTimelineBlock[] = [];
  let cursor = MORNING_START_MINUTES;

  for (const job of sortDispatchJobsForLane(jobs)) {
    const travelMinutes =
      job.dispatchTab === "SAHA" ? resolveTravelDuration(job.locationLabel) : null;
    const plannedStartDate = parseOptionalIso(job.plannedStartAtIso);
    const desiredJobStart = plannedStartDate
      ? clampTimelineMinutes(getMinutesFromDate(plannedStartDate))
      : cursor;

    let jobStart = Math.max(cursor, desiredJobStart);

    if (travelMinutes) {
      const desiredTravelStart = clampTimelineMinutes(jobStart - travelMinutes);
      const travelStart = desiredTravelStart >= cursor ? desiredTravelStart : clampTimelineMinutes(cursor);
      const travelEnd = clampTimelineMinutes(travelStart + travelMinutes);

      blocks.push({
        id: `travel-${job.id}`,
        type: "TRAVEL",
        title: "Seyahat",
        subtitle: `${job.locationLabel} ~${travelMinutes} dk`,
        startMinutes: travelStart - MORNING_START_MINUTES,
        durationMinutes: Math.max(travelEnd - travelStart, 30),
        startLabel: getTimelineLabel(travelStart),
        endLabel: getTimelineLabel(travelEnd),
        tone: "slate",
        hasWarningDot: false,
      });

      jobStart = Math.max(jobStart, travelEnd);
      cursor = travelEnd;
    }

    const durationMinutes = getJobDurationMinutes({
      isKesif: job.isKesif,
      multiplier: job.multiplier,
    });
    const start = clampTimelineMinutes(jobStart);
    const end = clampTimelineMinutes(start + durationMinutes);
    const startLabel = getTimelineLabel(start);
    const endLabel = getTimelineLabel(end);

    scheduledJobs.push({
      ...job,
      startMinutes: start - MORNING_START_MINUTES,
      endMinutes: end - MORNING_START_MINUTES,
      startLabel,
      endLabel,
      departureLabel: travelMinutes ? getTimelineLabel(start - travelMinutes) : null,
      returnLabel: endLabel,
      travelMinutes,
    });

    blocks.push({
      id: `job-${job.id}`,
      type: "JOB",
      title: job.boatName,
      subtitle: `${job.categoryName} • ${job.locationLabel}`,
      startMinutes: start - MORNING_START_MINUTES,
      durationMinutes: Math.max(end - start, 30),
      startLabel,
      endLabel,
      tone: getLocationColorTone(job.dispatchTab),
      hasWarningDot: job.hasMissingContact,
      jobId: job.id,
    });

    cursor = end + 15;
  }

  return { scheduledJobs, blocks };
}

function buildWorkshopTemplate(params: {
  date: Date;
  lanes: DispatchTechnicianLane[];
  continuingJobs: DispatchJobCard[];
}) {
  const dayEn = format(params.date, "EEEE", { locale: enUS });
  const dateEn = format(params.date, "MMM d, yyyy", { locale: enUS });
  const workshopLanes = params.lanes.filter((lane) =>
    lane.scheduledJobs.some((job) => job.dispatchTab !== "SAHA")
  );
  const continuingWorkshopJobs = params.continuingJobs.filter(
    (job) => job.dispatchTab !== "SAHA"
  );

  const enBody = workshopLanes
    .map((lane) => {
      const lineItems = lane.scheduledJobs
        .filter((job) => job.dispatchTab !== "SAHA")
        .map(
          (job) =>
            `• ${job.startLabel} → ${job.boatName} (${job.locationLabel}) — ${job.categoryName}`
        );

      return lineItems.length > 0 ? `${lane.name}:\n${lineItems.join("\n")}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const enContinuing =
    continuingWorkshopJobs.length > 0
      ? `\n\nONGOING JOBS:\n${continuingWorkshopJobs
          .map(
            (job) =>
              `• ${job.boatName} — ${job.categoryName} (${job.responsibleName ?? "Awaiting assignment"})`
          )
          .join("\n")}`
      : "";

  return {
    workshopTR: generateYatmarinTemplate(
      params.date,
      workshopLanes.map((lane) => ({
        technicianName: lane.name,
        jobs: lane.scheduledJobs
          .filter((job) => job.dispatchTab !== "SAHA")
          .map((job) => ({
            time: job.startLabel,
            boatName: job.boatName,
            location: job.locationLabel,
            description: job.categoryName,
          })),
      })),
      continuingWorkshopJobs.map((job) => ({
        boatName: job.boatName,
        description: job.categoryName,
        technicianName: job.responsibleName ?? "Atama bekleniyor",
      }))
    ),
    workshopEN: `WORKSHOP TEAM — ${dayEn.toUpperCase()} ${dateEn.toUpperCase()}\n\n${
      enBody || "• No workshop jobs scheduled for today."
    }${enContinuing}\n\nMarlin Yachting Technical Service`,
  };
}

function buildFieldTemplate(params: {
  date: Date;
  lanes: DispatchTechnicianLane[];
}) {
  const dayEn = format(params.date, "EEEE", { locale: enUS });
  const dateEn = format(params.date, "MMM d, yyyy", { locale: enUS });
  const fieldLanes = params.lanes.filter((lane) =>
    lane.scheduledJobs.some((job) => job.dispatchTab === "SAHA")
  );

  const enBody = fieldLanes
    .map((lane) => {
      const fieldJobs = lane.scheduledJobs.filter((job) => job.dispatchTab === "SAHA");

      if (fieldJobs.length === 0) {
        return null;
      }

      const firstJob = fieldJobs[0];
      const travelMinutes = firstJob.travelMinutes ?? 0;

      return `${lane.name} → ${firstJob.locationLabel} (${
        firstJob.departureLabel ?? firstJob.startLabel
      } departure, ~${travelMinutes} min)\n${fieldJobs
        .map((job) => `• ${job.boatName} — ${job.categoryName}`)
        .join("\n")}\nEstimated return: ${fieldJobs[fieldJobs.length - 1].returnLabel}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    fieldTR: generateSahaTemplate(
      params.date,
      fieldLanes
        .map((lane) => {
          const fieldJobs = lane.scheduledJobs.filter((job) => job.dispatchTab === "SAHA");

          if (fieldJobs.length === 0) {
            return null;
          }

          const firstJob = fieldJobs[0];
          const lastJob = fieldJobs[fieldJobs.length - 1];

          return {
            technicianName: lane.name,
            destination: firstJob.locationLabel,
            departureTime: firstJob.departureLabel ?? firstJob.startLabel,
            travelMin: firstJob.travelMinutes ?? 0,
            returnTime: lastJob.returnLabel,
            jobs: fieldJobs.map((job) => ({
              time: job.startLabel,
              boatName: job.boatName,
              location: job.locationLabel,
              description: job.categoryName,
            })),
          };
        })
        .filter(Boolean) as Array<{
        technicianName: string;
        destination: string;
        departureTime: string;
        travelMin: number;
        returnTime: string;
        jobs: Array<{
          time: string;
          boatName: string;
          location: string;
          description: string;
        }>;
      }>
    ),
    fieldEN: `FIELD TEAM — ${dayEn.toUpperCase()} ${dateEn.toUpperCase()}\n\n${
      enBody || "• No field operation scheduled for today."
    }\n\nMarlin Yachting Technical Service`,
  };
}

function buildDayRangeFallbackWhere(dayStart: Date, dayEnd: Date) {
  return [
    {
      dispatchDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    {
      dispatchDate: null,
      plannedStartAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    {
      dispatchDate: null,
      plannedStartAt: null,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  ];
}

function buildContinuingWhere(dayStart: Date) {
  return [
    {
      status: {
        in: CONTINUING_STATUSES,
      },
      dispatchDate: {
        lt: dayStart,
      },
    },
    {
      status: {
        in: CONTINUING_STATUSES,
      },
      dispatchDate: null,
      plannedStartAt: {
        lt: dayStart,
      },
    },
    {
      status: {
        in: CONTINUING_STATUSES,
      },
      dispatchDate: null,
      plannedStartAt: null,
      createdAt: {
        lt: dayStart,
      },
    },
  ];
}

async function getDispatchSourceJobs(date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  return prisma.serviceJob.findMany({
    where: {
      status: {
        in: openStatuses,
      },
      OR: [...buildDayRangeFallbackWhere(dayStart, dayEnd), ...buildContinuingWhere(dayStart)],
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
    },
    orderBy: [
      {
        dispatchDate: "asc",
      },
      {
        plannedStartAt: "asc",
      },
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });
}

export function resolveDispatchTab(location: string | null | undefined): DispatchTab {
  const normalized = normalizeSearchText(location);

  if (normalized.includes("netsel")) {
    return "NETSEL";
  }

  if (
    normalized.includes("gocek") ||
    normalized.includes("bodrum") ||
    normalized.includes("bozburun") ||
    normalized.includes("didim") ||
    normalized.includes("saha")
  ) {
    return "SAHA";
  }

  return "YATMARIN";
}

export function getDispatchPlanningDate(job: DispatchPlanningDateSource) {
  return new Date((job.dispatchDate ?? job.plannedStartAt ?? job.createdAt).getTime());
}

export function sortDispatchJobsForLane(jobs: DispatchJobCard[]) {
  return [...jobs].sort((left, right) => {
    const leftSortDate = getDispatchSortDateTime({
      dispatchDate: parseOptionalIso(left.dispatchDateIso),
      plannedStartAt: parseOptionalIso(left.plannedStartAtIso),
      createdAt: parseISO(left.createdAtIso),
    });
    const rightSortDate = getDispatchSortDateTime({
      dispatchDate: parseOptionalIso(right.dispatchDateIso),
      plannedStartAt: parseOptionalIso(right.plannedStartAtIso),
      createdAt: parseISO(right.createdAtIso),
    });

    if (leftSortDate.getTime() !== rightSortDate.getTime()) {
      return leftSortDate.getTime() - rightSortDate.getTime();
    }

    return left.boatName.localeCompare(right.boatName, "tr");
  });
}

export function buildDispatchPublishLogEntries(plans: DispatchPublishedPlanSource[]) {
  return [...plans]
    .sort((left, right) => {
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;

      return rightTime - leftTime;
    })
    .map((plan) => {
      const publishedAt = plan.publishedAt ? new Date(plan.publishedAt) : null;

      return {
        location: plan.location,
        publishedAt: publishedAt?.toISOString() ?? null,
        publishedAtLabel: publishedAt
          ? publishedAt.toLocaleString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        publishedByName: plan.publishedByName ?? null,
        hasTRTemplate: Boolean(plan.waTemplateTR?.trim()),
        hasENTemplate: Boolean(plan.waTemplateEN?.trim()),
      };
    });
}

export async function getDispatchBoardData(
  date: Date,
  selectedTab: DispatchTab
): Promise<DispatchBoardData> {
  const dayStart = startOfDay(date);
  const [users, jobs, publishedPlans] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: Role.TECHNICIAN,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    getDispatchSourceJobs(date),
    prisma.dailyPlan.findMany({
      where: {
        date: dayStart,
      },
      select: {
        location: true,
        publishedAt: true,
        waTemplateTR: true,
        waTemplateEN: true,
        publishedBy: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const todayJobs = jobs.filter((job) => isSameDay(getDispatchPlanningDate(job), dayStart));
  const continuingJobs = jobs.filter((job) => !isSameDay(getDispatchPlanningDate(job), dayStart));
  const allMappedJobs = jobs.map((job) => mapDispatchJob(job));
  const selectedJobs = allMappedJobs.filter((job) => job.dispatchTab === selectedTab);
  const unassignedJobs = sortDispatchJobsForLane(
    selectedJobs.filter((job) => !job.responsibleId)
  );

  const lanes = users.map((user) => {
    const assignedJobs = sortDispatchJobsForLane(
      selectedJobs.filter((job) => job.responsibleId === user.id)
    );
    const { scheduledJobs, blocks } = scheduleJobs(assignedJobs);
    const topLocation =
      scheduledJobs[0]?.locationLabel ??
      (selectedTab === "SAHA"
        ? "Saha ekibi"
        : selectedTab === "NETSEL"
          ? "Netsel"
          : "Yatmarin");

    return {
      id: user.id,
      name: user.name,
      initials: getInitials(user.name),
      jobCount: assignedJobs.length,
      locationLabel: topLocation,
      isOverloaded: assignedJobs.length > MAX_DAILY_LOAD,
      scheduledJobs,
      blocks,
    };
  });

  const warnings: DispatchWarning[] = [];
  const hasWorkshopJobs = todayJobs.some((job) => resolveDispatchTab(job.location) !== "SAHA");
  const hasFieldJobs = todayJobs.some((job) => resolveDispatchTab(job.location) === "SAHA");

  if (hasWorkshopJobs && hasFieldJobs) {
    warnings.push({
      id: "multi-location",
      tone: "amber",
      title: "Çoklu lokasyon aktif",
      description:
        "Aynı gün atölye ve saha operasyonu görünüyor. Saha çıkışı için ekip ayrımı kontrol edilmeli.",
    });
  }

  const overloadedLanes = lanes.filter((lane) => lane.isOverloaded);

  if (overloadedLanes.length > 0) {
    warnings.push({
      id: "workload",
      tone: "rose",
      title: "Yüksek doluluk uyarısı",
      description: `${overloadedLanes
        .map((lane) => `${lane.name} (${lane.jobCount})`)
        .join(", ")} için günlük kapasitenin üzerinde atama görünüyor.`,
    });
  }

  const allLanes = users.map((user) => {
    const assignedJobs = sortDispatchJobsForLane(
      allMappedJobs.filter((job) => job.responsibleId === user.id)
    );
    const { scheduledJobs, blocks } = scheduleJobs(assignedJobs);

    return {
      id: user.id,
      name: user.name,
      initials: getInitials(user.name),
      jobCount: assignedJobs.length,
      locationLabel: scheduledJobs[0]?.locationLabel ?? "Müsait",
      isOverloaded: assignedJobs.length > MAX_DAILY_LOAD,
      scheduledJobs,
      blocks,
    };
  });

  const workshopTemplates = buildWorkshopTemplate({
    date,
    lanes: allLanes,
    continuingJobs: continuingJobs.map((job) => mapDispatchJob(job)),
  });
  const fieldTemplates = buildFieldTemplate({
    date,
    lanes: allLanes,
  });

  return {
    dateIso: dayStart.toISOString(),
    dateValue: format(dayStart, "yyyy-MM-dd"),
    dateLabel: format(dayStart, "d MMMM yyyy, EEEE", { locale: tr }),
    selectedTab,
    lanes,
    unassignedJobs,
    warnings,
    templates: {
      ...workshopTemplates,
      ...fieldTemplates,
    },
    publishedPlans: buildDispatchPublishLogEntries(
      publishedPlans.map((plan) => ({
        location: plan.location,
        publishedAt: plan.publishedAt,
        publishedByName: plan.publishedBy?.name ?? null,
        waTemplateTR: plan.waTemplateTR,
        waTemplateEN: plan.waTemplateEN,
      }))
    ),
  };
}

export async function getWeeklyDispatchData(referenceDate: Date): Promise<WeeklyDispatchData> {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
  const weekEnd = endOfDay(weekDays[weekDays.length - 1]);

  const [users, jobs] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: Role.TECHNICIAN,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.serviceJob.findMany({
      where: {
        status: {
          in: openStatuses,
        },
        OR: buildDayRangeFallbackWhere(weekStart, weekEnd),
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
      orderBy: [
        {
          dispatchDate: "asc",
        },
        {
          plannedStartAt: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    }),
  ]);

  const mappedJobs = jobs.map((job) => mapDispatchJob(job));
  const technicianLoads = users.map((user) => ({
    userId: user.id,
    name: user.name,
    totalJobs: mappedJobs.filter((job) => job.responsibleId === user.id).length,
    maxCapacity: MAX_WEEKLY_LOAD,
  }));

  return {
    weekLabel: `${format(weekDays[0], "d MMM", { locale: tr })} - ${format(
      weekDays[weekDays.length - 1],
      "d MMM yyyy",
      { locale: tr }
    )}`,
    days: weekDays.map((day) => {
      const dayJobIds = new Set(
        jobs
          .filter((sourceJob) => isSameDay(getDispatchPlanningDate(sourceJob), day))
          .map((sourceJob) => sourceJob.id)
      );
      const dayJobs = mappedJobs.filter((job) => dayJobIds.has(job.id));

      return {
        dateIso: startOfDay(day).toISOString(),
        dateValue: format(day, "yyyy-MM-dd"),
        label: format(day, "EEE d", { locale: tr }),
        lanes: users.map((user) => ({
          userId: user.id,
          name: user.name,
          jobCount: dayJobs.filter((job) => job.responsibleId === user.id).length,
          maxCapacity: MAX_DAILY_LOAD,
          jobs: sortDispatchJobsForLane(dayJobs.filter((job) => job.responsibleId === user.id)),
        })),
        unassignedJobs: sortDispatchJobsForLane(dayJobs.filter((job) => !job.responsibleId)),
      };
    }),
    technicianLoads,
  };
}
