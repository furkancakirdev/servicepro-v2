"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HoldReason, JobRole, JobStatus, Prisma, Role } from "@prisma/client";
import { z } from "zod";

import {
  activeOperationalStatuses,
  jobPriorityOptions,
  normalizeJobSchedule,
  normalizeJobPriority,
  normalizeJobsPagination,
  openStatuses,
  toEstimatedDateSeconds,
  type CreateJobFormState,
  type JobFiltersInput,
  type JobFormMeta,
} from "@/lib/jobs";
import {
  buildJobScoreWriteRows,
  calculateJobScore,
  calculateKesifScore,
  type DeliveryReportInput,
  initialEvaluateAndCloseJobActionState,
  initialSubmitFieldReportActionState,
  serializeFieldReport,
  type EvaluateAndCloseJobActionState,
  type FieldReportInput,
  type SubmitFieldReportInput,
} from "@/lib/scoring";
import { requireAppUser, requireRoles } from "@/lib/auth";
import { getTechnicianSuggestionsForBoats } from "@/lib/continuity";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ON_HOLD_DAYS, getOnHoldDefaultDays } from "@/lib/system-settings";
import type { PaginatedJobsResult, ServiceJobDetail, ServiceJobListItem } from "@/types";

const createJobSchema = z.object({
  boatId: z.string().uuid("Tekne secimi zorunludur."),
  location: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  categoryId: z.string().uuid("Kategori seçimi zorunludur."),
  description: z
    .string()
    .trim()
    .min(10, "Açıklama en az 10 karakter olmalı."),
  isWarranty: z.boolean().default(false),
  isKesif: z.boolean().default(false),
  notes: z.string().trim().optional(),
  plannedStartDate: z.string().trim().min(1, "Planlanan operasyon baslangici zorunludur."),
  estimatedDate: z.string().trim().min(1, "Tahmini bitis tarihi zorunludur."),
  priority: z.enum(jobPriorityOptions).default("NORMAL"),
});

const holdReasonSchema = z.nativeEnum(HoldReason);
const jobStatusSchema = z.nativeEnum(JobStatus);

const createJobActionSchema = createJobSchema.extend({
  nextPath: z.string().trim().optional(),
});
const scoreFieldSchema = z.coerce.number().int().min(1).max(5);
const fieldReportSchema = z
  .object({
    jobId: z.string().uuid(),
    unitInfo: z.string().trim().min(3, "Unite bilgisi zorunludur."),
    responsibleId: z.string().uuid("Sorumlu teknisyen seçimi zorunludur."),
    supportIds: z.array(z.string().uuid()).default([]),
    partsUsed: z.string().trim().optional(),
    hasSubcontractor: z.boolean().default(false),
    subcontractorDetails: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    beforePhotoUrl: z.string().trim().optional(),
    afterPhotoUrl: z.string().trim().optional(),
    detailPhotoUrls: z.array(z.string().trim()).default([]),
  })
  .superRefine((value, context) => {
    const hasPhoto = Boolean(
      value.beforePhotoUrl || value.afterPhotoUrl || value.detailPhotoUrls.length > 0
    );

    if (!hasPhoto) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beforePhotoUrl"],
        message: "En az bir saha fotografi zorunludur.",
      });
    }

    if (value.hasSubcontractor && !value.subcontractorDetails?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcontractorDetails"],
        message: "Taseron secildiginde firma ve kapsam bilgisi zorunludur.",
      });
    }

    if (value.supportIds.includes(value.responsibleId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportIds"],
        message: "Sorumlu teknisyen destek listesinde tekrar seçilemez.",
      });
    }
  });

const evaluateAndCloseSchema = z.object({
  jobId: z.string().uuid(),
  q1_unit: scoreFieldSchema,
  q2_photos: scoreFieldSchema,
  q3_parts: scoreFieldSchema,
  q4_sub: scoreFieldSchema,
  q5_notify: scoreFieldSchema,
});
const scoreObjectionSchema = z.object({
  jobId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "İtiraz nedenini en az 10 karakterle açıklayın.")
    .max(500, "İtiraz metni 500 karakteri geçemez."),
});
const reviewScoreObjectionSchema = z.object({
  jobId: z.string().uuid(),
  objectionLogId: z.string().uuid().optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Düzenleme nedeni en az 10 karakter olmalı.")
    .max(500, "Düzenleme notu 500 karakteri geçemez."),
  q1_unit: scoreFieldSchema,
  q2_photos: scoreFieldSchema,
  q3_parts: scoreFieldSchema,
  q4_sub: scoreFieldSchema,
  q5_notify: scoreFieldSchema,
});

type CreateJobInput = z.infer<typeof createJobSchema>;
const CLOSEOUT_LATENCY_TARGET_P95_MS = 1500;

const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  [JobStatus.KESIF]: [JobStatus.PLANLANDI],
  [JobStatus.PLANLANDI]: [JobStatus.DEVAM_EDIYOR],
  [JobStatus.DEVAM_EDIYOR]: [JobStatus.BEKLEMEDE, JobStatus.TAMAMLANDI],
  [JobStatus.BEKLEMEDE]: [JobStatus.DEVAM_EDIYOR],
  [JobStatus.TAMAMLANDI]: [],
  [JobStatus.KAPANDI]: [],
  [JobStatus.GARANTI]: [],
  [JobStatus.IPTAL]: [],
};

