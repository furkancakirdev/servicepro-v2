import { BadgeType, EvaluatorType, Role } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { calculateMonthlyTotal, normalizeMonthlyEval, normalizeMonthlyScore } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import type {
  MonthlyEvaluationFormEntry,
  MonthlyScoreboardData,
  ScoreboardBadgeSummary,
  ScoreboardJobBreakdown,
  TechnicianScoreboardEntry,
} from "@/types";

export type ScoreboardMonthOption = {
  month: number;
  year: number;
  value: string;
  label: string;
};

function createMonthLabel(month: number, year: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: tr });
}

export function resolveScoreboardPeriod(input?: {
  month?: string | number | null;
  year?: string | number | null;
}) {
  const today = new Date();
  const parsedMonth = Number(input?.month);
  const parsedYear = Number(input?.year);
  const month =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : today.getMonth() + 1;
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 2024 && parsedYear <= 2100
      ? parsedYear
      : today.getFullYear();

  return {
    month,
    year,
    label: createMonthLabel(month, year),
  };
}

export function getScoreboardMonthOptions(count = 12, baseDate = new Date()) {
  const options: ScoreboardMonthOption[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const optionDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
    const month = optionDate.getMonth() + 1;
    const year = optionDate.getFullYear();

    options.push({
      month,
      year,
      value: `${year}-${String(month).padStart(2, "0")}`,
      label: createMonthLabel(month, year),
    });
  }

  return options;
}

function getWorkshopSummary(
  evaluation:
    | {
        normalizedScore: number | null;
        wc_q1_technical: number | null;
        wc_q2_discipline: number | null;
        wc_q3_growth: number | null;
        wc_notes: string | null;
      }
    | undefined
) {
  if (
    !evaluation ||
    evaluation.wc_q1_technical === null ||
    evaluation.wc_q2_discipline === null ||
    evaluation.wc_q3_growth === null
  ) {
    return null;
  }

  return {
    normalizedScore:
      evaluation.normalizedScore ??
      normalizeMonthlyEval([
        evaluation.wc_q1_technical,
        evaluation.wc_q2_discipline,
        evaluation.wc_q3_growth,
      ]),
    notes: evaluation.wc_notes,
    questions: [
      evaluation.wc_q1_technical,
      evaluation.wc_q2_discipline,
      evaluation.wc_q3_growth,
    ],
  };
}

function getCoordinatorSummary(
  evaluation:
    | {
        normalizedScore: number | null;
        tc_q1_compliance: number | null;
        tc_q2_safety: number | null;
        tc_q3_represent: number | null;
        tc_q4_teamwork: number | null;
        tc_q5_growth: number | null;
      }
    | undefined
) {
  if (
    !evaluation ||
    evaluation.tc_q1_compliance === null ||
    evaluation.tc_q2_safety === null ||
    evaluation.tc_q3_represent === null ||
    evaluation.tc_q4_teamwork === null ||
    evaluation.tc_q5_growth === null
  ) {
    return null;
  }

  return {
    normalizedScore:
      evaluation.normalizedScore ??
      normalizeMonthlyEval([
        evaluation.tc_q1_compliance,
        evaluation.tc_q2_safety,
        evaluation.tc_q3_represent,
        evaluation.tc_q4_teamwork,
        evaluation.tc_q5_growth,
      ]),
    notes: null,
    questions: [
      evaluation.tc_q1_compliance,
      evaluation.tc_q2_safety,
      evaluation.tc_q3_represent,
      evaluation.tc_q4_teamwork,
      evaluation.tc_q5_growth,
    ],
  };
}

function groupBadgeSummary(
  badges: Array<{
    type: BadgeType;
    score: number;
    user: { id: string; name: string; avatarUrl: string | null };
  }>
): ScoreboardBadgeSummary[] {
  const badgeOrder: BadgeType[] = [
    BadgeType.SERVIS_YILDIZI,
    BadgeType.KALITE_USTASI,
    BadgeType.EKIP_OYUNCUSU,
  ];

  return badgeOrder.map((type) => ({
    type,
    winners: badges
      .filter((badge) => badge.type === type)
      .map((badge) => ({
        id: badge.user.id,
        name: badge.user.name,
        avatarUrl: badge.user.avatarUrl,
        score: badge.score,
      })),
  }));
}

