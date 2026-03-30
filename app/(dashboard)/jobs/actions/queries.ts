"use server";

import { JobStatus, Prisma, Role } from "@prisma/client";

import {
  activeOperationalStatuses,
  normalizeJobsPagination,
  openStatuses,
  type JobFiltersInput,
  type JobFormMeta,
} from "@/lib/jobs";
import { requireAppUser } from "@/lib/auth";
import { getTechnicianSuggestionsForBoats } from "@/lib/continuity";
import { prisma } from "@/lib/prisma";
import type { PaginatedJobsResult, ServiceJobDetail, ServiceJobListItem } from "@/types";

import { parseDateBoundary } from "./shared";

export async function getJobFormMeta(): Promise<JobFormMeta> {
  await requireAppUser();

  const [boats, technicians, categories] = await Promise.all([
    prisma.boat.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.TECHNICIAN },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        subScope: true,
        multiplier: true,
        brandHints: true,
      },
    }),
  ]);
  const continuitySuggestions = await getTechnicianSuggestionsForBoats(
    boats.map((boat) => boat.id)
  );

  return {
    boats: boats
      .map((boat) => ({
        id: boat.id,
        name: boat.name,
        type: boat.type,
        ownerName: boat.ownerName,
        homePort: boat.homePort,
        flag: boat.flag,
        jobCount: boat._count.jobs,
        continuitySuggestions: continuitySuggestions[boat.id] ?? [],
      }))
      .sort((left, right) => right.jobCount - left.jobCount || left.name.localeCompare(right.name)),
    technicians,
    categories,
  };
}

export async function getJobFilterOptions() {
  await requireAppUser();

  const technicians = await prisma.user.findMany({
    where: { role: Role.TECHNICIAN },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return technicians;
}

export async function getJobs(filters: JobFiltersInput = {}): Promise<PaginatedJobsResult> {
  await requireAppUser();

  const normalizedQuery = filters.query?.trim();
  const startDate = parseDateBoundary(filters.startDate);
  const endDate = parseDateBoundary(filters.endDate, true);
  const effectiveDateField = filters.dateField ?? "createdAt";
  const effectiveStatus = filters.pendingScoring ? JobStatus.TAMAMLANDI : filters.status;
  const effectiveStatuses =
    !effectiveStatus && filters.statusGroup === "ACTIVE" ? activeOperationalStatuses : undefined;
  const pagination = normalizeJobsPagination({
    page: filters.page,
    pageSize: filters.pageSize,
  });
  const range =
    startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
      : null;
  let dateRangeFilter: Prisma.ServiceJobWhereInput = {};

  if (range) {
    switch (effectiveDateField) {
      case "plannedStartAt":
        dateRangeFilter = { plannedStartAt: range };
        break;
      case "plannedEndAt":
        dateRangeFilter = { plannedEndAt: range };
        break;
      case "startedAt":
        dateRangeFilter = {
          OR: [{ actualStartAt: range }, { actualStartAt: null, startedAt: range }],
        };
        break;
      case "actualStartAt":
        dateRangeFilter = { actualStartAt: range };
        break;
      case "completedAt":
        dateRangeFilter = {
          OR: [{ actualEndAt: range }, { actualEndAt: null, completedAt: range }],
        };
        break;
      case "actualEndAt":
        dateRangeFilter = { actualEndAt: range };
        break;
      case "closedAt":
        dateRangeFilter = { closedAt: range };
        break;
      case "createdAt":
      default:
        dateRangeFilter = { createdAt: range };
        break;
    }
  }

  const compositeFilters: Prisma.ServiceJobWhereInput[] = [];

  if (normalizedQuery) {
    compositeFilters.push({
      OR: [
        {
          description: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
        {
          boat: {
            name: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
        },
        {
          category: {
            name: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  if (Object.keys(dateRangeFilter).length > 0) {
    compositeFilters.push(dateRangeFilter);
  }

  const where: Prisma.ServiceJobWhereInput = {
    ...(effectiveStatus
      ? { status: effectiveStatus }
      : effectiveStatuses
        ? {
            status: {
              in: effectiveStatuses,
            },
          }
        : {}),
    ...(filters.pendingScoring
      ? {
          deliveryReport: {
            isNot: null,
          },
          evaluation: {
            is: null,
          },
          jobScores: {
            none: {},
          },
        }
      : {}),
    ...(filters.technicianId
      ? {
          assignments: {
            some: {
              userId: filters.technicianId,
            },
          },
        }
      : {}),
    ...(compositeFilters.length > 0 ? { AND: compositeFilters } : {}),
  };

  const [items, totalCount] = await prisma.$transaction([
    prisma.serviceJob.findMany({
      where,
      include: {
        boat: true,
        category: true,
        assignments: {
          include: {
            user: true,
          },
          orderBy: [
            { role: "asc" },
            {
              user: {
                name: "asc",
              },
            },
          ],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.serviceJob.count({ where }),
  ]);

  return {
    items,
    totalCount,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pagination.pageSize)),
  };
}

export async function getJobById(id: string): Promise<{
  job: ServiceJobDetail;
  sameBoatOpenJobs: Array<Pick<ServiceJobListItem, "id" | "status" | "createdAt"> & {
    category: { name: string; subScope: string };
  }>;
  recentBoatHistory: Array<{
    id: string;
    closedAt: Date | null;
    createdAt: Date;
    category: {
      name: string;
      subScope: string;
    };
    assignments: Array<{
      user: {
        name: string;
      };
    }>;
  }>;
} | null> {
  await requireAppUser();

  const job = await prisma.serviceJob.findUnique({
    where: { id },
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
          { role: "asc" },
          {
            user: {
              name: "asc",
            },
          },
        ],
      },
      deliveryReport: true,
      clientNotifications: {
        include: {
          contact: true,
          sentBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      evaluation: {
        include: {
          evaluator: true,
        },
      },
      jobScores: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  const sameBoatOpenJobs = await prisma.serviceJob.findMany({
    where: {
      boatId: job.boatId,
      id: { not: id },
      status: { in: openStatuses },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      category: {
        select: {
          name: true,
          subScope: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentBoatHistory = await prisma.serviceJob.findMany({
    where: {
      boatId: job.boatId,
      id: {
        not: id,
      },
      status: {
        in: [JobStatus.TAMAMLANDI, JobStatus.KAPANDI, JobStatus.GARANTI],
      },
    },
    select: {
      id: true,
      closedAt: true,
      createdAt: true,
      category: {
        select: {
          name: true,
          subScope: true,
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
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
    },
    orderBy: [
      {
        closedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 3,
  });

  return { job, sameBoatOpenJobs, recentBoatHistory };
}