function optionalString(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : undefined;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function hasAnsweredScore(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return false;
  }

  const numericValue = Number(raw);
  return Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 5;
}

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function isWithinObjectionWindow(date: Date | null | undefined) {
  if (!date) {
    return false;
  }

  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() <= thirtyDaysInMs;
}

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
        in: [JobStatus.TAMAMLANDI, JobStatus.KAPANDI],
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

export async function createJob(data: CreateJobInput) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const schedule = normalizeJobSchedule({
    plannedStartDate: data.plannedStartDate,
    estimatedDate: data.estimatedDate,
  });

  const category = await prisma.serviceCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error("Seçilen kategori bulunamadı.");
  }

  const boat = await prisma.boat.findFirst({
    where: {
      id: data.boatId,
      isActive: true,
    },
  });

  if (!boat) {
    throw new Error("Secilen tekne bulunamadi.");
  }
  /*



    throw new Error("Destek ekibindeki kullanıcılardan biri bulunamadı.");
  }

  */
  const status = data.isKesif ? JobStatus.KESIF : JobStatus.PLANLANDI;
  const dispatchDate = new Date(schedule.plannedStartAt.getTime());
  dispatchDate.setHours(0, 0, 0, 0);

  return prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.create({
      data: {
        boatId: boat.id,
        categoryId: category.id,
        description: data.description,
        multiplier: category.multiplier,
        status,
        isWarranty: data.isWarranty,
        isKesif: data.isKesif,
        createdById: actor.id,
        location: data.location,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        notes: data.notes,
        dispatchDate,
        plannedStartDate: schedule.plannedStartAt,
        estimatedDate: toEstimatedDateSeconds(schedule.plannedEndAt),
        priority: normalizeJobPriority(data.priority),
        plannedStartAt: schedule.plannedStartAt,
        plannedEndAt: schedule.plannedEndAt,
        slaHours: schedule.slaHours,
      },
    });

    return job;
  });

}

export async function createJobAction(
  _prevState: CreateJobFormState,
  formData: FormData
): Promise<CreateJobFormState> {
  const parsed = createJobActionSchema.safeParse({
    boatId: formData.get("boatId"),
    location: optionalString(formData.get("location")),
    contactName: optionalString(formData.get("contactName")),
    contactPhone: optionalString(formData.get("contactPhone")),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    isWarranty: parseCheckbox(formData.get("isWarranty")),
    isKesif: parseCheckbox(formData.get("isKesif")),
    notes: optionalString(formData.get("notes")),
    plannedStartDate: formData.get("plannedStartDate"),
    estimatedDate: formData.get("estimatedDate"),
    priority: formData.get("priority"),
    nextPath: formData.get("nextPath"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      error: "Lütfen zorunlu alanları kontrol edin.",
      fieldErrors: {
        boatId: flattened.boatId?.[0],
        categoryId: flattened.categoryId?.[0],
        description: flattened.description?.[0],
        plannedStartDate: flattened.plannedStartDate?.[0],
        estimatedDate: flattened.estimatedDate?.[0],
        priority: flattened.priority?.[0],
      },
    };
  }

  try {
    const job = await createJob(parsed.data);
    revalidatePath("/jobs");
    redirect(`/jobs/${job.id}?created=1`);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "İş oluşturulurken beklenmeyen bir hata oluştu.",
      fieldErrors: {},
    };
  }
}

type UpdateJobStatusOptions = {
  holdReason?: HoldReason;
  reminderDays?: number;
  convertKesif?: boolean;
};
type EvaluateAndCloseJobOptions = {
  closedById: string;
  closedAt?: Date;
};

export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  options: UpdateJobStatusOptions = {}
) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const job = await prisma.serviceJob.findUnique({
    where: { id: jobId },
    include: {
      deliveryReport: true,
      evaluation: true,
    },
  });

  if (!job) {
    throw new Error("İş kaydı bulunamadı.");
  }

  if (!allowedTransitions[job.status].includes(newStatus)) {
    throw new Error("Bu durum geçişi desteklenmiyor.");
  }

  if (newStatus === JobStatus.KAPANDI && (!job.deliveryReport || !job.evaluation)) {
    throw new Error("İş kapatma için teslim raporu ve Form 1 puanlama zorunlu.");
  }

  const now = new Date();
  const holdUntil =
    newStatus === JobStatus.BEKLEMEDE && options.reminderDays
      ? new Date(now.getTime() + options.reminderDays * 24 * 60 * 60 * 1000)
      : null;

  return prisma.serviceJob.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      ...(newStatus === JobStatus.DEVAM_EDIYOR
        ? {
            startedAt: job.startedAt ?? now,
            actualStartAt: job.actualStartAt ?? job.startedAt ?? now,
            holdReason: null,
            holdUntil: null,
          }
        : {}),
      ...(newStatus === JobStatus.BEKLEMEDE
        ? {
            holdReason: options.holdReason,
            holdUntil,
          }
        : {}),
      ...(newStatus === JobStatus.TAMAMLANDI
        ? {
            completedAt: now,
            actualEndAt: now,
          }
        : {}),
      ...(newStatus === JobStatus.KAPANDI
        ? {
            closedAt: now,
            closedById: actor.id,
          }
        : {}),
      ...(options.convertKesif
        ? {
            isKesif: false,
          }
        : {}),
    },
  });

}