export async function getMonthlyScoreboard(
  month: number,
  year: number
): Promise<MonthlyScoreboardData> {
  const [technicians, rawJobScores, evaluations, badges] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.TECHNICIAN },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
      },
    }),
    prisma.jobScore.findMany({
      where: {
        month,
        year,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
        job: {
          select: {
            id: true,
            closedAt: true,
            createdAt: true,
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
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { finalScore: "desc" }],
    }),
    prisma.monthlyEvaluation.findMany({
      where: {
        month,
        year,
        evaluatorType: {
          in: [EvaluatorType.WORKSHOP_CHIEF, EvaluatorType.TECHNICAL_COORDINATOR],
        },
      },
      select: {
        employeeId: true,
        evaluatorType: true,
        normalizedScore: true,
        wc_q1_technical: true,
        wc_q2_discipline: true,
        wc_q3_growth: true,
        wc_notes: true,
        tc_q1_compliance: true,
        tc_q2_safety: true,
        tc_q3_represent: true,
        tc_q4_teamwork: true,
        tc_q5_growth: true,
      },
    }),
    prisma.badge.findMany({
      where: {
        month,
        year,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { score: "desc" }],
    }),
  ]);

  const jobScoresByUser = new Map<string, typeof rawJobScores>();

  for (const score of rawJobScores) {
    const existing = jobScoresByUser.get(score.userId) ?? [];
    existing.push(score);
    jobScoresByUser.set(score.userId, existing);
  }

  const workshopByEmployee = new Map(
    evaluations
      .filter((evaluation) => evaluation.evaluatorType === EvaluatorType.WORKSHOP_CHIEF)
      .map((evaluation) => [evaluation.employeeId, evaluation] as const)
  );
  const coordinatorByEmployee = new Map(
    evaluations
      .filter((evaluation) => evaluation.evaluatorType === EvaluatorType.TECHNICAL_COORDINATOR)
      .map((evaluation) => [evaluation.employeeId, evaluation] as const)
  );
  const badgesByUser = new Map<string, typeof badges>();

  for (const badge of badges) {
    const existing = badgesByUser.get(badge.userId) ?? [];
    existing.push(badge);
    badgesByUser.set(badge.userId, existing);
  }

  const rawTotals = technicians.map((technician) => {
    const sum = (jobScoresByUser.get(technician.id) ?? []).reduce(
      (total, score) => total + score.finalScore,
      0
    );

    return {
      userId: technician.id,
      rawJobScore: Number(sum.toFixed(1)),
    };
  });

  const theoreticalMax = Math.max(...rawTotals.map((entry) => entry.rawJobScore), 1);

  const entries: TechnicianScoreboardEntry[] = technicians.map((technician) => {
    const technicianJobScores = jobScoresByUser.get(technician.id) ?? [];
    const rawJobScore =
      rawTotals.find((entry) => entry.userId === technician.id)?.rawJobScore ?? 0;
    const normalizedJobScore = normalizeMonthlyScore(rawJobScore, theoreticalMax);
    const workshopEvaluation = getWorkshopSummary(workshopByEmployee.get(technician.id));
    const coordinatorEvaluation = getCoordinatorSummary(
      coordinatorByEmployee.get(technician.id)
    );
    const totalSummary = calculateMonthlyTotal(
      normalizedJobScore,
      workshopEvaluation?.normalizedScore ?? null,
      coordinatorEvaluation?.normalizedScore ?? null
    );
    const jobs: ScoreboardJobBreakdown[] = technicianJobScores.map((score) => ({
      id: score.id,
      boatName: score.job.boat.name,
      categoryName: score.job.category.name,
      date: (score.job.closedAt ?? score.job.createdAt).toISOString(),
      role: score.role,
      baseScore: score.baseScore,
      multiplier: score.multiplier,
      roleMultiplier: score.roleMultiplier,
      finalScore: score.finalScore,
      isKesif: score.isKesif,
    }));

    return {
      rank: 0,
      user: technician,
      rawJobScore,
      jobScore: normalizedJobScore,
      workshopScore: workshopEvaluation?.normalizedScore ?? null,
      coordinatorScore: coordinatorEvaluation?.normalizedScore ?? null,
      total: totalSummary.total,
      hasMissingEval: totalSummary.hasMissingEval,
      badges: (badgesByUser.get(technician.id) ?? []).map((badge) => ({
        id: badge.id,
        type: badge.type,
        score: badge.score,
      })),
      jobs,
      workshopEvaluation,
      coordinatorEvaluation,
    };
  });

  entries.sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    if (right.rawJobScore !== left.rawJobScore) {
      return right.rawJobScore - left.rawJobScore;
    }

    return left.user.name.localeCompare(right.user.name, "tr");
  });

  const rankedEntries = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  const evaluationRoster: MonthlyEvaluationFormEntry[] = rankedEntries.map((entry) => ({
    user: {
      id: entry.user.id,
      name: entry.user.name,
      avatarUrl: entry.user.avatarUrl,
    },
    workshopEvaluation: entry.workshopEvaluation
      ? {
          q1: entry.workshopEvaluation.questions[0] ?? null,
          q2: entry.workshopEvaluation.questions[1] ?? null,
          q3: entry.workshopEvaluation.questions[2] ?? null,
          notes: entry.workshopEvaluation.notes ?? "",
        }
      : null,
    coordinatorEvaluation: entry.coordinatorEvaluation
      ? {
          q1: entry.coordinatorEvaluation.questions[0] ?? null,
          q2: entry.coordinatorEvaluation.questions[1] ?? null,
          q3: entry.coordinatorEvaluation.questions[2] ?? null,
          q4: entry.coordinatorEvaluation.questions[3] ?? null,
          q5: entry.coordinatorEvaluation.questions[4] ?? null,
        }
      : null,
  }));

  return {
    month,
    year,
    monthLabel: createMonthLabel(month, year),
    theoreticalMax,
    entries: rankedEntries,
    badgeSummary: groupBadgeSummary(badges),
    evaluationRoster,
  };
}
