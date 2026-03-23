import { BadgeType, EvaluatorType, JobRole, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { YearlyBadgeStanding } from "@/types";

type MonthlyBadgeResult = {
  type: BadgeType;
  winner: string;
  score: number;
};

type BadgeScoreRow = {
  userId: string;
  name: string;
  jobCount: number;
  supportCount: number;
  monthlyTotal: number;
  qualityScore: number;
  teamScore: number;
};

function roundScore(value: number) {
  return Number(value.toFixed(1));
}

function assertBadgeMonth(month: unknown): asserts month is number {
  if (typeof month !== "number" || !Number.isInteger(month)) {
    throw new TypeError("month must be an integer.");
  }

  if (month < 1 || month > 12) {
    throw new RangeError("month must be between 1 and 12.");
  }
}

function assertBadgeYear(year: unknown): asserts year is number {
  if (typeof year !== "number" || !Number.isInteger(year)) {
    throw new TypeError("year must be an integer.");
  }

  if (year < 2000) {
    throw new RangeError("year must be 2000 or greater.");
  }
}

async function createBadgeNotifications(
  month: number,
  year: number,
  winners: Array<{ userId: string; type: BadgeType; winner: string; score: number }>
) {
  const badgeTypeLabels: Record<BadgeType, string> = {
    SERVIS_YILDIZI: "Servis Yıldızı",
    KALITE_USTASI: "Kalite Ustası",
    EKIP_OYUNCUSU: "Ekip Oyuncusu",
  };

  const existingNotifications = await prisma.notification.findMany({
    where: { type: "BADGE_AWARDED" },
    select: { id: true, metadata: true },
  });

  const staleNotificationIds = existingNotifications
    .filter((notification) => {
      const metadata = notification.metadata as { month?: number; year?: number } | null;
      return metadata?.month === month && metadata?.year === year;
    })
    .map((notification) => notification.id);

  await prisma.$transaction(async (tx) => {
    if (staleNotificationIds.length > 0) {
      await tx.notification.deleteMany({
        where: { id: { in: staleNotificationIds } },
      });
    }

    if (winners.length === 0) {
      return;
    }

    await tx.notification.createMany({
      data: winners.map((winner) => ({
        userId: winner.userId,
        type: "BADGE_AWARDED",
        title: "Yeni rozet kazandınız",
        body: `Tebrikler! Bu ay ${badgeTypeLabels[winner.type]} rozetini kazandınız.`,
        metadata: {
          month,
          year,
          badgeType: winner.type,
          score: winner.score,
        },
      })),
    });
  });
}

export async function calculateMonthlyBadges(
  month: number,
  year: number
): Promise<MonthlyBadgeResult[]> {
  assertBadgeMonth(month);
  assertBadgeYear(year);

  const employees = await prisma.user.findMany({
    where: { role: { in: [Role.TECHNICIAN, Role.COORDINATOR] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const scores = await Promise.all(
    employees.map(async (employee): Promise<BadgeScoreRow> => {
      const [jobScores, evaluations, workshopEval, coordinatorEval] = await Promise.all([
        prisma.jobScore.findMany({
          where: {
            userId: employee.id,
            month,
            year,
            isKesif: false,
          },
        }),
        prisma.jobEvaluation.findMany({
          where: {
            job: {
              assignments: { some: { userId: employee.id } },
              closedAt: { gte: startDate, lte: endDate },
            },
          },
        }),
        prisma.monthlyEvaluation.findFirst({
          where: {
            employeeId: employee.id,
            evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
            month,
            year,
          },
        }),
        prisma.monthlyEvaluation.findFirst({
          where: {
            employeeId: employee.id,
            evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
            month,
            year,
          },
        }),
      ]);

      const totalJobScore = jobScores.reduce((sum, score) => sum + score.finalScore, 0);
      const jobCount = jobScores.length;

      const supportScores = jobScores.filter((score) => score.role === JobRole.DESTEK);
      const supportCount = supportScores.length;
      const supportTotal = supportScores.reduce((sum, score) => sum + score.finalScore, 0);

      const avgForm1 =
        evaluations.length > 0
          ? evaluations.reduce((sum, evaluation) => sum + evaluation.baseScore, 0) /
            evaluations.length
          : 0;

      const workshopScore = workshopEval?.normalizedScore ?? null;
      const coordinatorScore = coordinatorEval?.normalizedScore ?? null;

      const theoreticalMax = jobCount * 100 * 3.0;
      const normalizedJob =
        theoreticalMax > 0 ? roundScore((totalJobScore / theoreticalMax) * 100) : 0;

      const monthlyTotal = roundScore(
        normalizedJob * 0.4 + (workshopScore ?? 0) * 0.3 + (coordinatorScore ?? 0) * 0.3
      );

      const workshopQ1 = workshopEval?.wc_q1_technical ?? 0;
      const qualityScore = roundScore(avgForm1 * 0.7 + workshopQ1 * 20 * 0.3);

      const normalizedSupportCount = Math.min(supportCount / 10, 1) * 100;
      const normalizedSupportScore =
        theoreticalMax > 0 ? (supportTotal / theoreticalMax) * 100 : 0;
      const coordinatorQ4 = coordinatorEval?.tc_q4_teamwork ?? 0;
      const teamScore = roundScore(
        normalizedSupportScore * 0.5 +
          coordinatorQ4 * 20 * 0.3 +
          normalizedSupportCount * 0.2
      );

      return {
        userId: employee.id,
        name: employee.name,
        jobCount,
        supportCount,
        monthlyTotal,
        qualityScore,
        teamScore,
      };
    })
  );

  const monthlyWinner = [...scores].sort((left, right) => right.monthlyTotal - left.monthlyTotal)[0];
  const qualityWinner = [...scores]
    .filter((entry) => entry.jobCount >= 3)
    .sort((left, right) => right.qualityScore - left.qualityScore)[0];
  const teamWinner = [...scores]
    .filter((entry) => entry.supportCount >= 2)
    .sort((left, right) => right.teamScore - left.teamScore)[0];

  const winners = [
    monthlyWinner
      ? {
          userId: monthlyWinner.userId,
          type: BadgeType.SERVIS_YILDIZI,
          winner: monthlyWinner.name,
          score: monthlyWinner.monthlyTotal,
        }
      : null,
    qualityWinner
      ? {
          userId: qualityWinner.userId,
          type: BadgeType.KALITE_USTASI,
          winner: qualityWinner.name,
          score: qualityWinner.qualityScore,
        }
      : null,
    teamWinner
      ? {
          userId: teamWinner.userId,
          type: BadgeType.EKIP_OYUNCUSU,
          winner: teamWinner.name,
          score: teamWinner.teamScore,
        }
      : null,
  ].filter(Boolean) as Array<{
    userId: string;
    type: BadgeType;
    winner: string;
    score: number;
  }>;

  await prisma.$transaction(async (tx) => {
    await tx.badge.deleteMany({ where: { month, year } });

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
    }
  });

  await createBadgeNotifications(month, year, winners);

  return winners.map(({ type, winner, score }) => ({ type, winner, score }));
}

export async function calculateYearEndRanking(year: number) {
  assertBadgeYear(year);

  const badges = await prisma.badge.findMany({ where: { year } });
  const counts: Record<string, number> = {};

  for (const badge of badges) {
    counts[badge.userId] = (counts[badge.userId] ?? 0) + 3;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Object.keys(counts) } },
    select: { id: true, name: true, avatarUrl: true },
  });

  return users
    .map((user) => ({ user, yearScore: counts[user.id] ?? 0 }))
    .sort((left, right) => right.yearScore - left.yearScore)
    .slice(0, 3);
}

export async function calculateYearlyBadgeStandings(
  year: number
): Promise<YearlyBadgeStanding[]> {
  assertBadgeYear(year);

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