export async function updateJobStatusAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const newStatusRaw = String(formData.get("newStatus") ?? "");
  const convertKesif = parseCheckbox(formData.get("convertKesif"));
  const nextPath = optionalString(formData.get("next"));

  const parsedStatus = jobStatusSchema.safeParse(newStatusRaw);

  if (!jobId || !parsedStatus.success) {
    redirect(`/jobs/${jobId || ""}?error=invalid-status`);
  }

  try {
    await updateJobStatus(jobId, parsedStatus.data, { convertKesif });
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    redirect(nextPath ?? `/jobs/${jobId}?updated=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "status-update";
    redirect(`/jobs/${jobId}?error=${message}`);
  }
}

export async function updateHoldDetails(
  jobId: string,
  reason: HoldReason,
  reminderDays: number
) {
  const safeReminderDays = Math.min(Math.max(reminderDays, 1), 14);

  return updateJobStatus(jobId, JobStatus.BEKLEMEDE, {
    holdReason: reason,
    reminderDays: safeReminderDays,
  });
}

export async function updateHoldDetailsAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const defaultReminderDays = await getOnHoldDefaultDays();
  const reminderDays = Number(formData.get("reminderDays") ?? defaultReminderDays);
  const reasonRaw = String(formData.get("reason") ?? "");
  const parsedReason = holdReasonSchema.safeParse(reasonRaw);

  if (!jobId || !parsedReason.success) {
    redirect(`/jobs/${jobId || ""}?error=invalid-hold`);
  }

  try {
    await updateHoldDetails(
      jobId,
      parsedReason.data,
      Number.isFinite(reminderDays) ? reminderDays : DEFAULT_ON_HOLD_DAYS
    );
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    redirect(`/jobs/${jobId}?updated=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "hold-update";
    redirect(`/jobs/${jobId}?error=${message}`);
  }
}

function revalidateJobLifecyclePaths(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
  revalidatePath("/my-jobs");
  revalidatePath("/my-jobs/weekly");
  revalidatePath("/boats");
  revalidatePath("/scoreboard");
}

type CloseJobWithEvaluationOptions = EvaluateAndCloseJobOptions;

export async function submitFieldReport(jobId: string, report: SubmitFieldReportInput) {
  const actor = await requireAppUser();
  const completedAt = new Date();
  const supportIds = Array.from(new Set(report.supportIds)).filter(
    (supportId) => supportId !== report.responsibleId
  );

  return prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: jobId },
      include: {
        assignments: true,
        deliveryReport: true,
      },
    });

    if (!job) {
      throw new Error("Is kaydi bulunamadi.");
    }

    if (actor.role !== Role.TECHNICIAN) {
      throw new Error("Saha raporu yalnizca teknisyen tarafindan gonderilebilir.");
    }

    if (job.status !== JobStatus.DEVAM_EDIYOR) {
      throw new Error("Saha raporu yalnizca devam eden islerde gonderilebilir.");
    }

    if (job.deliveryReport) {
      throw new Error("Bu is icin saha raporu zaten gonderilmis.");
    }

    const declaredTeamIds = [report.responsibleId, ...supportIds];

    if (!declaredTeamIds.includes(actor.id)) {
      throw new Error("Raporu gonderen teknisyen ekip listesinde yer almalidir.");
    }

    const technicians = await tx.user.findMany({
      where: {
        id: {
          in: declaredTeamIds,
        },
        role: Role.TECHNICIAN,
      },
      select: {
        id: true,
      },
    });
    const technicianIds = new Set(technicians.map((technician) => technician.id));

    if (!technicianIds.has(report.responsibleId)) {
      throw new Error("Secilen sorumlu teknisyen bulunamadi.");
    }

    if (supportIds.some((supportId) => !technicianIds.has(supportId))) {
      throw new Error("Destek ekibindeki teknisyenlerden biri bulunamadi.");
    }

    await tx.jobAssignment.deleteMany({
      where: {
        jobId: job.id,
      },
    });

    await tx.jobAssignment.createMany({
      data: [
        {
          jobId: job.id,
          userId: report.responsibleId,
          role: JobRole.SORUMLU,
        },
        ...supportIds.map((supportId) => ({
          jobId: job.id,
          userId: supportId,
          role: JobRole.DESTEK,
        })),
      ],
    });

    const deliveryReport = await tx.deliveryReport.create({
      data: {
        jobId: job.id,
        unitInfo: report.unitInfo,
        partsUsed: report.partsUsed?.trim() || null,
        subcontractorDetails: report.hasSubcontractor
          ? report.subcontractorDetails?.trim() || null
          : null,
        beforePhotoUrl: report.photos.before || null,
        afterPhotoUrl: report.photos.after || null,
        detailPhotoUrls: report.photos.details,
        unitInfoScore: 5,
        photosScore: 5,
        partsListScore: 5,
        subcontractorScore: 5,
        hasSubcontractor: report.hasSubcontractor,
        clientNotifyScore: 5,
        notes: serializeFieldReport(report),
      },
    });

    const updatedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.TAMAMLANDI,
        completedAt,
        actualEndAt: completedAt,
      },
    });

    return {
      deliveryReport,
      job: updatedJob,
    };
  });
}

