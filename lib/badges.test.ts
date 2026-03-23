import { BadgeType, EvaluatorType, JobRole, Role } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type NotificationMetadata = { month?: number; year?: number } | null;

const prismaMocks = vi.hoisted(() => {
  const userFindMany = vi.fn();
  const jobScoreFindMany = vi.fn();
  const jobEvaluationFindMany = vi.fn();
  const monthlyEvaluationFindFirst = vi.fn();
  const badgeFindMany = vi.fn();
  const notificationFindMany = vi.fn();
  const badgeDeleteMany = vi.fn();
  const badgeCreate = vi.fn();
  const notificationDeleteMany = vi.fn();
  const notificationCreateMany = vi.fn();
  const transaction = vi.fn();

  return {
    prisma: {
      user: { findMany: userFindMany },
      jobScore: { findMany: jobScoreFindMany },
      jobEvaluation: { findMany: jobEvaluationFindMany },
      monthlyEvaluation: { findFirst: monthlyEvaluationFindFirst },
      badge: { findMany: badgeFindMany },
      notification: { findMany: notificationFindMany },
      $transaction: transaction,
    },
    tx: {
      badge: { deleteMany: badgeDeleteMany, create: badgeCreate },
      notification: {
        deleteMany: notificationDeleteMany,
        createMany: notificationCreateMany,
      },
    },
    userFindMany,
    jobScoreFindMany,
    jobEvaluationFindMany,
    monthlyEvaluationFindFirst,
    badgeFindMany,
    notificationFindMany,
    badgeDeleteMany,
    badgeCreate,
    notificationDeleteMany,
    notificationCreateMany,
    transaction,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMocks.prisma,
}));

import {
  calculateMonthlyBadges,
  calculateYearEndRanking,
  calculateYearlyBadgeStandings,
} from "./badges";

const TARGET_MONTH = 3;
const TARGET_YEAR = 2026;

describe("calculateMonthlyBadges", () => {
  beforeEach(() => {
    prismaMocks.userFindMany.mockReset();
    prismaMocks.jobScoreFindMany.mockReset();
    prismaMocks.jobEvaluationFindMany.mockReset();
    prismaMocks.monthlyEvaluationFindFirst.mockReset();
    prismaMocks.badgeFindMany.mockReset();
    prismaMocks.notificationFindMany.mockReset();
    prismaMocks.badgeDeleteMany.mockReset();
    prismaMocks.badgeCreate.mockReset();
    prismaMocks.notificationDeleteMany.mockReset();
    prismaMocks.notificationCreateMany.mockReset();
    prismaMocks.transaction.mockReset();
    prismaMocks.transaction.mockImplementation(
      async (callback: (client: typeof prismaMocks.tx) => Promise<unknown>) =>
        callback(prismaMocks.tx)
    );
  });

  it("calculates monthly, quality, and team winners and persists them", async () => {
    // Arrange
    prismaMocks.userFindMany.mockResolvedValue([
      { id: "alpha", name: "Alpha", role: Role.TECHNICIAN },
      { id: "beta", name: "Beta", role: Role.TECHNICIAN },
      { id: "gamma", name: "Gamma", role: Role.COORDINATOR },
    ]);
    prismaMocks.jobScoreFindMany
      .mockResolvedValueOnce([
        { finalScore: 240, role: JobRole.SORUMLU },
        { finalScore: 210, role: JobRole.SORUMLU },
        { finalScore: 120, role: JobRole.DESTEK },
      ])
      .mockResolvedValueOnce([
        { finalScore: 160, role: JobRole.SORUMLU },
        { finalScore: 160, role: JobRole.SORUMLU },
        { finalScore: 160, role: JobRole.SORUMLU },
      ])
      .mockResolvedValueOnce([
        { finalScore: 170, role: JobRole.DESTEK },
        { finalScore: 170, role: JobRole.DESTEK },
        { finalScore: 150, role: JobRole.DESTEK },
        { finalScore: 150, role: JobRole.DESTEK },
      ]);
    prismaMocks.jobEvaluationFindMany
      .mockResolvedValueOnce([{ baseScore: 80 }, { baseScore: 90 }])
      .mockResolvedValueOnce([{ baseScore: 100 }, { baseScore: 96 }])
      .mockResolvedValueOnce([{ baseScore: 70 }]);
    prismaMocks.monthlyEvaluationFindFirst
      .mockResolvedValueOnce({
        evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
        normalizedScore: 95,
        wc_q1_technical: 5,
      })
      .mockResolvedValueOnce({
        evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
        normalizedScore: 90,
        tc_q4_teamwork: 3,
      })
      .mockResolvedValueOnce({
        evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
        normalizedScore: 88,
        wc_q1_technical: 5,
      })
      .mockResolvedValueOnce({
        evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
        normalizedScore: 80,
        tc_q4_teamwork: 4,
      })
      .mockResolvedValueOnce({
        evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
        normalizedScore: 70,
        wc_q1_technical: 3,
      })
      .mockResolvedValueOnce({
        evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
        normalizedScore: 85,
        tc_q4_teamwork: 5,
      });
    prismaMocks.notificationFindMany.mockResolvedValue([
      { id: "stale-notification", metadata: { month: TARGET_MONTH, year: TARGET_YEAR } },
      { id: "fresh-notification", metadata: { month: 2, year: TARGET_YEAR } },
    ] satisfies Array<{ id: string; metadata: NotificationMetadata }>);

    // Act
    const result = await calculateMonthlyBadges(TARGET_MONTH, TARGET_YEAR);

    // Assert
    expect(result).toEqual([
      { type: BadgeType.SERVIS_YILDIZI, winner: "Alpha", score: 80.8 },
      { type: BadgeType.KALITE_USTASI, winner: "Beta", score: 98.6 },
      { type: BadgeType.EKIP_OYUNCUSU, winner: "Gamma", score: 64.7 },
    ]);
    expect(prismaMocks.transaction).toHaveBeenCalledTimes(2);
    expect(prismaMocks.badgeDeleteMany).toHaveBeenCalledWith({
      where: { month: TARGET_MONTH, year: TARGET_YEAR },
    });
    expect(prismaMocks.badgeCreate).toHaveBeenCalledTimes(3);
    expect(prismaMocks.notificationDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["stale-notification"] } },
    });
    expect(prismaMocks.notificationCreateMany).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list when there are no eligible employees", async () => {
    // Arrange
    prismaMocks.userFindMany.mockResolvedValue([]);
    prismaMocks.notificationFindMany.mockResolvedValue([]);

    // Act
    const result = await calculateMonthlyBadges(TARGET_MONTH, TARGET_YEAR);

    // Assert
    expect(result).toEqual([]);
    expect(prismaMocks.badgeDeleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMocks.badgeCreate).not.toHaveBeenCalled();
    expect(prismaMocks.notificationCreateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid month values before querying Prisma", async () => {
    // Arrange
    const invalidMonth = 13;

    // Act
    const execution = calculateMonthlyBadges(invalidMonth, TARGET_YEAR);

    // Assert
    await expect(execution).rejects.toThrow("month must be between 1 and 12.");
    expect(prismaMocks.userFindMany).not.toHaveBeenCalled();
  });
});

