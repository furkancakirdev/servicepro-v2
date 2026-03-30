"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobRole, Role } from "@prisma/client";

import { calculateJobScore, calculateKesifScore } from "@/lib/scoring";
import { requireAppUser, requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  isWithinObjectionWindow,
  reviewScoreObjectionSchema,
  scoreObjectionSchema,
} from "./shared";

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
        throw new Error("Ä°tiraz iÃ§in kapatÄ±lmÄ±ÅŸ ve puanlanmÄ±ÅŸ bir iÅŸ gerekli.");
      }

      if (!isWithinObjectionWindow(job.closedAt)) {
        throw new Error("Puan itirazÄ± yalnÄ±zca ilk 30 gÃ¼n iÃ§inde aÃ§Ä±labilir.");
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
        throw new Error("Bu iÅŸ iÃ§in puan itirazÄ± oluÅŸturma yetkiniz bulunmuyor.");
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
        throw new Error("Bu iÅŸ iÃ§in zaten aÃ§Ä±k bir puan itirazÄ±nÄ±z bulunuyor.");
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
            title: "Yeni puan itirazÄ±",
            body: `${job.boat.name} - ${job.category.name} iÅŸi iÃ§in itiraz oluÅŸturuldu.`,
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
        throw new Error("DÃ¼zenlenecek puanlama kaydÄ± bulunamadÄ±.");
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
            title: "Puanlama gÃ¼ncellendi",
            body: `Admin, ${job.id.slice(0, 8)} numaralÄ± iÅŸ iÃ§in Form 1 puanlamasÄ±nÄ± gÃ¼ncelledi.`,
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
