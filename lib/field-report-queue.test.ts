import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  flushQueuedFieldReports,
  getQueuedFieldReportCount,
  readQueuedFieldReports,
  upsertQueuedFieldReport,
} from "@/lib/field-report-queue";
import type { SubmitFieldReportInput } from "@/lib/scoring";

const sampleReport: SubmitFieldReportInput = {
  unitInfo: "Ana makine kontrol paneli",
  responsibleId: "9e0d0adc-8762-4343-a9df-9ae5f8179db5",
  supportIds: ["04291848-4dc0-49db-8d44-4c7ca4bc6382"],
  partsUsed: "Yag filtresi",
  hasSubcontractor: false,
  subcontractorDetails: "",
  notes: "Basinc dengelendi",
  photos: {
    before: "https://example.com/before.jpg",
    after: "https://example.com/after.jpg",
    details: ["https://example.com/detail.jpg"],
  },
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("field-report-queue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setOnline(true);
  });

  it("queues a report locally and flushes it when sync succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    upsertQueuedFieldReport("d0c56071-63ea-4558-a9a9-6e8d745d12a1", sampleReport);

    expect(getQueuedFieldReportCount()).toBe(1);

    const result = await flushQueuedFieldReports();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.synced).toHaveLength(1);
    expect(result.remaining).toHaveLength(0);
    expect(readQueuedFieldReports()).toEqual([]);
  });

  it("drops permanently invalid queued reports after a conflict response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Bu is icin saha raporu zaten gonderilmis." }), {
        status: 409,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    upsertQueuedFieldReport("e61a0a2f-6a8f-46e6-aede-489f3c3b8f0c", sampleReport);

    const result = await flushQueuedFieldReports();

    expect(result.synced).toHaveLength(0);
    expect(result.remaining).toHaveLength(0);
    expect(result.lastError).toContain("zaten gonderilmis");
    expect(readQueuedFieldReports()).toEqual([]);
  });

  it("keeps queued reports when the network request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network Error"));
    vi.stubGlobal("fetch", fetchMock);

    upsertQueuedFieldReport("15870295-6d7e-4e8b-89dc-c00b5c4c07bb", sampleReport);

    const result = await flushQueuedFieldReports();

    expect(result.synced).toHaveLength(0);
    expect(result.remaining).toHaveLength(1);
    expect(result.lastError).toBe("Network Error");
    expect(readQueuedFieldReports()).toHaveLength(1);
  });
});