export async function submitFieldReportAction(
  _prevState: typeof initialSubmitFieldReportActionState,
  formData: FormData
): Promise<typeof initialSubmitFieldReportActionState> {
  const detailPhotoUrlsRaw = String(formData.get("detailPhotoUrls") ?? "[]");

  let detailPhotoUrls: string[] = [];
  try {
    const parsedPhotoUrls = JSON.parse(detailPhotoUrlsRaw) as unknown;
    detailPhotoUrls = Array.isArray(parsedPhotoUrls)
      ? parsedPhotoUrls.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    detailPhotoUrls = [];
  }

  const parsed = fieldReportSchema.safeParse({
    jobId: formData.get("jobId"),
    unitInfo: formData.get("unitInfo"),
    responsibleId: formData.get("responsibleId"),
    supportIds: formData.getAll("supportIds").map(String),
    partsUsed: optionalString(formData.get("partsUsed")),
    hasSubcontractor: parseCheckbox(formData.get("hasSubcontractor")),
    subcontractorDetails: optionalString(formData.get("subcontractorDetails")),
    notes: optionalString(formData.get("notes")),
    beforePhotoUrl: optionalString(formData.get("beforePhotoUrl")),
    afterPhotoUrl: optionalString(formData.get("afterPhotoUrl")),
    detailPhotoUrls,
  });

  if (!parsed.success) {
    return {
      ...initialSubmitFieldReportActionState,
      error: parsed.error.issues[0]?.message ?? "Saha raporu eksik veya gecersiz.",
    };
  }

  try {
    await submitFieldReport(parsed.data.jobId, {
      unitInfo: parsed.data.unitInfo,
      responsibleId: parsed.data.responsibleId,
      supportIds: parsed.data.supportIds,
      partsUsed: parsed.data.partsUsed,
      hasSubcontractor: parsed.data.hasSubcontractor,
      subcontractorDetails: parsed.data.subcontractorDetails,
      notes: parsed.data.notes,
      photos: {
        before: parsed.data.beforePhotoUrl,
        after: parsed.data.afterPhotoUrl,
        details: parsed.data.detailPhotoUrls,
      },
    });

    revalidateJobLifecyclePaths(parsed.data.jobId);

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      ...initialSubmitFieldReportActionState,
      error:
        error instanceof Error
          ? error.message
          : "Saha raporu gonderilirken beklenmeyen bir hata olustu.",
    };
  }
}

export async function evaluateAndCloseJob(
  jobId: string,
  evaluationAnswers: number[],
  evaluatorId: string,
  options?: EvaluateAndCloseJobOptions
) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  if (actor.id !== evaluatorId) {
    throw new Error("Degerlendirmeyi baslatan kullanici dogrulanamadi.");
  }

  const closedAt = options?.closedAt ?? new Date();
  const closeoutStartedAt = Date.now();

  const result = await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: jobId },
      include: {
        boat: true,
        assignments: {
          include: {
            user: true,
          },
        },
        deliveryReport: true,
        evaluation: true,
        jobScores: true,
      },
    });

    if (!job) {
      throw new Error("Is kaydi bulunamadi.");
    }

    if (job.status !== JobStatus.TAMAMLANDI) {
      throw new Error("Form-1 puanlamasi sadece tamamlanan islerde yapilabilir.");
    }

    if (!job.deliveryReport) {
      throw new Error("Is kapanmadan once saha raporu gonderilmelidir.");
    }

    if (job.evaluation || job.jobScores.length > 0) {
      throw new Error("Bu is icin puanlama zaten kaydedilmis.");
    }

    if (job.assignments.length === 0) {
      throw new Error("Puanlama icin en az bir teknisyen atamasi gerekli.");
    }

    const { baseScore } = calculateJobScore(evaluationAnswers, job.multiplier, 1);

    const evaluationRecord = await tx.jobEvaluation.create({
      data: {
        jobId: job.id,
        evaluatorId,
        q1_unit: evaluationAnswers[0],
        q2_photos: evaluationAnswers[1],
        q3_parts: evaluationAnswers[2],
        q4_sub: evaluationAnswers[3],
        q5_notify: evaluationAnswers[4],
        baseScore,
      },
    });

    const assignmentNameMap = new Map(
      job.assignments.map((assignment) => [assignment.userId, assignment.user.name])
    );
    const jobScoreRecords = buildJobScoreWriteRows({
      jobId: job.id,
      assignments: job.assignments.map((assignment) => ({
        userId: assignment.userId,
        role: assignment.role,
      })),
      baseScore,
      multiplier: job.multiplier,
      isKesif: job.isKesif,
      scoreDate: closedAt,
    });

    if (jobScoreRecords.length > 0) {
      await tx.jobScore.createMany({
        data: jobScoreRecords,
      });
    }

    if (job.isKesif && job.kesifJobId) {
      const mainJob = await tx.serviceJob.findUnique({
        where: { id: job.kesifJobId },
        include: {
          assignments: true,
        },
      });

      if (mainJob) {
        const kesifScore = calculateKesifScore(baseScore);
        const kesifDate = job.createdAt;

        const mainJobScoreRows: Prisma.JobScoreCreateManyInput[] = mainJob.assignments.map(
          (assignment) => ({
            jobId: job.id,
            userId: assignment.userId,
            role: assignment.role,
            baseScore,
            multiplier: 0.5,
            roleMultiplier: 1,
            finalScore: kesifScore,
            isKesif: true,
            month: kesifDate.getMonth() + 1,
            year: kesifDate.getFullYear(),
          })
        );

        if (mainJobScoreRows.length > 0) {
          await tx.jobScore.createMany({
            data: mainJobScoreRows,
          });
        }
      }
    }

    const linkedKesifJobs = await tx.serviceJob.findMany({
      where: {
        id: { not: job.id },
        isKesif: true,
        OR: [
          { kesifJobId: job.id },
          {
            boatId: job.boatId,
            kesifJobId: null,
            createdAt: {
              lte: job.createdAt,
            },
          },
        ],
      },
      include: {
        assignments: true,
        jobScores: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const retroBaseScore = calculateKesifScore(baseScore);
    const retroKesifJobs = linkedKesifJobs.filter((kesifJob) => kesifJob.jobScores.length === 0);
    const retroKesifScoreRows = retroKesifJobs.flatMap((kesifJob) =>
      buildJobScoreWriteRows({
        jobId: kesifJob.id,
        assignments: kesifJob.assignments.map((assignment) => ({
          userId: assignment.userId,
          role: assignment.role,
        })),
        baseScore: retroBaseScore,
        multiplier: 1,
        isKesif: true,
        scoreDate: kesifJob.createdAt,
      })
    );

    if (retroKesifScoreRows.length > 0) {
      await tx.jobScore.createMany({
        data: retroKesifScoreRows,
      });
    }

    if (retroKesifJobs.length > 0) {
      await tx.serviceJob.updateMany({
        where: {
          id: {
            in: retroKesifJobs.map((kesifJob) => kesifJob.id),
          },
        },
        data: {
          kesifJobId: job.id,
        },
      });
    }

    await tx.boat.update({
      where: {
        id: job.boatId,
      },
      data: {
        visitCount: {
          increment: 1,
        },
        isVip: job.boat.isVip || job.boat.visitCount + 1 >= 8,
      },
    });

    const closedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.KAPANDI,
        closedAt,
        closedById: options?.closedById ?? actor.id,
      },
    });

    return {
      closedJob,
      deliveryReport: job.deliveryReport,
      evaluation: evaluationRecord,
      scores: jobScoreRecords.map((score) => ({
        userId: score.userId,
        userName: assignmentNameMap.get(score.userId) ?? "Teknisyen",
        role: score.role,
        roleMultiplier: score.roleMultiplier,
        finalScore: score.finalScore,
      })),
      baseScore,
      multiplier: job.multiplier,
    };
  });

  const closeoutDurationMs = Date.now() - closeoutStartedAt;

  if (closeoutDurationMs > CLOSEOUT_LATENCY_TARGET_P95_MS) {
    console.warn(
      `[jobs.closeout] p95 target exceeded for ${jobId}: ${closeoutDurationMs}ms > ${CLOSEOUT_LATENCY_TARGET_P95_MS}ms`
    );
  }

  return result;
}

