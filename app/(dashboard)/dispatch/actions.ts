"use server";

import { startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { JobRole, Role } from "@prisma/client";
import { z } from "zod";

import { requireRoles } from "@/lib/auth";
import { createPlanPublishedNotifications } from "@/lib/push-notifications";
import { prisma } from "@/lib/prisma";

const reassignDispatchJobSchema = z.object({
  jobId: z.string().uuid(),
  technicianId: z.string().uuid(),
});

const publishDailyPlansSchema = z.object({
  dateIso: z.string().datetime(),
  workshopTR: z.string().trim().min(1),
  workshopEN: z.string().trim().min(1),
  fieldTR: z.string().trim().min(1),
  fieldEN: z.string().trim().min(1),
});

export async function reassignDispatchJob(input: {
  jobId: string;
  technicianId: string;
}) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);
  const parsed = reassignDispatchJobSchema.parse(input);

  const technician = await prisma.user.findFirst({
    where: {
      id: parsed.technicianId,
      role: Role.TECHNICIAN,
    },
    select: {
      id: true,
    },
  });

  if (!technician) {
    throw new Error("Hedef teknisyen bulunamadi.");
  }

  await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: {
        id: parsed.jobId,
      },
      select: {
        id: true,
        assignments: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error("Tasinaacak is bulunamadi.");
    }

    const responsibleAssignment = job.assignments.find(
      (assignment) => assignment.role === JobRole.SORUMLU
    );

    if (responsibleAssignment) {
      await tx.jobAssignment.update({
        where: {
          id: responsibleAssignment.id,
        },
        data: {
          userId: technician.id,
        },
      });
      return;
    }

    await tx.jobAssignment.create({
      data: {
        jobId: job.id,
        userId: technician.id,
        role: JobRole.SORUMLU,
      },
    });
  });

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
  revalidatePath("/my-jobs");
  revalidatePath("/my-jobs/weekly");
}

export async function publishDailyPlans(input: {
  dateIso: string;
  workshopTR: string;
  workshopEN: string;
  fieldTR: string;
  fieldEN: string;
}) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);
  const parsed = publishDailyPlansSchema.parse(input);
  const date = startOfDay(new Date(parsed.dateIso));

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
          waTemplateTR: parsed.workshopTR,
          waTemplateEN: parsed.workshopEN,
          publishedAt: new Date(),
          publishedById: actor.id,
        },
        create: {
          date,
          location: "YATMARIN",
          waTemplateTR: parsed.workshopTR,
          waTemplateEN: parsed.workshopEN,
          publishedAt: new Date(),
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
          waTemplateTR: parsed.workshopTR,
          waTemplateEN: parsed.workshopEN,
          publishedAt: new Date(),
          publishedById: actor.id,
        },
        create: {
          date,
          location: "NETSEL",
          waTemplateTR: parsed.workshopTR,
          waTemplateEN: parsed.workshopEN,
          publishedAt: new Date(),
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
          waTemplateTR: parsed.fieldTR,
          waTemplateEN: parsed.fieldEN,
          publishedAt: new Date(),
          publishedById: actor.id,
        },
        create: {
          date,
          location: "SAHA",
          waTemplateTR: parsed.fieldTR,
          waTemplateEN: parsed.fieldEN,
          publishedAt: new Date(),
          publishedById: actor.id,
        },
      }),
    ]);
  });

  const assignedTechnicians = await prisma.jobAssignment.findMany({
    where: {
      job: {
        createdAt: {
          gte: date,
          lte: new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1),
        },
      },
    },
    select: {
      userId: true,
    },
  });

  await createPlanPublishedNotifications({
    userIds: [...new Set(assignedTechnicians.map((assignment) => assignment.userId))],
    date,
    location: "Gunluk dispatch",
  });

  revalidatePath("/dispatch");
  revalidatePath("/dispatch/weekly");
  revalidatePath("/my-jobs");
}
