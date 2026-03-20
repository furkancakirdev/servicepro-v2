"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HoldReason, JobRole, JobStatus, Role } from "@prisma/client";
import { z } from "zod";

import {
  boatTypeOptions,
  openStatuses,
  type CreateJobFormState,
  type JobFiltersInput,
  type JobFormMeta,
} from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import {
  calculateJobScore,
  calculateKesifScore,
  initialCloseJobWithEvaluationActionState,
  type CloseJobWithEvaluationActionState,
  type DeliveryReportInput,
} from "@/lib/scoring";
import { requireAppUser, requireRoles } from "@/lib/auth";
import type { ServiceJobDetail, ServiceJobListItem } from "@/types";
import { DEFAULT_ON_HOLD_DAYS, getOnHoldDefaultDays } from "@/lib/system-settings";

const createJobSchema = z.object({
  boatName: z.string().trim().min(2, "Tekne adi zorunludur."),
  boatType: z.enum(boatTypeOptions),
  location: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  categoryId: z.string().uuid("Kategori secimi zorunludur."),
  description: z
    .string()
    .trim()
    .min(10, "Aciklama en az 10 karakter olmali."),
  isWarranty: z.boolean().default(false),
  isKesif: z.boolean().default(false),
  notes: z.string().trim().optional(),
  responsibleId: z.string().uuid("Sorumlu teknisyen secimi zorunludur."),
  supportIds: z.array(z.string().uuid()).default([]),
});

const holdReasonSchema = z.nativeEnum(HoldReason);
const jobStatusSchema = z.nativeEnum(JobStatus);

const createJobActionSchema = createJobSchema.extend({
  nextPath: z.string().trim().optional(),
});
const scoreFieldSchema = z.coerce.number().int().min(1).max(5);
const closeJobSchema = z.object({
  jobId: z.string().uuid(),
  evaluatorId: z.string().uuid().optional(),
  unitInfoScore: scoreFieldSchema,
  photosScore: scoreFieldSchema,
  partsListScore: scoreFieldSchema,
  hasSubcontractor: z.boolean().default(false),
  subcontractorScore: scoreFieldSchema,
  clientNotifyScore: scoreFieldSchema,
  deliveryNotes: z.string().trim().optional(),
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
    .min(10, "Itiraz nedenini en az 10 karakterle aciklayin.")
    .max(500, "Itiraz metni 500 karakteri gecemez."),
});
const reviewScoreObjectionSchema = z.object({
  jobId: z.string().uuid(),
  objectionLogId: z.string().uuid().optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Duzenleme nedeni en az 10 karakter olmali.")
    .max(500, "Duzenleme notu 500 karakteri gecemez."),
  q1_unit: scoreFieldSchema,
  q2_photos: scoreFieldSchema,
  q3_parts: scoreFieldSchema,
  q4_sub: scoreFieldSchema,
  q5_notify: scoreFieldSchema,
});

type CreateJobInput = z.infer<typeof createJobSchema>;

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

  return {
    boats: boats
      .map((boat) => ({
        id: boat.id,
        name: boat.name,
        type: boat.type,
        jobCount: boat._count.jobs,
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

export async function getJobs(filters: JobFiltersInput = {}): Promise<ServiceJobListItem[]> {
  await requireAppUser();

  const normalizedQuery = filters.query?.trim();
  const startDate = parseDateBoundary(filters.startDate);
  const endDate = parseDateBoundary(filters.endDate, true);

  return prisma.serviceJob.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.technicianId
        ? {
            assignments: {
              some: {
                userId: filters.technicianId,
              },
            },
          }
        : {}),
      ...(normalizedQuery
        ? {
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
          }
        : {}),
      ...((startDate || endDate)
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
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
  });
}

export async function getJobById(id: string): Promise<{
  job: ServiceJobDetail;
  sameBoatOpenJobs: Array<Pick<ServiceJobListItem, "id" | "status" | "createdAt"> & {
    category: { name: string; subScope: string };
  }>;
} | null> {
  await requireAppUser();

  const job = await prisma.serviceJob.findUnique({
    where: { id },
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
      deliveryReport: true,
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

  return { job, sameBoatOpenJobs };
}

export async function createJob(data: CreateJobInput) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  const category = await prisma.serviceCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error("Secilen kategori bulunamadi.");
  }

  const responsible = await prisma.user.findFirst({
    where: {
      id: data.responsibleId,
      role: Role.TECHNICIAN,
    },
  });

  if (!responsible) {
    throw new Error("Sorumlu teknisyen bulunamadi.");
  }

  const supportIds = [...new Set(data.supportIds)].filter(
    (supportId) => supportId !== data.responsibleId
  );

  const supportTechnicians = supportIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: supportIds },
          role: Role.TECHNICIAN,
        },
        select: { id: true },
      })
    : [];

  if (supportTechnicians.length !== supportIds.length) {
    throw new Error("Destek ekibindeki kullanicilardan biri bulunamadi.");
  }

  const existingBoat = await prisma.boat.findFirst({
    where: {
      name: {
        equals: data.boatName,
        mode: "insensitive",
      },
    },
  });

  const boat = existingBoat
    ? existingBoat.isActive
      ? existingBoat
      : await prisma.boat.update({
          where: {
            id: existingBoat.id,
          },
          data: {
            isActive: true,
            type: data.boatType,
          },
        })
    : await prisma.boat.create({
        data: {
          name: data.boatName,
          type: data.boatType,
          isActive: true,
        },
      });

  const status = data.isKesif ? JobStatus.KESIF : JobStatus.PLANLANDI;

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
      },
    });

    await tx.jobAssignment.createMany({
      data: [
        {
          jobId: job.id,
          userId: responsible.id,
          role: JobRole.SORUMLU,
        },
        ...supportTechnicians.map((supportUser) => ({
          jobId: job.id,
          userId: supportUser.id,
          role: JobRole.DESTEK,
        })),
      ],
    });

    return job;
  });
}