describe("calculateYearEndRanking", () => {
  beforeEach(() => {
    prismaMocks.badgeFindMany.mockReset();
    prismaMocks.userFindMany.mockReset();
  });

  it("returns the top three users ranked by yearly badge points", async () => {
    // Arrange
    prismaMocks.badgeFindMany.mockResolvedValue([
      { userId: "u1" },
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
      { userId: "u3" },
      { userId: "u3" },
      { userId: "u4" },
    ]);
    prismaMocks.userFindMany.mockResolvedValue([
      { id: "u1", name: "Ada", avatarUrl: null },
      { id: "u2", name: "Bora", avatarUrl: null },
      { id: "u3", name: "Can", avatarUrl: null },
      { id: "u4", name: "Deniz", avatarUrl: null },
    ]);

    // Act
    const result = await calculateYearEndRanking(TARGET_YEAR);

    // Assert
    expect(result).toEqual([
      { user: { id: "u3", name: "Can", avatarUrl: null }, yearScore: 9 },
      { user: { id: "u1", name: "Ada", avatarUrl: null }, yearScore: 6 },
      { user: { id: "u2", name: "Bora", avatarUrl: null }, yearScore: 3 },
    ]);
  });

  it("rejects invalid years before reading badges", async () => {
    // Arrange
    const invalidYear = 1999;

    // Act
    const execution = calculateYearEndRanking(invalidYear);

    // Assert
    await expect(execution).rejects.toThrow("year must be 2000 or greater.");
    expect(prismaMocks.badgeFindMany).not.toHaveBeenCalled();
  });
});

describe("calculateYearlyBadgeStandings", () => {
  beforeEach(() => {
    prismaMocks.badgeFindMany.mockReset();
  });

  it("groups yearly badges per user and assigns ranks", async () => {
    // Arrange
    prismaMocks.badgeFindMany.mockResolvedValue([
      {
        userId: "u1",
        type: BadgeType.SERVIS_YILDIZI,
        user: { id: "u1", name: "Zeynep", avatarUrl: null },
        month: 1,
        createdAt: new Date(TARGET_YEAR, 0, 10),
      },
      {
        userId: "u1",
        type: BadgeType.KALITE_USTASI,
        user: { id: "u1", name: "Zeynep", avatarUrl: null },
        month: 2,
        createdAt: new Date(TARGET_YEAR, 1, 10),
      },
      {
        userId: "u2",
        type: BadgeType.EKIP_OYUNCUSU,
        user: { id: "u2", name: "Ahmet", avatarUrl: null },
        month: 3,
        createdAt: new Date(TARGET_YEAR, 2, 10),
      },
      {
        userId: "u3",
        type: BadgeType.SERVIS_YILDIZI,
        user: { id: "u3", name: "Mehmet", avatarUrl: null },
        month: 4,
        createdAt: new Date(TARGET_YEAR, 3, 10),
      },
    ]);

    // Act
    const result = await calculateYearlyBadgeStandings(TARGET_YEAR);

    // Assert
    expect(result).toEqual([
      {
        rank: 1,
        user: { id: "u1", name: "Zeynep", avatarUrl: null },
        badgeCount: 2,
        yearScore: 6,
        badgeTypes: [BadgeType.SERVIS_YILDIZI, BadgeType.KALITE_USTASI],
      },
      {
        rank: 2,
        user: { id: "u2", name: "Ahmet", avatarUrl: null },
        badgeCount: 1,
        yearScore: 3,
        badgeTypes: [BadgeType.EKIP_OYUNCUSU],
      },
      {
        rank: 3,
        user: { id: "u3", name: "Mehmet", avatarUrl: null },
        badgeCount: 1,
        yearScore: 3,
        badgeTypes: [BadgeType.SERVIS_YILDIZI],
      },
    ]);
  });

  it("rejects invalid years before reading grouped badge data", async () => {
    // Arrange
    const invalidYear = Number.NaN;

    // Act
    const execution = calculateYearlyBadgeStandings(invalidYear);

    // Assert
    await expect(execution).rejects.toThrow("year must be an integer.");
    expect(prismaMocks.badgeFindMany).not.toHaveBeenCalled();
  });
});
