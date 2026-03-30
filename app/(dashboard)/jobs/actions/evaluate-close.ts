"use server";

import { redirect } from "next/navigation";
import { JobRole, JobStatus, Prisma, Role } from "@prisma/client";

import {
  buildJobScoreWriteRows,
  calculateJobScore,
  calculateKesifScore,
  type DeliveryReportInput,
  initialEvaluateAndCloseJobActionState,
  type EvaluateAndCloseJobActionState,
} from "@/lib/scoring";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  allowedTransitions,
  closeAsWarrantySchema,
  CLOSEOUT_LATENCY_TARGET_P95_MS,
  evaluateAndCloseSchema,
  hasAnsweredScore,
  revalidateAfterCloseout,
  revalidateAfterWarrantyClose,
} from "./shared";

type EvaluateAndCloseJobOptions = {
  closedById: string;
  closedAt?: Date;
};

type CloseJobWithEvaluationOptions = EvaluateAndCloseJobOptions;

function getLinkedKesifJobsWhere(job: {
  id: string;
  boatId: string;
  categoryId: string;
  createdAt: Date;
}): Prisma.ServiceJobWhereInput {
  return {
    id: { not: job.id },
    isKesif: true,
    OR: [
      { kesifJobId: job.id },
      {
        boatId: job.boatId,
        categoryId: job.categoryId,
        kesifJobId: null,
        createdAt: {
          gte: new Date(job.createdAt.getTime() - 90 * 24 * 60 * 60 * 1000),
          lte: job.createdAt,
        },
      },
    ],
  };
}

async function applyKesifScoreBackfill(
  tx: Prisma.TransactionClient,
  job: {
    id: string;
    boatId: string;
    categoryId: string;
    createdAt: Date;
  },
  baseScore: number
) {
  const linkedKesifJobs = await tx.serviceJob.findMany({
    where: getLinkedKesifJobsWhere(job),
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

    if (!allowedTransitions[job.status].includes(JobStatus.KAPANDI)) {
      throw new Error("Bu is kapatma akisina uygun durumda degil.");
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

    await applyKesifScoreBackfill(tx, job, baseScore);

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
    throw new Error("Puanlamayi baslatan kullanici dogrulanamadi.");
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
      throw new Error("Is kapatma akisi sadece tamamlanan islerde baslatilabilir.");
    }

    if (!allowedTransitions[job.status].includes(JobStatus.KAPANDI)) {
      throw new Error("Bu is kapatma akisina uygun durumda degil.");
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

    await applyKesifScoreBackfill(tx, job, baseScore);

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

    let error = "Teslim raporu ve Form 1 degerlendirmesi zorunludur.";

    if (deliveryAnsweredCount < 5 && evaluationAnsweredCount >= 5) {
      error = `Lutfen once teslim raporunu doldurun (${deliveryAnsweredCount}/5 alan tamamlandi).`;
    } else if (deliveryAnsweredCount >= 5 && evaluationAnsweredCount < 5) {
      error = `Lutfen Form 1 degerlendirmesini doldurun (${evaluationAnsweredCount}/5 soru yanitlandi).`;
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

    revalidateAfterCloseout(parsed.data.jobId);

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
          : "Is kapatma akisi sirasinda beklenmeyen bir hata olustu.",
    };
  }
}

export async function closeAsWarranty(jobId: string, warrantyNote: string, closedById: string) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  if (actor.id !== closedById) {
    throw new Error("Garanti kapatisini baslatan kullanici dogrulanamadi.");
  }

  const job = await prisma.serviceJob.findUnique({
    where: { id: jobId },
    include: {
      deliveryReport: true,
      evaluation: true,
      jobScores: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!job) {
    throw new Error("Is kaydi bulunamadi.");
  }

  if (!allowedTransitions[job.status].includes(JobStatus.GARANTI)) {
    throw new Error("Bu is garanti kapsaminda kapatilamaz.");
  }

  if (!job.deliveryReport) {
    throw new Error("Garantiye almak icin once saha raporu gonderilmelidir.");
  }

  if (job.evaluation || job.jobScores.length > 0) {
    throw new Error("Puanlanan bir is garanti kapsaminda kapatilamaz.");
  }

  return prisma.serviceJob.update({
    where: { id: job.id },
    data: {
      status: JobStatus.GARANTI,
      warrantyNote,
      closedAt: new Date(),
      closedById: actor.id,
    },
  });
}

export async function closeAsWarrantyAction(formData: FormData) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const parsed = closeAsWarrantySchema.safeParse({
    jobId: formData.get("jobId"),
    warrantyNote: formData.get("warrantyNote"),
  });

  const jobId = String(formData.get("jobId") ?? "");

  if (!parsed.success) {
    redirect(`/jobs/${jobId}?error=warranty-note-required`);
  }

  try {
    await closeAsWarranty(parsed.data.jobId, parsed.data.warrantyNote, actor.id);
    revalidateAfterWarrantyClose(parsed.data.jobId);
    redirect(`/jobs/${parsed.data.jobId}?warranty=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "close-as-warranty";
    redirect(`/jobs/${parsed.data.jobId}?error=${message}`);
  }
}
