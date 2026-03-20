import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ScoreObjectionQueueItem } from "@/types";

function getEvaluationAnswers(
  evaluation:
    | {
        q1_unit: number;
        q2_photos: number;
        q3_parts: number;
        q4_sub: number;
        q5_notify: number;
      }
    | null
    | undefined
): [number, number, number, number, number] {
  if (!evaluation) {
    return [1, 1, 1, 1, 1];
  }

  return [
    evaluation.q1_unit,
    evaluation.q2_photos,
    evaluation.q3_parts,
    evaluation.q4_sub,
    evaluation.q5_notify,
  ];
}

export async function getScoreObjectionQueue(
  limit = 6
): Promise<ScoreObjectionQueueItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const [objectionLogs, updateLogs] = await Promise.all([
    prisma.evaluationChangeLog.findMany({
      where: {
        entityType: "JOB_SCORE_OBJECTION",
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit * 3,
    }),
    prisma.evaluationChangeLog.findMany({
      where: {
        entityType: "JOB_EVALUATION_UPDATE",
      },
      select: {
        entityId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const latestUpdateByJob = new Map<string, Date>();

  for (const updateLog of updateLogs) {
    if (!latestUpdateByJob.has(updateLog.entityId)) {
      latestUpdateByJob.set(updateLog.entityId, updateLog.createdAt);
    }
  }

  const pendingLogs = objectionLogs.filter((log) => {
    const reviewedAt = latestUpdateByJob.get(log.entityId);
    return !reviewedAt || reviewedAt < log.createdAt;
  });
  const jobIds = [...new Set(pendingLogs.map((log) => log.entityId))];

  if (jobIds.length === 0) {
    return [];
  }

  const jobs = await prisma.serviceJob.findMany({
    where: {
      id: {
        in: jobIds,
      },
    },
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
      evaluation: {
        select: {
          baseScore: true,
          q1_unit: true,
          q2_photos: true,
          q3_parts: true,
          q4_sub: true,
          q5_notify: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
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
  });

  const jobsById = new Map(jobs.map((job) => [job.id, job] as const));

  return pendingLogs
    .map((log) => {
      const job = jobsById.get(log.entityId);

      if (!job?.evaluation) {
        return null;
      }

      return {
        logId: log.id,
        jobId: job.id,
        boatName: job.boat.name,
        categoryName: job.category.name,
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
        reviewedAt: latestUpdateByJob.get(job.id)?.toISOString() ?? null,
        submittedBy: log.changedBy,
        currentBaseScore: job.evaluation.baseScore,
        answers: getEvaluationAnswers(job.evaluation),
        assignedNames: job.assignments.map((assignment) => assignment.user.name),
      } satisfies ScoreObjectionQueueItem;
    })
    .filter(Boolean)
    .slice(0, limit) as ScoreObjectionQueueItem[];
}
