import "server-only";

import {
  addDays,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { Role } from "@prisma/client";

import { openStatuses } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

import { CONTINUING_STATUSES, DISPATCH_REGIONS } from "./constants";
import {
  getDispatchBoardDate,
  getRegionIcon,
  getRegionLabel,
  mapDispatchJob,
} from "./helpers";
import { sortDispatchJobsForLane } from "./scheduler";
import { buildDailyPlanTemplate, buildDispatchPublishLogEntries } from "./templates";
import type {
  DispatchBoardData,
  DispatchPlanLocation,
  DispatchRegion,
  DispatchRegionDay,
  DispatchSourceJob,
  DispatchViewMode,
} from "./types";

function buildRangeWhere(rangeStart: Date, rangeEnd: Date) {
  return [
    {
      dispatchDate: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    {
      dispatchDate: null,
      plannedStartDate: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    {
      dispatchDate: null,
      plannedStartDate: null,
      plannedStartAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
  ];
}

function buildContinuingWhere(rangeStart: Date) {
  return [
    {
      status: {
        in: CONTINUING_STATUSES,
      },
      dispatchDate: {
        lt: rangeStart,
      },
    },
    {
      status: {
        in: CONTINUING_STATUSES,
      },
      dispatchDate: null,
      plannedStartDate: {
        lt: rangeStart,
      },
    },
    {
      status: {
        in: CONTINUING_STATUSES,
      },
      dispatchDate: null,
      plannedStartDate: null,
      plannedStartAt: {
        lt: rangeStart,
      },
    },
  ];
}

function buildUnscheduledWhere() {
  return {
    dispatchDate: null,
    plannedStartDate: null,
    plannedStartAt: null,
  };
}

function buildBoardDays(date: Date, viewMode: DispatchViewMode): DispatchRegionDay[] {
  if (viewMode === "daily") {
    const dayStart = startOfDay(date);

    return [
      {
        dateIso: dayStart.toISOString(),
        dateValue: format(dayStart, "yyyy-MM-dd"),
        dayLabel: format(dayStart, "EEEE", { locale: tr }),
        dateLabel: format(dayStart, "d MMM", { locale: tr }),
        jobs: [],
      },
    ];
  }

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });

  return Array.from({ length: 6 }, (_, index) => {
    const dayStart = startOfDay(addDays(weekStart, index));

    return {
      dateIso: dayStart.toISOString(),
      dateValue: format(dayStart, "yyyy-MM-dd"),
      dayLabel: format(dayStart, "EEE", { locale: tr }),
      dateLabel: format(dayStart, "d MMM", { locale: tr }),
      jobs: [],
    };
  });
}

async function getDispatchSourceJobs(
  rangeStart: Date,
  rangeEnd: Date
): Promise<DispatchSourceJob[]> {
  return prisma.serviceJob.findMany({
    where: {
      status: {
        in: openStatuses,
      },
      OR: [...buildRangeWhere(rangeStart, rangeEnd), buildUnscheduledWhere(), ...buildContinuingWhere(rangeStart)],
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
        plannedStartDate: "asc",
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

function buildRegions(days: DispatchRegionDay[]): DispatchRegion[] {
  return DISPATCH_REGIONS.map((region) => ({
    id: region.id,
    label: getRegionLabel(region.id),
    icon: getRegionIcon(region.id),
    days: days.map((day) => ({ ...day, jobs: [] })),
    jobCount: 0,
  }));
}

export async function getDispatchBoardData(
  date: Date,
  viewMode: DispatchViewMode = "daily"
): Promise<DispatchBoardData> {
  const selectedDate = startOfDay(date);
  const days = buildBoardDays(selectedDate, viewMode);
  const rangeStart = startOfDay(new Date(days[0].dateIso));
  const rangeEnd = endOfDay(new Date(days[days.length - 1].dateIso));

  const [technicians, jobs, publishedPlans] = await Promise.all([
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
    getDispatchSourceJobs(rangeStart, rangeEnd),
    prisma.dailyPlan.findMany({
      where: {
        date: selectedDate,
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

  const regions = buildRegions(days);
  const unassignedJobs = [];
  const jobsMissingLocation = [];
  const jobsWithoutResponsible = [];

  for (const job of jobs) {
    const referenceDate = getDispatchBoardDate(job);
    const hasAssignedDate = Boolean(job.dispatchDate || job.plannedStartDate || job.plannedStartAt);
    const normalizedDate =
      CONTINUING_STATUSES.includes(job.status) && referenceDate < rangeStart ? rangeStart : referenceDate;
    const mappedJob = mapDispatchJob(
      job,
      CONTINUING_STATUSES.includes(job.status) && referenceDate < rangeStart
        ? "Devam eden is"
        : null
    );

    if (mappedJob.hasLocationWarning) {
      jobsMissingLocation.push(mappedJob);
    }

    if (!mappedJob.responsibleId) {
      jobsWithoutResponsible.push(mappedJob);
    }

    if (!hasAssignedDate) {
      unassignedJobs.push(mappedJob);
      continue;
    }

    const dayValue = format(startOfDay(normalizedDate), "yyyy-MM-dd");

    if (!isWithinInterval(startOfDay(normalizedDate), { start: rangeStart, end: rangeEnd })) {
      continue;
    }

    const region = regions.find((item) => item.id === mappedJob.regionId);
    const day = region?.days.find((item) => item.dateValue === dayValue);

    if (!region || !day) {
      continue;
    }

    day.jobs.push(mappedJob);
    region.jobCount += 1;
  }

  for (const region of regions) {
    for (const day of region.days) {
      day.jobs = sortDispatchJobsForLane(day.jobs);
    }
  }

  const warnings = [];

  if (unassignedJobs.length > 0) {
    warnings.push({
      id: "unscheduled-jobs",
      tone: "amber" as const,
      title: "Tarihe atanmamis isler var",
      description: `${unassignedJobs.length} is henuz gunluk veya haftalik plana yerlestirilmedi.`,
    });
  }

  if (jobsWithoutResponsible.length > 0) {
    warnings.push({
      id: "unassigned-technicians",
      tone: "sky" as const,
      title: "Teknisyen atamasi bekleyen isler var",
      description: `${jobsWithoutResponsible.length} is icin sorumlu teknisyen secilmemis.`,
    });
  }

  if (jobsMissingLocation.length > 0) {
    warnings.push({
      id: "missing-marmaris-location",
      tone: "rose" as const,
      title: "Marmaris Disi lokasyonlari eksik",
      description: `${jobsMissingLocation.length} saha isi icin acik lokasyon bilgisi girilmeli.`,
    });
  }

  const templates = buildDailyPlanTemplate({
    date: selectedDate,
    dateValue: format(selectedDate, "yyyy-MM-dd"),
    regions,
  });

  return {
    viewMode,
    dateIso: selectedDate.toISOString(),
    dateValue: format(selectedDate, "yyyy-MM-dd"),
    dateLabel: format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr }),
    weekLabel: `${format(rangeStart, "d MMM", { locale: tr })} - ${format(rangeEnd, "d MMM yyyy", {
      locale: tr,
    })}`,
    regions,
    unassignedJobs: sortDispatchJobsForLane(unassignedJobs),
    warnings,
    availableTechnicians: technicians,
    templates,
    publishedPlans: buildDispatchPublishLogEntries(
      publishedPlans.map((plan) => ({
        location: plan.location as DispatchPlanLocation,
        publishedAt: plan.publishedAt,
        publishedByName: plan.publishedBy?.name ?? null,
        waTemplateTR: plan.waTemplateTR,
        waTemplateEN: plan.waTemplateEN,
      }))
    ),
  };
}
