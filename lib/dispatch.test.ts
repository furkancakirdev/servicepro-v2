import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    user: { findMany: vi.fn() },
    serviceJob: { findMany: vi.fn() },
    dailyPlan: { findMany: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMocks.prisma,
}));

import {
  buildDispatchPublishLogEntries,
  getDispatchPlanningDate,
  resolveDispatchTab,
  sortDispatchJobsForLane,
  type DispatchJobCard,
} from "@/lib/dispatch";

function createDispatchJobCard(
  overrides: Partial<DispatchJobCard> = {}
): DispatchJobCard {
  return {
    id: "job-1",
    boatId: "boat-1",
    boatName: "Blue Pearl",
    categoryName: "Elektrik",
    description: "Jenerator kontrolu",
    descriptionPreview: "Jenerator kontrolu",
    location: "Netsel Marina",
    locationLabel: "Netsel",
    regionId: "netsel",
    dispatchTab: "NETSEL",
    status: "PLANLANDI",
    multiplier: 1,
    isKesif: false,
    isVip: false,
    contactName: "Kaptan",
    contactPhone: "+905550101122",
    responsibleId: "tech-1",
    responsibleName: "Ali",
    assignedTechnician: "Ali",
    supportIds: [],
    supportNames: [],
    hasMissingContact: false,
    hasLocationWarning: false,
    continuityHint: null,
    priority: "NORMAL",
    createdAtIso: "2026-03-25T12:00:00.000Z",
    dispatchDateIso: "2026-03-26T00:00:00.000Z",
    plannedStartDateIso: null,
    plannedStartAtIso: "2026-03-26T09:00:00.000Z",
    plannedEndAtIso: "2026-03-26T11:00:00.000Z",
    estimatedDate: null,
    timeLabel: "09:00",
    ...overrides,
  };
}

describe("resolveDispatchTab", () => {
  it("classifies Göcek routes as SAHA without mojibake fallbacks", () => {
    expect(resolveDispatchTab("Göcek Marina")).toBe("SAHA");
  });
});

describe("getDispatchPlanningDate", () => {
  it("prefers planned start values over dispatchDate and createdAt", () => {
    const result = getDispatchPlanningDate({
      dispatchDate: new Date("2026-03-28T00:00:00.000Z"),
      plannedStartDate: new Date("2026-03-27T08:00:00.000Z"),
      plannedStartAt: new Date("2026-03-27T09:00:00.000Z"),
      createdAt: new Date("2026-03-26T11:00:00.000Z"),
    });

    expect(result.toISOString()).toBe("2026-03-27T08:00:00.000Z");
  });
});

describe("sortDispatchJobsForLane", () => {
  it("sorts by the new planned start field before boat name", () => {
    const result = sortDispatchJobsForLane([
      createDispatchJobCard({
        id: "late",
        boatName: "A Boat",
        plannedStartDateIso: "2026-03-26T11:00:00.000Z",
        plannedStartAtIso: "2026-03-26T11:00:00.000Z",
      }),
      createDispatchJobCard({
        id: "early",
        boatName: "Z Boat",
        plannedStartDateIso: "2026-03-26T09:00:00.000Z",
        plannedStartAtIso: "2026-03-26T09:00:00.000Z",
      }),
    ]);

    expect(result.map((job) => job.id)).toEqual(["early", "late"]);
  });
});

describe("buildDispatchPublishLogEntries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-26T09:30:00.000Z"));
  });

  it("formats published log rows with TR/EN template status and newest first", () => {
    const result = buildDispatchPublishLogEntries([
      {
        location: "SAHA",
        publishedAt: "2026-03-26T08:15:00.000Z",
        publishedByName: "Koordinator",
        waTemplateTR: "TR metni",
        waTemplateEN: "EN text",
      },
      {
        location: "YATMARIN",
        publishedAt: "2026-03-26T07:00:00.000Z",
        publishedByName: null,
        waTemplateTR: "TR metni",
        waTemplateEN: "",
      },
    ]);

    expect(result[0]).toMatchObject({
      location: "SAHA",
      locationLabel: "Marmaris Disi",
      publishedByName: "Koordinator",
      hasTRTemplate: true,
      hasENTemplate: true,
    });
    expect(result[1]).toMatchObject({
      location: "YATMARIN",
      locationLabel: "Yatmarin Marina",
      hasTRTemplate: true,
      hasENTemplate: false,
    });
  });
});
