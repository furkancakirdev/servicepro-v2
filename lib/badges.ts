import { BadgeType, EvaluatorType, JobRole, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getMonthlyScoreboard } from "@/lib/scoreboard";
import { normalizeMonthlyScore } from "@/lib/scoring";
import type { YearlyBadgeStanding } from "@/types";

type MonthlyBadgeWinner = {
  type: BadgeType;
  userId: string;
  score: number;
};

type BadgeCalculationResult = {
  month: number;
  year: number;
  winners: Array<MonthlyBadgeWinner & { userName: string }>;
};

function getBadgeLabel(type: BadgeType) {
  switch (type) {
    case BadgeType.SERVIS_YILDIZI:
      return "Servis Yildizi";
    case BadgeType.KALITE_USTASI:
      return "Kalite Ustasi";
    case BadgeType.EKIP_OYUNCUSU:
      return "Ekip Oyuncusu";
    default:
      return "Rozet";
  }
}

export async function calculateMonthlyBadges(
  month: number,
  year: number
): Promise<BadgeCalculationResult> {
  const scoreboard = await getMonthlyScoreboard(month, year);
  const [workshopEvaluations, coordinatorEvaluations, recipientUsers, existingBadgeNotifications] =
    await Promise.all([
      prisma.monthlyEvaluation.findMany({
        where: {
          month,
          year,
          evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
        },
        select: {
          employeeId: true,
          wc_q1_technical: true,
        },
      }),
      prisma.monthlyEvaluation.findMany({
        where: {
          month,
          year,
          evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
        },
        select: {
          employeeId: true,
          tc_q4_teamwork: true,
        },
      }),
      prisma.user.findMany({
        where: {
          role: {
            in: [Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF, Role.TECHNICIAN],
          },
        },
        select: {
          id: true,
          role: true,
        },
      }),
      prisma.notification.findMany({
        where: {
          type: "BADGE_AWARDED",
        },
        select: {
          id: true,
          metadata: true,
        },
      }),
    ]);

  const workshopByEmployee = new Map(
    workshopEvaluations.map((evaluation) => [evaluation.employeeId, evaluation] as const)
  );
  const coordinatorByEmployee = new Map(
    coordinatorEvaluations.map((evaluation) => [evaluation.employeeId, evaluation] as const)
  );

  const rawTieBreak = new Map(
    scoreboard.entries.map((entry) => [entry.user.id, entry.rawJobScore] as const)
  );
  const serviceStarCandidate = scoreboard.entries[0];

  const qualityCandidates = scoreboard.entries
    .map((entry) => {
      const workshop = workshopByEmployee.get(entry.user.id);
      const formJobCount = entry.jobs.length;
      const baseAverage =
        formJobCount > 0
          ? entry.jobs.reduce((total, job) => total + job.baseScore, 0) / formJobCount
          : 0;

      if (!workshop?.wc_q1_technical || formJobCount < 3) {
        return null;
      }

      return {
        userId: entry.user.id,
        userName: entry.user.name,
        score: Number((baseAverage * 0.7 + workshop.wc_q1_technical * 20 * 0.3).toFixed(1)),
        tieBreak: rawTieBreak.get(entry.user.id) ?? 0,
      };
    })
    .filter(Boolean) as Array<{
    userId: string;
    userName: string;
    score: number;
    tieBreak: number;
  }>;

  qualityCandidates.sort(
    (left, right) => right.score - left.score || right.tieBreak - left.tieBreak
  );

  const teamSupportRawMap = new Map(
    scoreboard.entries.map((entry) => [
      entry.user.id,
      Number(
        entry.jobs
          .filter((job) => job.role === JobRole.DESTEK)
          .reduce((total, job) => total + job.finalScore, 0)
          .toFixed(1)
      ),
    ])
  );
  const teamSupportCountMap = new Map(
    scoreboard.entries.map((entry) => [
      entry.user.id,
      entry.jobs.filter((job) => job.role === JobRole.DESTEK).length,
    ])
  );
  const maxSupportRaw = Math.max(...teamSupportRawMap.values(), 1);
  const maxSupportCount = Math.max(...teamSupportCountMap.values(), 1);

  const teamCandidates = scoreboard.entries
    .map((entry) => {
      const supportCount = teamSupportCountMap.get(entry.user.id) ?? 0;
      const coordinator = coordinatorByEmployee.get(entry.user.id);

      if (!coordinator?.tc_q4_teamwork || supportCount < 2) {
        return null;
      }

      const supportRaw = teamSupportRawMap.get(entry.user.id) ?? 0;
      const supportNormalized = normalizeMonthlyScore(supportRaw, maxSupportRaw);
      const supportCountNormalized = normalizeMonthlyScore(supportCount, maxSupportCount);

      return {
        userId: entry.user.id,
        userName: entry.user.name,
        score: Number(
          (
            supportNormalized * 0.5 +
            coordinator.tc_q4_teamwork * 20 * 0.3 +
            supportCountNormalized * 0.2
          ).toFixed(1)
        ),
        tieBreak: rawTieBreak.get(entry.user.id) ?? 0,
      };
    })
    .filter(Boolean) as Array<{
    userId: string;
    userName: string;
    score: number;
    tieBreak: number;
  }>;

  teamCandidates.sort(
    (left, right) => right.score - left.score || right.tieBreak - left.tieBreak
  );

  const winners: Array<MonthlyBadgeWinner & { userName: string }> = [];

  if (serviceStarCandidate) {
    winners.push({
      type: BadgeType.SERVIS_YILDIZI,
      userId: serviceStarCandidate.user.id,
      userName: serviceStarCandidate.user.name,
      score: serviceStarCandidate.total,
    });
  }

  if (qualityCandidates[0]) {
    winners.push({
      type: BadgeType.KALITE_USTASI,
      userId: qualityCandidates[0].userId,
      userName: qualityCandidates[0].userName,
      score: qualityCandidates[0].score,
    });
  }

  if (teamCandidates[0]) {
    winners.push({
      type: BadgeType.EKIP_OYUNCUSU,
      userId: teamCandidates[0].userId,
      userName: teamCandidates[0].userName,
      score: teamCandidates[0].score,
    });
  }

  const notificationIdsToDelete = existingBadgeNotifications
    .filter((notification) => {
      const metadata = notification.metadata as
        | { month?: number; year?: number; badgeType?: string }
        | null;

      return metadata?.month === month && metadata?.year === year;
    })
    .map((notification) => notification.id);

  const recipients = recipientUsers.filter((user) => user.role === Role.TECHNICIAN);

  await prisma.$transaction(async (tx) => {
    await tx.badge.deleteMany({
      where: {
        month,
        year,
      },
    });

    if (notificationIdsToDelete.length > 0) {
      await tx.notification.deleteMany({
        where: {
          id: {
            in: notificationIdsToDelete,
          },
        },
      });
    }

    for (const winner of winners) {
      await tx.badge.create({
        data: {
          userId: winner.userId,
          type: winner.type,
          month,
          year,
          score: winner.score,
        },
      });

      if (recipients.some((user) => user.id === winner.userId)) {
        await tx.notification.create({
          data: {
            userId: winner.userId,
            type: "BADGE_AWARDED",
            title: "Yeni rozet kazandiniz",
            body: `Tebrikler! Bu ay ${getBadgeLabel(winner.type)} rozeti kazandin.`,
            metadata: {
              month,
              year,
              badgeType: winner.type,
            },
          },
        });
      }
    }
  });

  return {
    month,
    year,
    winners,
  };
}

export async function calculateYearlyBadgeStandings(
  year: number
): Promise<YearlyBadgeStanding[]> {
  const badges = await prisma.badge.findMany({
    where: { year },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [{ month: "asc" }, { createdAt: "asc" }],
  });

  const byUser = new Map<
    string,
    {
      user: { id: string; name: string; avatarUrl: string | null };
      badgeCount: number;
      badgeTypes: BadgeType[];
    }
  >();

  for (const badge of badges) {
    const current = byUser.get(badge.userId) ?? {
      user: badge.user,
      badgeCount: 0,
      badgeTypes: [],
    };

    current.badgeCount += 1;
    current.badgeTypes.push(badge.type);
    byUser.set(badge.userId, current);
  }

  return Array.from(byUser.values())
    .map((entry) => ({
      rank: 0,
      user: entry.user,
      badgeCount: entry.badgeCount,
      yearScore: entry.badgeCount * 3,
      badgeTypes: entry.badgeTypes,
    }))
    .sort(
      (left, right) =>
        right.yearScore - left.yearScore ||
        right.badgeCount - left.badgeCount ||
        left.user.name.localeCompare(right.user.name, "tr")
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}
