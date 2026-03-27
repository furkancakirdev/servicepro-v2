import type { JobRole } from "@prisma/client";

export type FieldReportPhotos = {
  before?: string;
  after?: string;
  details: string[];
};

export type FieldReportInput = {
  unitInfo: string;
  partsUsed?: string;
  hasSubcontractor: boolean;
  subcontractorDetails?: string;
  notes?: string;
  photos: FieldReportPhotos;
};

export type SubmitFieldReportInput = FieldReportInput & {
  responsibleId: string;
  supportIds: string[];
};

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

export type SubmitFieldReportActionState = {
  success: boolean;
  error: string | null;
};

export type EvaluateAndCloseJobActionState = {
  success: boolean;
  error: string | null;
  result: JobCloseoutResult | null;
};

export type CloseJobWithEvaluationActionState = {
  success: boolean;
  error: string | null;
  result: JobCloseoutResult | null;
};
export type JobScoreWriteAssignment = {
  userId: string;
  role: JobRole;
};
export type JobScoreWriteRow = {
  jobId: string;
  userId: string;
  role: JobRole;
  baseScore: number;
  multiplier: number;
  roleMultiplier: number;
  finalScore: number;
  isKesif: boolean;
  month: number;
  year: number;
};

export const initialCloseJobWithEvaluationActionState: CloseJobWithEvaluationActionState = {
  success: false,
  error: null,
  result: null,
};

export const initialSubmitFieldReportActionState: SubmitFieldReportActionState = {
  success: false,
  error: null,
};

export const initialEvaluateAndCloseJobActionState: EvaluateAndCloseJobActionState = {
  success: false,
  error: null,
  result: null,
};

export function serializeFieldReport(input: FieldReportInput) {
  return JSON.stringify({
    version: 2,
    unitInfo: input.unitInfo,
    partsUsed: input.partsUsed ?? "",
    hasSubcontractor: input.hasSubcontractor,
    subcontractorDetails: input.subcontractorDetails ?? "",
    notes: input.notes ?? "",
    photos: {
      before: input.photos.before ?? "",
      after: input.photos.after ?? "",
      details: input.photos.details ?? [],
    },
  });
}

export function parseFieldReport(raw: string | null | undefined): FieldReportInput | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as
      | {
          version?: number;
          unitInfo?: string;
          partsUsed?: string;
          hasSubcontractor?: boolean;
          subcontractorDetails?: string;
          notes?: string;
          userNote?: string;
          photos?: {
            before?: string;
            after?: string;
            details?: string[];
          };
        }
      | string;

    if (!parsed || typeof parsed === "string") {
      return null;
    }

    return {
      unitInfo: parsed.unitInfo ?? "",
      partsUsed: parsed.partsUsed ?? "",
      hasSubcontractor: Boolean(parsed.hasSubcontractor),
      subcontractorDetails: parsed.subcontractorDetails ?? "",
      notes: parsed.notes ?? parsed.userNote ?? "",
      photos: {
        before: parsed.photos?.before,
        after: parsed.photos?.after,
        details: Array.isArray(parsed.photos?.details) ? parsed.photos?.details : [],
      },
    };
  } catch {
    return {
      unitInfo: "",
      partsUsed: "",
      hasSubcontractor: false,
      subcontractorDetails: "",
      notes: raw,
      photos: {
        details: [],
      },
    };
  }
}

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

export function buildJobScoreWriteRows(params: {
  jobId: string;
  assignments: JobScoreWriteAssignment[];
  baseScore: number;
  multiplier: number;
  isKesif: boolean;
  scoreDate: Date;
}) {
  assertFiniteNumber(params.baseScore, "baseScore");
  assertPositiveNumber(params.multiplier, "multiplier");

  return params.assignments.map((assignment) => {
    const roleMultiplier = assignment.role === "SORUMLU" ? 1 : 0.4;

    return {
      jobId: params.jobId,
      userId: assignment.userId,
      role: assignment.role,
      baseScore: params.baseScore,
      multiplier: params.multiplier,
      roleMultiplier,
      finalScore: Number((params.baseScore * params.multiplier * roleMultiplier).toFixed(1)),
      isKesif: params.isKesif,
      month: params.scoreDate.getMonth() + 1,
      year: params.scoreDate.getFullYear(),
    };
  });
}