export async function legacyCloseJobWithEvaluation(
  jobId: string,
  deliveryReport: DeliveryReportInput,
  evaluationAnswers: number[],
  evaluatorId: string,
  options?: CloseJobWithEvaluationOptions
) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  if (actor.id !== evaluatorId) {
    throw new Error("Puanlamayı başlatan kullanıcı doğrulanamadı.");
  }

  const closedAt = options?.closedAt ?? new Date();
  const closeoutStartedAt = Date.now();

  const result = await prisma.$transaction(async (tx) => {
    // Performance target: keep the closeout transaction under CLOSEOUT_LATENCY_TARGET_P95_MS at p95.
    const job = await tx.serviceJob.findUnique({
      where: { id: jobId },
      include: {
        boat: true,
        assignments: {
          include: {
            user: true,
          },
        },
        deliveryReport: true,
        evaluation: true,
        jobScores: true,
      },
    });

    if (!job) {
      throw new Error("İş kaydı bulunamadı.");
    }

    if (job.status !== JobStatus.TAMAMLANDI) {
      throw new Error("İş kapatma akışı sadece tamamlanan işlerde başlatılabilir.");
    }

    if (job.deliveryReport || job.evaluation || job.jobScores.length > 0) {
      throw new Error("Bu iş için teslim raporu veya puanlama zaten kaydedilmiş.");
    }

    if (job.assignments.length === 0) {
      throw new Error("Puanlama için en az bir teknisyen ataması gerekli.");
    }

    const deliveryReportRecord = await tx.deliveryReport.create({
      data: {
        jobId: job.id,
        unitInfoScore: deliveryReport.unitInfoScore,
        photosScore: deliveryReport.photosScore,
        partsListScore: deliveryReport.partsListScore,
        subcontractorScore: deliveryReport.hasSubcontractor
          ? deliveryReport.subcontractorScore
          : 5,
        hasSubcontractor: deliveryReport.hasSubcontractor,
        clientNotifyScore: deliveryReport.clientNotifyScore,
        notes: deliveryReport.notes,
      },
    });

    const { baseScore } = calculateJobScore(evaluationAnswers, job.multiplier, 1);

    const evaluationRecord = await tx.jobEvaluation.create({
      data: {
        jobId: job.id,
        evaluatorId,
        q1_unit: evaluationAnswers[0],
        q2_photos: evaluationAnswers[1],
        q3_parts: evaluationAnswers[2],
        q4_sub: evaluationAnswers[3],
        q5_notify: evaluationAnswers[4],
        baseScore,
      },
    });

    const assignmentNameMap = new Map(
      job.assignments.map((assignment) => [assignment.userId, assignment.user.name])
    );
    const jobScoreRecords = buildJobScoreWriteRows({
      jobId: job.id,
      assignments: job.assignments.map((assignment) => ({
        userId: assignment.userId,
        role: assignment.role,
      })),
      baseScore,
      multiplier: job.multiplier,
      isKesif: job.isKesif,
      scoreDate: closedAt,
    });

    if (jobScoreRecords.length > 0) {
      await tx.jobScore.createMany({
        data: jobScoreRecords,
      });
    }

    if (job.isKesif && job.kesifJobId) {
      const mainJob = await tx.serviceJob.findUnique({
        where: { id: job.kesifJobId },
        include: {
          assignments: true,
        },
      });

      if (mainJob) {
        const kesifScore = calculateKesifScore(baseScore);
        const kesifDate = job.createdAt;

        const mainJobScoreRows: Prisma.JobScoreCreateManyInput[] = mainJob.assignments.map(
          (assignment) => ({
            jobId: job.id,
            userId: assignment.userId,
            role: assignment.role,
            baseScore,
            multiplier: 0.5,
            roleMultiplier: 1,
            finalScore: kesifScore,
            isKesif: true,
            month: kesifDate.getMonth() + 1,
            year: kesifDate.getFullYear(),
          })
        );

        if (mainJobScoreRows.length > 0) {
          await tx.jobScore.createMany({
            data: mainJobScoreRows,
          });
        }
      }
    }

    const linkedKesifJobs = await tx.serviceJob.findMany({
      where: {
        id: { not: job.id },
        isKesif: true,
        OR: [
          { kesifJobId: job.id },
          {
            boatId: job.boatId,
            kesifJobId: null,
            createdAt: {
              lte: job.createdAt,
            },
          },
        ],
      },
      include: {
        assignments: true,
        jobScores: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const retroBaseScore = calculateKesifScore(baseScore);
    const retroKesifJobs = linkedKesifJobs.filter((kesifJob) => kesifJob.jobScores.length === 0);
    const retroKesifScoreRows = retroKesifJobs.flatMap((kesifJob) =>
      buildJobScoreWriteRows({
        jobId: kesifJob.id,
        assignments: kesifJob.assignments.map((assignment) => ({
          userId: assignment.userId,
          role: assignment.role,
        })),
        baseScore: retroBaseScore,
        multiplier: 1,
        isKesif: true,
        scoreDate: kesifJob.createdAt,
      })
    );

    if (retroKesifScoreRows.length > 0) {
      await tx.jobScore.createMany({
        data: retroKesifScoreRows,
      });
    }

    if (retroKesifJobs.length > 0) {
      await tx.serviceJob.updateMany({
        where: {
          id: {
            in: retroKesifJobs.map((kesifJob) => kesifJob.id),
          },
        },
        data: {
          kesifJobId: job.id,
        },
      });
    }

    await tx.boat.update({
      where: {
        id: job.boatId,
      },
      data: {
        visitCount: {
          increment: 1,
        },
        isVip: job.boat.isVip || job.boat.visitCount + 1 >= 8,
      },
    });

    const closedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.KAPANDI,
        closedAt,
        closedById: options?.closedById ?? actor.id,
      },
    });

    return {
      closedJob,
      deliveryReport: deliveryReportRecord,
      evaluation: evaluationRecord,
      scores: jobScoreRecords.map((score) => ({
        userId: score.userId,
        userName: assignmentNameMap.get(score.userId) ?? "Teknisyen",
        role: score.role,
        roleMultiplier: score.roleMultiplier,
        finalScore: score.finalScore,
      })),
      baseScore,
      multiplier: job.multiplier,
    };
  });

  const closeoutDurationMs = Date.now() - closeoutStartedAt;

  if (closeoutDurationMs > CLOSEOUT_LATENCY_TARGET_P95_MS) {
    console.warn(
      `[jobs.closeout] p95 target exceeded for ${jobId}: ${closeoutDurationMs}ms > ${CLOSEOUT_LATENCY_TARGET_P95_MS}ms`
    );
  }

  return result;
}

