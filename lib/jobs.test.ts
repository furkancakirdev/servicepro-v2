import { describe, expect, it } from "vitest";

import {
  DEFAULT_JOBS_PAGE_SIZE,
  MAX_JOBS_PAGE_SIZE,
  isJobDateField,
  jobDateFields,
  normalizeJobSchedule,
  normalizeJobsPagination,
} from "@/lib/jobs";

describe("normalizeJobsPagination", () => {
  it("returns the default first page configuration", () => {
    expect(normalizeJobsPagination()).toEqual({
      page: 1,
      pageSize: DEFAULT_JOBS_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_JOBS_PAGE_SIZE,
    });
  });

  it("parses valid page values and computes the offset", () => {
    expect(normalizeJobsPagination({ page: "3", pageSize: "15" })).toEqual({
      page: 3,
      pageSize: 15,
      skip: 30,
      take: 15,
    });
  });

  it("clamps invalid values back to safe limits", () => {
    expect(normalizeJobsPagination({ page: "-2", pageSize: "999" })).toEqual({
      page: 1,
      pageSize: MAX_JOBS_PAGE_SIZE,
      skip: 0,
      take: MAX_JOBS_PAGE_SIZE,
    });
  });
});

describe("normalizeJobSchedule", () => {
  it("derives planned end from sla hours when end is not provided", () => {
    const result = normalizeJobSchedule({
      plannedStartAt: "2026-03-26T09:00:00.000Z",
      slaHours: 6,
    });

    expect(result.plannedStartAt.toISOString()).toBe("2026-03-26T09:00:00.000Z");
    expect(result.plannedEndAt.toISOString()).toBe("2026-03-26T15:00:00.000Z");
    expect(result.slaHours).toBe(6);
  });

  it("derives sla hours from planned end when duration is omitted", () => {
    const result = normalizeJobSchedule({
      plannedStartAt: "2026-03-26T09:00:00.000Z",
      plannedEndAt: "2026-03-26T13:00:00.000Z",
    });

    expect(result.slaHours).toBe(4);
    expect(result.plannedEndAt.toISOString()).toBe("2026-03-26T13:00:00.000Z");
  });

  it("supports plannedStartDate and estimatedDate from the new planning flow", () => {
    const result = normalizeJobSchedule({
      plannedStartDate: "2026-03-26T09:00:00.000Z",
      estimatedDate: "2026-03-26T12:30:00.000Z",
    });

    expect(result.plannedStartAt.toISOString()).toBe("2026-03-26T09:00:00.000Z");
    expect(result.plannedEndAt.toISOString()).toBe("2026-03-26T12:30:00.000Z");
    expect(result.slaHours).toBe(4);
  });

  it("rejects schedules that do not define an end or sla", () => {
    const execution = () =>
      normalizeJobSchedule({
        plannedStartAt: "2026-03-26T09:00:00.000Z",
      });

    expect(execution).toThrow(
      "Planlanan bitis veya SLA suresi alanlarindan biri zorunludur."
    );
  });

  it("rejects a planned end that is not after the start", () => {
    const execution = () =>
      normalizeJobSchedule({
        plannedStartAt: "2026-03-26T09:00:00.000Z",
        plannedEndAt: "2026-03-26T08:00:00.000Z",
      });

    expect(execution).toThrow("Planlanan bitis zamani baslangictan sonra olmalidir.");
  });
});

describe("job date fields", () => {
  it("accepts planned and actual date filters", () => {
    expect(jobDateFields).toContain("plannedStartAt");
    expect(jobDateFields).toContain("actualStartAt");
    expect(jobDateFields).toContain("actualEndAt");
    expect(isJobDateField("plannedStartAt")).toBe(true);
    expect(isJobDateField("actualStartAt")).toBe(true);
    expect(isJobDateField("actualEndAt")).toBe(true);
  });
});