export async function createJobAction(
  _prevState: CreateJobFormState,
  formData: FormData
): Promise<CreateJobFormState> {
  const parsed = createJobActionSchema.safeParse({
    boatName: formData.get("boatName"),
    boatType: formData.get("boatType"),
    location: optionalString(formData.get("location")),
    contactName: optionalString(formData.get("contactName")),
    contactPhone: optionalString(formData.get("contactPhone")),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    isWarranty: parseCheckbox(formData.get("isWarranty")),
    isKesif: parseCheckbox(formData.get("isKesif")),
    notes: optionalString(formData.get("notes")),
    responsibleId: formData.get("responsibleId"),
    supportIds: formData.getAll("supportIds").map(String),
    nextPath: formData.get("nextPath"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      error: "Lutfen zorunlu alanlari kontrol edin.",
      fieldErrors: {
        boatName: flattened.boatName?.[0],
        boatType: flattened.boatType?.[0],
        categoryId: flattened.categoryId?.[0],
        description: flattened.description?.[0],
        responsibleId: flattened.responsibleId?.[0],
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
          : "Is olusturulurken beklenmeyen bir hata olustu.",
      fieldErrors: {},
    };
  }
}

type UpdateJobStatusOptions = {
  holdReason?: HoldReason;
  reminderDays?: number;
  convertKesif?: boolean;
};
type CloseJobWithEvaluationOptions = {
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
    throw new Error("Is kaydi bulunamadi.");
  }

  if (!allowedTransitions[job.status].includes(newStatus)) {
    throw new Error("Bu durum gecisi desteklenmiyor.");
  }

  if (newStatus === JobStatus.KAPANDI && (!job.deliveryReport || !job.evaluation)) {
    throw new Error("Is kapatma icin teslim raporu ve Form 1 puanlama zorunlu.");
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

export async function closeJobWithEvaluation(
  jobId: string,
  deliveryReport: DeliveryReportInput,
  evaluationAnswers: number[],
  evaluatorId: string,
  options: CloseJobWithEvaluationOptions
) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  if (actor.id !== evaluatorId) {
    throw new Error("Puanlamayi baslatan kullanici dogrulanamadi.");
  }

  const closedAt = options.closedAt ?? new Date();

  return prisma.$transaction(async (tx) => {
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
      throw new Error("Is kapatma akisi sadece tamamlanan islerde baslatilabilir.");
    }

    if (job.deliveryReport || job.evaluation || job.jobScores.length > 0) {
      throw new Error("Bu is icin teslim raporu veya puanlama zaten kaydedilmis.");
    }

    if (job.assignments.length === 0) {
      throw new Error("Puanlama icin en az bir teknisyen atamasi gerekli.");
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

    const jobScoreRecords = await Promise.all(
      job.assignments.map((assignment) => {
        const roleMultiplier = assignment.role === JobRole.SORUMLU ? 1 : 0.4;
        const score = calculateJobScore(evaluationAnswers, job.multiplier, roleMultiplier);

        return tx.jobScore.create({
          data: {
            jobId: job.id,
            userId: assignment.userId,
            role: assignment.role,
            baseScore: score.baseScore,
            multiplier: job.multiplier,
            roleMultiplier,
            finalScore: score.finalScore,
            isKesif: job.isKesif,
            month: closedAt.getMonth() + 1,
            year: closedAt.getFullYear(),
          },
          include: {
            user: true,
          },
        });
      })
    );

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

    for (const kesifJob of linkedKesifJobs) {
      if (kesifJob.jobScores.length > 0) {
        continue;
      }

      const retroBaseScore = calculateKesifScore(baseScore);

      await Promise.all(
        kesifJob.assignments.map((assignment) => {
          const roleMultiplier = assignment.role === JobRole.SORUMLU ? 1 : 0.4;
          const finalScore = Number((retroBaseScore * roleMultiplier).toFixed(1));

          return tx.jobScore.create({
            data: {
              jobId: kesifJob.id,
              userId: assignment.userId,
              role: assignment.role,
              baseScore: retroBaseScore,
              multiplier: 1,
              roleMultiplier,
              finalScore,
              isKesif: true,
              month: kesifJob.createdAt.getMonth() + 1,
              year: kesifJob.createdAt.getFullYear(),
            },
          });
        })
      );

      await tx.serviceJob.update({
        where: { id: kesifJob.id },
        data: {
          kesifJobId: job.id,
        },
      });
    }

    const closedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.KAPANDI,
        closedAt,
        closedById: options.closedById,
      },
    });

    return {
      closedJob,
      deliveryReport: deliveryReportRecord,
      evaluation: evaluationRecord,
      scores: jobScoreRecords.map((score) => ({
        userId: score.userId,
        userName: score.user.name,
        role: score.role,
        roleMultiplier: score.roleMultiplier,
        finalScore: score.finalScore,
      })),
      baseScore,
      multiplier: job.multiplier,
    };
  });
}

