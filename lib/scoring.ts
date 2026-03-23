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

function assertFiniteNumber(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }
}

function assertPositiveNumber(value: unknown, fieldName: string): asserts value is number {
  assertFiniteNumber(value, fieldName);

  if (value <= 0) {
    throw new RangeError(`${fieldName} must be greater than 0.`);
  }
}

function assertScoreAnswers(
  answers: unknown,
  options: {
    allowZero?: boolean;
    fieldName?: string;
  } = {}
) {
  const { allowZero = false, fieldName = "answers" } = options;

  if (!Array.isArray(answers)) {
    throw new TypeError(`${fieldName} must be an array.`);
  }

  if (answers.length === 0) {
    throw new RangeError(`${fieldName} must contain at least one value.`);
  }

  const minimum = allowZero ? 0 : 1;

  for (const answer of answers) {
    assertFiniteNumber(answer, `${fieldName} item`);

    if (answer < minimum || answer > 5) {
      throw new RangeError(`${fieldName} item must be between ${minimum} and 5.`);
    }
  }
}

export function calculateJobScore(
  answers: number[],
  multiplier: number,
  roleMultiplier: number = 1
) {
  assertScoreAnswers(answers);
  assertPositiveNumber(multiplier, "multiplier");
  assertPositiveNumber(roleMultiplier, "roleMultiplier");

  const average = answers.reduce((sum, value) => sum + value, 0) / answers.length;
  const baseScore = Number((average * 20).toFixed(1));
  const finalScore = Number((baseScore * multiplier * roleMultiplier).toFixed(1));

  return { baseScore, finalScore };
}

export function normalizeMonthlyScore(rawJobScore: number, theoreticalMax: number) {
  assertFiniteNumber(rawJobScore, "rawJobScore");
  assertFiniteNumber(theoreticalMax, "theoreticalMax");

  if (theoreticalMax === 0) {
    return 0;
  }

  if (theoreticalMax < 0) {
    throw new RangeError("theoreticalMax must be 0 or greater.");
  }

  return Number(((rawJobScore / theoreticalMax) * 100).toFixed(1));
}

export function calculateMonthlyTotal(
  normalizedJobScore: number,
  workshopScore: number | null,
  coordinatorScore: number | null
) {
  assertFiniteNumber(normalizedJobScore, "normalizedJobScore");

  if (workshopScore !== null) {
    assertFiniteNumber(workshopScore, "workshopScore");
  }

  if (coordinatorScore !== null) {
    assertFiniteNumber(coordinatorScore, "coordinatorScore");
  }

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
  assertScoreAnswers(answers, { allowZero: true });

  const validAnswers = answers.filter((answer) => answer > 0);

  if (validAnswers.length === 0) {
    return 0;
  }

  const average =
    validAnswers.reduce((sum, value) => sum + value, 0) / validAnswers.length;
  return Number((average * 20).toFixed(1));
}

export function calculateKesifScore(mainJobBaseScore: number) {
  assertFiniteNumber(mainJobBaseScore, "mainJobBaseScore");

  if (mainJobBaseScore < 0) {
    throw new RangeError("mainJobBaseScore must be 0 or greater.");
  }

  return Number((mainJobBaseScore * 0.5).toFixed(1));
}
