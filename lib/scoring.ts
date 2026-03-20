import type { JobRole } from "@prisma/client";

export type DeliveryReportInput = {
  unitInfoScore: number;
  photosScore: number;
  partsListScore: number;
  hasSubcontractor: boolean;
  subcontractorScore: number;
  clientNotifyScore: number;
  notes?: string;
};

export type JobCloseoutScoreSummary = {
  userId: string;
  userName: string;
  role: JobRole;
  roleMultiplier: number;
  finalScore: number;
};

export type JobCloseoutResult = {
  jobId: string;
  baseScore: number;
  multiplier: number;
  responsibleScore: number;
  scores: JobCloseoutScoreSummary[];
};

export type CloseJobWithEvaluationActionState = {
  success: boolean;
  error: string | null;
  result: JobCloseoutResult | null;
};

export const initialCloseJobWithEvaluationActionState: CloseJobWithEvaluationActionState = {
  success: false,
  error: null,
  result: null,
};

export function calculateJobScore(
  answers: number[],
  multiplier: number,
  roleMultiplier: number = 1
) {
  const average = answers.reduce((sum, value) => sum + value, 0) / answers.length;
  const baseScore = Number((average * 20).toFixed(1));
  const finalScore = Number((baseScore * multiplier * roleMultiplier).toFixed(1));

  return { baseScore, finalScore };
}

export function normalizeMonthlyScore(rawJobScore: number, theoreticalMax: number) {
  if (theoreticalMax === 0) {
    return 0;
  }

  return Number(((rawJobScore / theoreticalMax) * 100).toFixed(1));
}

export function calculateMonthlyTotal(
  normalizedJobScore: number,
  workshopScore: number | null,
  coordinatorScore: number | null
) {
  const hasMissingEval = workshopScore === null || coordinatorScore === null;
  const total = Number(
    (
      normalizedJobScore * 0.4 +
      (workshopScore ?? 0) * 0.3 +
      (coordinatorScore ?? 0) * 0.3
    ).toFixed(1)
  );

  return { total, hasMissingEval };
}

export function normalizeMonthlyEval(answers: number[]) {
  const average = answers.reduce((sum, value) => sum + value, 0) / answers.length;
  return Number((average * 20).toFixed(1));
}

export function calculateKesifScore(mainJobBaseScore: number) {
  return Number((mainJobBaseScore * 0.5).toFixed(1));
}
