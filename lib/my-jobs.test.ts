import { describe, expect, it, vi } from "vitest";
import { JobRole, JobStatus } from "@prisma/client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceJob: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import {
  buildJobDetailQualityChecks,
  buildMyJobsOverviewData,
  getMyJobPlanningDate,
} from "@/lib/my-jobs";

describe("getMyJobPlanningDate", () => {
  it("prefers dispatchDate before plannedStartAt and createdAt", () => {
    const result = getMyJobPlanningDate({
      createdAt: new Date("2026-03-24T08:00:00.000Z"),
      dispatchDate: new Date("2026-03-26T00:00:00.000Z"),
      plannedStartAt: new Date("2026-03-26T09:30:00.000Z"),
    });

    expect(result.toISOString()).toBe("2026-03-26T00:00:00.000Z");
  });
});

describe("buildMyJobsOverviewData", () => {
  it("groups weekly counts and today jobs by planning date instead of createdAt", () => {
    const overview = buildMyJobsOverviewData(
      [
        {
          id: "planned-today",
          createdAt: new Date("2026-03-24T08:00:00.000Z"),
          dispatchDate: new Date("2026-03-26T00:00:00.000Z"),
          plannedStartAt: new Date("2026-03-26T09:30:00.000Z"),
          boat: { name: "Aqua One", isVip: true },
          category: { name: "Elektrik" },
          location: "Netsel",
          multiplier: 1.4,
          assignments: [{ userId: "tech-1", role: JobRole.SORUMLU }],
        },
        {
          id: "planned-friday",
          createdAt: new Date("2026-03-26T10:00:00.000Z"),
          dispatchDate: new Date("2026-03-28T00:00:00.000Z"),
          plannedStartAt: new Date("2026-03-28T08:00:00.000Z"),
          boat: { name: "Bravo", isVip: false },
          category: { name: "Bakim" },
          location: "Yatmarin",
          multiplier: 1,
          assignments: [{ userId: "tech-1", role: JobRole.DESTEK }],
        },
      ],
      "tech-1",
      new Date("2026-03-26T07:00:00.000Z")
    );

    expect(overview.todayJobs.map((job) => job.id)).toEqual(["planned-today"]);
    expect(overview.todayJobs[0]?.timeLabel).toBe("12:30");
    expect(
      overview.weeklySummary.find((day) => day.dateValue === "2026-03-26")?.count
    ).toBe(1);
    expect(
      overview.weeklySummary.find((day) => day.dateValue === "2026-03-28")?.count
    ).toBe(1);
  });
});

describe("buildJobDetailQualityChecks", () => {
  it("flags missing primary phone and missing visit history signals", () => {
    const checks = buildJobDetailQualityChecks({
      contacts: [
        {
          id: "contact-1",
          isPrimary: true,
          phone: null,
          email: null,
          whatsappOptIn: true,
          language: "TR",
          updatedAt: new Date("2026-03-20T09:00:00.000Z"),
        },
      ],
      primaryContactId: "contact-1",
      recentVisits: [],
      clientNotifications: [],
    });

    expect(checks.some((check) => check.id === "primary-contact-phone")).toBe(true);
    expect(checks.some((check) => check.id === "visit-history")).toBe(true);
  });
});