export async function closeJobWithEvaluationAction(
  _prevState: CloseJobWithEvaluationActionState,
  formData: FormData
): Promise<CloseJobWithEvaluationActionState> {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  const parsed = closeJobSchema.safeParse({
    jobId: formData.get("jobId"),
    evaluatorId: formData.get("evaluatorId"),
    unitInfoScore: formData.get("unitInfoScore"),
    photosScore: formData.get("photosScore"),
    partsListScore: formData.get("partsListScore"),
    hasSubcontractor: parseCheckbox(formData.get("hasSubcontractor")),
    subcontractorScore: formData.get("subcontractorScore"),
    clientNotifyScore: formData.get("clientNotifyScore"),
    deliveryNotes: optionalString(formData.get("deliveryNotes")),
    q1_unit: formData.get("q1_unit"),
    q2_photos: formData.get("q2_photos"),
    q3_parts: formData.get("q3_parts"),
    q4_sub: formData.get("q4_sub"),
    q5_notify: formData.get("q5_notify"),
  });

  if (!parsed.success) {
    return {
      ...initialCloseJobWithEvaluationActionState,
      error: "Teslim raporu ve Form 1 alanlarinin tamami zorunludur.",
    };
  }

  try {
    const result = await closeJobWithEvaluation(
      parsed.data.jobId,
      {
        unitInfoScore: parsed.data.unitInfoScore,
        photosScore: parsed.data.photosScore,
        partsListScore: parsed.data.partsListScore,
        hasSubcontractor: parsed.data.hasSubcontractor,
        subcontractorScore: parsed.data.hasSubcontractor ? parsed.data.subcontractorScore : 5,
        clientNotifyScore: parsed.data.clientNotifyScore,
        notes: parsed.data.deliveryNotes,
      },
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

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${parsed.data.jobId}`);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/scoreboard");

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
      ...initialCloseJobWithEvaluationActionState,
      error:
        error instanceof Error
          ? error.message
          : "Is kapatma akisi sirasinda beklenmeyen bir hata olustu.",
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
        throw new Error("Itiraz icin kapatilmis ve puanlanmis bir is gerekli.");
      }

      if (!isWithinObjectionWindow(job.closedAt)) {
        throw new Error("Puan itirazi yalnizca ilk 30 gun icinde acilabilir.");
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
        throw new Error("Bu is icin puan itirazi olusturma yetkiniz bulunmuyor.");
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
        throw new Error("Bu is icin zaten acik bir puan itiraziniz bulunuyor.");
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
            title: "Yeni puan itirazi",
            body: `${job.boat.name} - ${job.category.name} isi icin itiraz olusturuldu.`,
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
    redirect("/settings?error=invalid-score-review");
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
        throw new Error("Duzenlenecek puanlama kaydi bulunamadi.");
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

      for (const score of job.jobScores) {
        await tx.jobScore.update({
          where: {
            id: score.id,
          },
          data: {
            baseScore,
            finalScore: Number((baseScore * job.multiplier * score.roleMultiplier).toFixed(1)),
          },
        });
      }

      const linkedKesifJobs = await tx.serviceJob.findMany({
        where: {
          kesifJobId: job.id,
        },
        include: {
          jobScores: {
            select: {
              id: true,
              roleMultiplier: true,
            },
          },
        },
      });

      const retroBaseScore = calculateKesifScore(baseScore);

      for (const kesifJob of linkedKesifJobs) {
        for (const score of kesifJob.jobScores) {
          await tx.jobScore.update({
            where: {
              id: score.id,
            },
            data: {
              baseScore: retroBaseScore,
              finalScore: Number((retroBaseScore * score.roleMultiplier).toFixed(1)),
            },
          });
        }
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
            title: "Puanlama guncellendi",
            body: `Admin, ${job.id.slice(0, 8)} numarali is icin Form 1 puanlamasini guncelledi.`,
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
    redirect(`/settings?reviewed=${parsed.data.jobId}`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "score-review-failed";
    redirect(`/settings?error=${message}`);
  }
}