export async function evaluateAndCloseJobAction(
  _prevState: EvaluateAndCloseJobActionState,
  formData: FormData
): Promise<EvaluateAndCloseJobActionState> {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  const parsed = evaluateAndCloseSchema.safeParse({
    jobId: formData.get("jobId"),
    q1_unit: formData.get("q1_unit"),
    q2_photos: formData.get("q2_photos"),
    q3_parts: formData.get("q3_parts"),
    q4_sub: formData.get("q4_sub"),
    q5_notify: formData.get("q5_notify"),
  });

  if (!parsed.success) {
    const deliveryAnsweredCount = 0;
    const evaluationAnsweredCount = [
      formData.get("q1_unit"),
      formData.get("q2_photos"),
      formData.get("q3_parts"),
      formData.get("q4_sub"),
      formData.get("q5_notify"),
    ].filter((value) => hasAnsweredScore(value)).length;

    let error =
      "Teslim raporu ve Form 1 değerlendirmesi zorunludur.";

    if (deliveryAnsweredCount < 5 && evaluationAnsweredCount >= 5) {
      error = `Lütfen önce teslim raporunu doldurun (${deliveryAnsweredCount}/5 alan tamamlandı).`;
    } else if (deliveryAnsweredCount >= 5 && evaluationAnsweredCount < 5) {
      error = `Lütfen Form 1 değerlendirmesini doldurun (${evaluationAnsweredCount}/5 soru yanıtlandı).`;
    }

    return {
      ...initialEvaluateAndCloseJobActionState,
      error,
    };
  }

  try {
    const result = await evaluateAndCloseJob(
      parsed.data.jobId,
      [
        parsed.data.q1_unit,
        parsed.data.q2_photos,
        parsed.data.q3_parts,
        parsed.data.q4_sub,
        parsed.data.q5_notify,
      ],
      actor.id,
      {
        closedById: actor.id,
      }
    );

    revalidateJobLifecyclePaths(parsed.data.jobId);

    const responsibleScore =
      result.scores.find((score) => score.role === JobRole.SORUMLU)?.finalScore ??
      result.scores[0]?.finalScore ??
      0;

    return {
      success: true,
      error: null,
      result: {
        jobId: result.closedJob.id,
        baseScore: result.baseScore,
        multiplier: result.multiplier,
        responsibleScore,
        scores: result.scores,
      },
    };
  } catch (error) {
    return {
      ...initialEvaluateAndCloseJobActionState,
      error:
        error instanceof Error
          ? error.message
          : "İş kapatma akışı sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

export async function submitScoreObjectionAction(formData: FormData) {
  const actor = await requireAppUser();
  const parsed = scoreObjectionSchema.safeParse({
    jobId: formData.get("jobId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirect(`/jobs/${String(formData.get("jobId") ?? "")}?error=invalid-objection`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({
        where: { id: parsed.data.jobId },
        include: {
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
          evaluation: true,
          assignments: {
            select: {
              userId: true,
            },
          },
          jobScores: {
            select: {
              userId: true,
              role: true,
              finalScore: true,
            },
          },
        },
      });

      if (!job?.evaluation || !job.closedAt) {
        throw new Error("İtiraz için kapatılmış ve puanlanmış bir iş gerekli.");
      }

      if (!isWithinObjectionWindow(job.closedAt)) {
        throw new Error("Puan itirazı yalnızca ilk 30 gün içinde açılabilir.");
      }

      const isAssignedUser = job.assignments.some(
        (assignment) => assignment.userId === actor.id
      );
      const canObject =
        isAssignedUser ||
        actor.role === Role.ADMIN ||
        actor.role === Role.COORDINATOR ||
        actor.role === Role.WORKSHOP_CHIEF;

      if (!canObject) {
        throw new Error("Bu iş için puan itirazı oluşturma yetkiniz bulunmuyor.");
      }

      const existingObjection = await tx.evaluationChangeLog.findFirst({
        where: {
          entityType: "JOB_SCORE_OBJECTION",
          entityId: job.id,
          changedById: actor.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (existingObjection && isWithinObjectionWindow(existingObjection.createdAt)) {
        throw new Error("Bu iş için zaten açık bir puan itirazınız bulunuyor.");
      }

      await tx.evaluationChangeLog.create({
        data: {
          entityType: "JOB_SCORE_OBJECTION",
          entityId: job.id,
          changedById: actor.id,
          reason: parsed.data.reason,
          oldValues: {
            baseScore: job.evaluation.baseScore,
            answers: [
              job.evaluation.q1_unit,
              job.evaluation.q2_photos,
              job.evaluation.q3_parts,
              job.evaluation.q4_sub,
              job.evaluation.q5_notify,
            ],
            scores: job.jobScores,
          },
          newValues: {
            status: "PENDING",
          },
        },
      });

      const admins = await tx.user.findMany({
        where: {
          role: Role.ADMIN,
        },
        select: {
          id: true,
        },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "SCORE_OBJECTION",
            title: "Yeni puan itirazı",
            body: `${job.boat.name} - ${job.category.name} işi için itiraz oluşturuldu.`,
            metadata: {
              jobId: job.id,
              raisedById: actor.id,
            },
          })),
        });
      }
    });

    revalidatePath(`/jobs/${parsed.data.jobId}`);
    revalidatePath("/settings");
    redirect(`/jobs/${parsed.data.jobId}?objection=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "score-objection-failed";
    redirect(`/jobs/${parsed.data.jobId}?error=${message}`);
  }
}

export async function reviewScoreObjectionAction(formData: FormData) {
  const actor = await requireRoles([Role.ADMIN]);
  const tab = formData.get("tab") === "system" ? "system" : "profile";
  const yearValue = Number(formData.get("year"));

  const buildSettingsReviewUrl = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams({ tab, ...params });

    if (Number.isInteger(yearValue) && yearValue >= 2024 && yearValue <= 2100) {
      searchParams.set("year", String(yearValue));
    }

    return `/settings?${searchParams.toString()}`;
  };

  const parsed = reviewScoreObjectionSchema.safeParse({
    jobId: formData.get("jobId"),
    objectionLogId: formData.get("objectionLogId") || undefined,
    reason: formData.get("reason"),
    q1_unit: formData.get("q1_unit"),
    q2_photos: formData.get("q2_photos"),
    q3_parts: formData.get("q3_parts"),
    q4_sub: formData.get("q4_sub"),
    q5_notify: formData.get("q5_notify"),
  });

  if (!parsed.success) {
    redirect(buildSettingsReviewUrl({ error: "invalid-score-review" }));
  }

  try {
    await prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findUnique({
        where: { id: parsed.data.jobId },
        include: {
          evaluation: true,
          assignments: {
            select: {
              userId: true,
              role: true,
            },
          },
          jobScores: {
            select: {
              id: true,
              userId: true,
              role: true,
              roleMultiplier: true,
              baseScore: true,
              finalScore: true,
            },
          },
        },
      });

      if (!job?.evaluation) {
        throw new Error("Düzenlenecek puanlama kaydı bulunamadı.");
      }

      const answers = [
        parsed.data.q1_unit,
        parsed.data.q2_photos,
        parsed.data.q3_parts,
        parsed.data.q4_sub,
        parsed.data.q5_notify,
      ];
      const oldValues = {
        baseScore: job.evaluation.baseScore,
        answers: [
          job.evaluation.q1_unit,
          job.evaluation.q2_photos,
          job.evaluation.q3_parts,
          job.evaluation.q4_sub,
          job.evaluation.q5_notify,
        ],
        scores: job.jobScores,
      };
      const { baseScore } = calculateJobScore(answers, job.multiplier, 1);

      await tx.jobEvaluation.update({
        where: {
          jobId: job.id,
        },
        data: {
          q1_unit: answers[0],
          q2_photos: answers[1],
          q3_parts: answers[2],
          q4_sub: answers[3],
          q5_notify: answers[4],
          baseScore,
        },
      });

      await Promise.all([
        tx.jobScore.updateMany({
          where: {
            jobId: job.id,
            role: JobRole.SORUMLU,
          },
          data: {
            baseScore,
            finalScore: Number((baseScore * job.multiplier).toFixed(1)),
          },
        }),
        tx.jobScore.updateMany({
          where: {
            jobId: job.id,
            role: JobRole.DESTEK,
          },
          data: {
            baseScore,
            finalScore: Number((baseScore * job.multiplier * 0.4).toFixed(1)),
          },
        }),
      ]);

      const linkedKesifJobs = await tx.serviceJob.findMany({
        where: {
          kesifJobId: job.id,
        },
        select: {
          id: true,
        },
      });

      const retroBaseScore = calculateKesifScore(baseScore);

      if (linkedKesifJobs.length > 0) {
        await Promise.all(
          linkedKesifJobs.flatMap((kesifJob) => [
            tx.jobScore.updateMany({
              where: {
                jobId: kesifJob.id,
                role: JobRole.SORUMLU,
              },
              data: {
                baseScore: retroBaseScore,
                finalScore: retroBaseScore,
              },
            }),
            tx.jobScore.updateMany({
              where: {
                jobId: kesifJob.id,
                role: JobRole.DESTEK,
              },
              data: {
                baseScore: retroBaseScore,
                finalScore: Number((retroBaseScore * 0.4).toFixed(1)),
              },
            }),
          ])
        );
      }

      await tx.evaluationChangeLog.create({
        data: {
          entityType: "JOB_EVALUATION_UPDATE",
          entityId: job.id,
          changedById: actor.id,
          reason: parsed.data.reason,
          oldValues,
          newValues: {
            baseScore,
            answers,
          },
        },
      });

      const recipientIds = [...new Set(job.assignments.map((assignment) => assignment.userId))];

      if (parsed.data.objectionLogId) {
        const objectionLog = await tx.evaluationChangeLog.findUnique({
          where: {
            id: parsed.data.objectionLogId,
          },
          select: {
            changedById: true,
          },
        });

        if (objectionLog?.changedById) {
          recipientIds.push(objectionLog.changedById);
        }
      }

      const uniqueRecipients = [...new Set(recipientIds)].filter(
        (recipientId) => recipientId !== actor.id
      );

      if (uniqueRecipients.length > 0) {
        await tx.notification.createMany({
          data: uniqueRecipients.map((recipientId) => ({
            userId: recipientId,
            type: "SCORE_UPDATED",
            title: "Puanlama güncellendi",
            body: `Admin, ${job.id.slice(0, 8)} numaralı iş için Form 1 puanlamasını güncelledi.`,
            metadata: {
              jobId: job.id,
              objectionLogId: parsed.data.objectionLogId ?? null,
            },
          })),
        });
      }
    });

    revalidatePath(`/jobs/${parsed.data.jobId}`);
    revalidatePath("/scoreboard");
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    redirect(buildSettingsReviewUrl({ reviewed: parsed.data.jobId }));
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "score-review-failed";
    redirect(buildSettingsReviewUrl({ error: message }));
  }
}

export async function markClientNotificationSent(input: {
  jobId: string;
  contactId: string;
  templateLang: string;
}) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  const notification = await prisma.clientNotification.create({
    data: {
      jobId: input.jobId,
      contactId: input.contactId,
      channel: "WHATSAPP",
      templateLang: input.templateLang.toUpperCase(),
      sentAt: new Date(),
      sentById: actor.id,
      confirmed: true,
    },
  });

  revalidatePath(`/jobs/${input.jobId}`);
  revalidatePath(`/my-jobs/${input.jobId}`);
  revalidatePath("/boats");

  return notification;
}
