"use server";

import { parseISO, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { JobRole, Role } from "@prisma/client";
import { z } from "zod";

import { requireRoles } from "@/lib/auth";
import { toEstimatedDateSeconds } from "@/lib/jobs";
import { createPlanPublishedNotifications } from "@/lib/push-notifications";
import { prisma } from "@/lib/prisma";

import { DISPATCH_REGIONS, type DispatchRegionId, syncLocationWithRegion } from "@/lib/dispatch";

const assignJobToDateSchema = z.object({
  jobId: z.string().uuid(),
  dateValue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  regionId: z.enum(DISPATCH_REGIONS.map((region) => region.id) as [DispatchRegionId, ...DispatchRegionId[]]),
});

const updateDispatchJobDetailsSchema = z.object({
  jobId: z.string().uuid(),
  dateValue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  regionId: z.enum(DISPATCH_REGIONS.map((region) => region.id) as [DispatchRegionId, ...DispatchRegionId[]]),
  responsibleId: z.string().uuid().nullable(),
  supportIds: z.array(z.string().uuid()).max(8),
  location: z.string().trim().max(200).nullable().optional(),
});

const publishDailyPlansSchema = z.object({
  dateIso: z.string().datetime(),
  dailyTR: z.string().trim().min(1),
  dailyEN: z.string().trim().min(1),
});

function copyDateWithTime(source: Date | null, targetDay: Date) {
  if (!source) {
    return null;
  }

  const copied = new Date(targetDay.getTime());
  copied.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds()
  );
  return copied;
}

function getDispatchDayEnd(date: Date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function getUniqueUserIds(values: string[]) {
  return [...new Set(values)];
}

async function validateTechnicianIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const technicians = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
      role: Role.TECHNICIAN,
    },
    select: {
      id: true,
    },
  });

  if (technicians.length !== userIds.length) {
    throw new Error("Secilen teknisyenlerden en az biri bulunamadi.");
  }

  return technicians.map((technician) => technician.id);
}

async function applyDispatchJobUpdate(input: z.infer<typeof updateDispatchJobDetailsSchema>) {
  const targetDay = startOfDay(parseISO(input.dateValue));
  const nextSupportIds = getUniqueUserIds(
    input.supportIds.filter((userId) => userId !== input.responsibleId)
  );

  await validateTechnicianIds(
    getUniqueUserIds([
      ...(input.responsibleId ? [input.responsibleId] : []),
      ...nextSupportIds,
    ])
  );

  await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: {
        id: input.jobId,
      },
      select: {
        id: true,
        location: true,
        dispatchDate: true,
        plannedStartDate: true,
        plannedStartAt: true,
        plannedEndAt: true,
        estimatedDate: true,
        assignments: {
          select: {
            id: true,
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error("Guncellenecek is bulunamadi.");
    }

    const estimatedDateSource =
      typeof job.estimatedDate === "number" ? new Date(job.estimatedDate * 1000) : null;
    const nextLocation = syncLocationWithRegion(input.location ?? job.location, input.regionId);

    await tx.serviceJob.update({
      where: {
        id: job.id,
      },
      data: {
        location: nextLocation,
        dispatchDate: targetDay,
        plannedStartDate: copyDateWithTime(job.plannedStartDate, targetDay),
        plannedStartAt: copyDateWithTime(job.plannedStartAt, targetDay),
        plannedEndAt: copyDateWithTime(job.plannedEndAt, targetDay),
        estimatedDate: estimatedDateSource
          ? toEstimatedDateSeconds(copyDateWithTime(estimatedDateSource, targetDay) ?? estimatedDateSource)
          : null,
      },
    });

    const responsibleAssignment = job.assignments.find(
      (assignment) => assignment.role === JobRole.SORUMLU
    );

    if (input.responsibleId) {
      if (responsibleAssignment) {
        await tx.jobAssignment.update({
          where: {
            id: responsibleAssignment.id,
          },
          data: {
            userId: input.responsibleId,
          },
        });
      } else {
        await tx.jobAssignment.create({
          data: {
            jobId: job.id,
            userId: input.responsibleId,
            role: JobRole.SORUMLU,
          },
        });
      }
    } else if (responsibleAssignment) {
      await tx.jobAssignment.delete({
        where: {
          id: responsibleAssignment.id,
        },
      });
    }

    const supportAssignments = job.assignments.filter(
      (assignment) => assignment.role === JobRole.DESTEK
    );
    const supportIdsToDelete = supportAssignments
      .filter((assignment) => !nextSupportIds.includes(assignment.userId))
      .map((assignment) => assignment.id);
    const supportIdsToCreate = nextSupportIds.filter(
      (userId) => !supportAssignments.some((assignment) => assignment.userId === userId)
    );

    if (supportIdsToDelete.length > 0) {
      await tx.jobAssignment.deleteMany({
        where: {
          id: {
            in: supportIdsToDelete,
          },
        },
      });
    }

    if (supportIdsToCreate.length > 0) {
      await tx.jobAssignment.createMany({
        data: supportIdsToCreate.map((userId) => ({
          jobId: job.id,
          userId,
          role: JobRole.DESTEK,
        })),
      });
    }
  });

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
  revalidatePath("/my-jobs");
  revalidatePath("/my-jobs/weekly");
}

