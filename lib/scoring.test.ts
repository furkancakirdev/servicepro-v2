import { describe, expect, it } from "vitest";

import {
  calculateJobScore,
  calculateKesifScore,
  calculateMonthlyTotal,
  initialCloseJobWithEvaluationActionState,
  normalizeMonthlyEval,
  normalizeMonthlyScore,
} from "./scoring";

const FULL_SCORE_ANSWERS = [5, 4, 3, 4, 5];
const SINGLE_ANSWER = [3];
const JOB_MULTIPLIER = 2.5;
const SUPPORT_ROLE_MULTIPLIER = 0.4;
const RAW_JOB_SCORE = 150;
const THEORETICAL_MAX = 300;
const NORMALIZED_JOB_SCORE = 80;
const WORKSHOP_SCORE = 90;
const COORDINATOR_SCORE = 70;
const KESIF_BASE_SCORE = 83.6;

describe("initialCloseJobWithEvaluationActionState", () => {
  it("exposes the expected default action state", () => {
    // Arrange
    const expectedState = {
      success: false,
      error: null,
      result: null,
    };

    // Act
    const result = initialCloseJobWithEvaluationActionState;

    // Assert
    expect(result).toEqual(expectedState);
  });
});

describe("calculateJobScore", () => {
  it("calculates the weighted score for a responsible technician", () => {
    // Arrange
    const answers = FULL_SCORE_ANSWERS;

    // Act
    const result = calculateJobScore(answers, JOB_MULTIPLIER, SUPPORT_ROLE_MULTIPLIER);

    // Assert
    expect(result).toEqual({ baseScore: 84, finalScore: 84 });
  });

  it("uses the default role multiplier when one is not provided", () => {
    // Arrange
    const answers = SINGLE_ANSWER;

    // Act
    const result = calculateJobScore(answers, 1.5);

    // Assert
    expect(result).toEqual({ baseScore: 60, finalScore: 90 });
  });

  it("throws when answers is not an array", () => {
    // Arrange
    const invalidAnswers = undefined as unknown as number[];

    // Act
    const execution = () => calculateJobScore(invalidAnswers, 1, 1);

    // Assert
    expect(execution).toThrow("answers must be an array.");
  });

  it("throws when answers is empty", () => {
    // Arrange
    const invalidAnswers: number[] = [];

    // Act
    const execution = () => calculateJobScore(invalidAnswers, 1, 1);

    // Assert
    expect(execution).toThrow("answers must contain at least one value.");
  });

  it("throws when an answer is outside the supported 1-5 range", () => {
    // Arrange
    const invalidAnswers = [0, 5, 5];

    // Act
    const execution = () => calculateJobScore(invalidAnswers, 1, 1);

    // Assert
    expect(execution).toThrow("answers item must be between 1 and 5.");
  });

  it("throws when an answer is not finite", () => {
    // Arrange
    const invalidAnswers = [5, Number.NaN];

    // Act
    const execution = () => calculateJobScore(invalidAnswers, 1, 1);

    // Assert
    expect(execution).toThrow("answers item must be a finite number.");
  });

  it("throws when multiplier is zero", () => {
    // Arrange
    const answers = FULL_SCORE_ANSWERS;

    // Act
    const execution = () => calculateJobScore(answers, 0, 1);

    // Assert
    expect(execution).toThrow("multiplier must be greater than 0.");
  });

  it("throws when roleMultiplier is infinite", () => {
    // Arrange
    const answers = FULL_SCORE_ANSWERS;

    // Act
    const execution = () => calculateJobScore(answers, 1, Number.POSITIVE_INFINITY);

    // Assert
    expect(execution).toThrow("roleMultiplier must be a finite number.");
  });
});