export async function assignJobToDate(input: z.infer<typeof assignJobToDateSchema>) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);
  const parsed = assignJobToDateSchema.parse(input);

  const job = await prisma.serviceJob.findUnique({
    where: {
      id: parsed.jobId,
    },
    select: {
      assignments: {
        select: {
          userId: true,
          role: true,
        },
      },
      location: true,
    },
  });

  if (!job) {
    throw new Error("Planlanacak is bulunamadi.");
  }

  await applyDispatchJobUpdate({
    jobId: parsed.jobId,
    dateValue: parsed.dateValue,
    regionId: parsed.regionId,
    responsibleId:
      job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU)?.userId ?? null,
    supportIds: job.assignments
      .filter((assignment) => assignment.role === JobRole.DESTEK)
      .map((assignment) => assignment.userId),
    location: job.location,
  });
}

export async function updateDispatchJobDetails(
  input: z.infer<typeof updateDispatchJobDetailsSchema>
) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);
  const parsed = updateDispatchJobDetailsSchema.parse(input);

  await applyDispatchJobUpdate(parsed);
}

export async function publishDailyPlans(input: z.infer<typeof publishDailyPlansSchema>) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);
  const parsed = publishDailyPlansSchema.parse(input);
  const date = startOfDay(new Date(parsed.dateIso));
  const dayEnd = getDispatchDayEnd(date);
  const publishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.dailyPlan.upsert({
        where: {
          date_location: {
            date,
            location: "YATMARIN",
          },
        },
        update: {
          waTemplateTR: parsed.dailyTR,
          waTemplateEN: parsed.dailyEN,
          publishedAt,
          publishedById: actor.id,
        },
        create: {
          date,
          location: "YATMARIN",
          waTemplateTR: parsed.dailyTR,
          waTemplateEN: parsed.dailyEN,
          publishedAt,
          publishedById: actor.id,
        },
      }),
      tx.dailyPlan.upsert({
        where: {
          date_location: {
            date,
            location: "NETSEL",
          },
        },
        update: {
          waTemplateTR: parsed.dailyTR,
          waTemplateEN: parsed.dailyEN,
          publishedAt,
          publishedById: actor.id,
        },
        create: {
          date,
          location: "NETSEL",
          waTemplateTR: parsed.dailyTR,
          waTemplateEN: parsed.dailyEN,
          publishedAt,
          publishedById: actor.id,
        },
      }),
      tx.dailyPlan.upsert({
        where: {
          date_location: {
            date,
            location: "SAHA",
          },
        },
        update: {
          waTemplateTR: parsed.dailyTR,
          waTemplateEN: parsed.dailyEN,
          publishedAt,
          publishedById: actor.id,
        },
        create: {
          date,
          location: "SAHA",
          waTemplateTR: parsed.dailyTR,
          waTemplateEN: parsed.dailyEN,
          publishedAt,
          publishedById: actor.id,
        },
      }),
    ]);
  });

  const assignedTechnicians = await prisma.jobAssignment.findMany({
    where: {
      role: {
        in: [JobRole.SORUMLU, JobRole.DESTEK],
      },
      job: {
        OR: [
          {
            dispatchDate: {
              gte: date,
              lte: dayEnd,
            },
          },
          {
            dispatchDate: null,
            plannedStartDate: {
              gte: date,
              lte: dayEnd,
            },
          },
          {
            dispatchDate: null,
            plannedStartDate: null,
            plannedStartAt: {
              gte: date,
              lte: dayEnd,
            },
          },
        ],
      },
    },
    select: {
      userId: true,
    },
  });

  await createPlanPublishedNotifications({
    userIds: getUniqueUserIds(assignedTechnicians.map((assignment) => assignment.userId)),
    date,
    location: "Gunluk dispatch",
  });

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
  revalidatePath("/my-jobs");
}