describe("normalizeMonthlyScore", () => {
  it("returns the rounded monthly percentage for a valid score", () => {
    // Arrange
    const rawJobScore = RAW_JOB_SCORE;
    const theoreticalMax = THEORETICAL_MAX;

    // Act
    const result = normalizeMonthlyScore(rawJobScore, theoreticalMax);

    // Assert
    expect(result).toBe(50);
  });

  it("returns zero when the theoretical maximum is zero", () => {
    // Arrange
    const theoreticalMax = 0;

    // Act
    const result = normalizeMonthlyScore(RAW_JOB_SCORE, theoreticalMax);

    // Assert
    expect(result).toBe(0);
  });

  it("returns zero when the theoretical maximum is negative zero", () => {
    // Arrange
    const theoreticalMax = -0;

    // Act
    const result = normalizeMonthlyScore(RAW_JOB_SCORE, theoreticalMax);

    // Assert
    expect(result).toBe(0);
  });

  it("throws when theoreticalMax is negative", () => {
    // Arrange
    const theoreticalMax = -1;

    // Act
    const execution = () => normalizeMonthlyScore(RAW_JOB_SCORE, theoreticalMax);

    // Assert
    expect(execution).toThrow("theoreticalMax must be 0 or greater.");
  });

  it("throws when rawJobScore is not finite", () => {
    // Arrange
    const rawJobScore = Number.POSITIVE_INFINITY;

    // Act
    const execution = () => normalizeMonthlyScore(rawJobScore, THEORETICAL_MAX);

    // Assert
    expect(execution).toThrow("rawJobScore must be a finite number.");
  });
});

describe("calculateMonthlyTotal", () => {
  it("combines job, workshop, and coordinator scores", () => {
    // Arrange
    const normalizedJobScore = NORMALIZED_JOB_SCORE;

    // Act
    const result = calculateMonthlyTotal(
      normalizedJobScore,
      WORKSHOP_SCORE,
      COORDINATOR_SCORE
    );

    // Assert
    expect(result).toEqual({ total: 80, hasMissingEval: false });
  });

  it("marks the total as incomplete when a workshop evaluation is missing", () => {
    // Arrange
    const normalizedJobScore = 70;

    // Act
    const result = calculateMonthlyTotal(normalizedJobScore, null, 90);

    // Assert
    expect(result).toEqual({ total: 55, hasMissingEval: true });
  });

  it("throws when coordinatorScore is missing at runtime", () => {
    // Arrange
    const missingCoordinatorScore = undefined as unknown as number | null;

    // Act
    const execution = () =>
      calculateMonthlyTotal(NORMALIZED_JOB_SCORE, WORKSHOP_SCORE, missingCoordinatorScore);

    // Assert
    expect(execution).toThrow("coordinatorScore must be a finite number.");
  });
});

describe("normalizeMonthlyEval", () => {
  it("averages only answered scores and ignores zeros", () => {
    // Arrange
    const answers = [5, 0, 4, 0, 3];

    // Act
    const result = normalizeMonthlyEval(answers);

    // Assert
    expect(result).toBe(80);
  });

  it("returns zero when all answers are zero", () => {
    // Arrange
    const answers = [0, 0, 0];

    // Act
    const result = normalizeMonthlyEval(answers);

    // Assert
    expect(result).toBe(0);
  });

  it("throws when answers is empty", () => {
    // Arrange
    const answers: number[] = [];

    // Act
    const execution = () => normalizeMonthlyEval(answers);

    // Assert
    expect(execution).toThrow("answers must contain at least one value.");
  });

  it("throws when an answer is negative", () => {
    // Arrange
    const answers = [5, -1, 4];

    // Act
    const execution = () => normalizeMonthlyEval(answers);

    // Assert
    expect(execution).toThrow("answers item must be between 0 and 5.");
  });
});

describe("calculateKesifScore", () => {
  it("returns half of the main job base score rounded to one decimal place", () => {
    // Arrange
    const baseScore = KESIF_BASE_SCORE;

    // Act
    const result = calculateKesifScore(baseScore);

    // Assert
    expect(result).toBe(41.8);
  });

  it("throws when the base score is negative", () => {
    // Arrange
    const invalidBaseScore = -1;

    // Act
    const execution = () => calculateKesifScore(invalidBaseScore);

    // Assert
    expect(execution).toThrow("mainJobBaseScore must be 0 or greater.");
  });
});
