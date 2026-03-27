import type { SubmitFieldReportInput } from "@/lib/scoring";

const FIELD_REPORT_QUEUE_STORAGE_KEY = "servicepro.field-report-queue.v1";

export type QueuedFieldReport = {
  queueId: string;
  jobId: string;
  queuedAt: string;
  report: SubmitFieldReportInput;
};

type FlushQueuedFieldReportsResult = {
  synced: QueuedFieldReport[];
  remaining: QueuedFieldReport[];
  lastError: string | null;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseStoredQueue(raw: string | null) {
  if (!raw) {
    return [] as QueuedFieldReport[];
  }

  try {
    const parsed = JSON.parse(raw) as QueuedFieldReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedFieldReport[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(FIELD_REPORT_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

async function readResponseError(response: Response) {
  try {
    const parsed = (await response.json()) as { error?: string };
    return parsed.error ?? `Senkronizasyon hatasi (${response.status})`;
  } catch {
    return `Senkronizasyon hatasi (${response.status})`;
  }
}

export function readQueuedFieldReports() {
  if (!canUseLocalStorage()) {
    return [] as QueuedFieldReport[];
  }

  return parseStoredQueue(window.localStorage.getItem(FIELD_REPORT_QUEUE_STORAGE_KEY));
}

export function getQueuedFieldReportCount() {
  return readQueuedFieldReports().length;
}

export function upsertQueuedFieldReport(jobId: string, report: SubmitFieldReportInput) {
  const currentQueue = readQueuedFieldReports().filter((item) => item.jobId !== jobId);
  const nextItem: QueuedFieldReport = {
    queueId:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${jobId}`,
    jobId,
    queuedAt: new Date().toISOString(),
    report,
  };

  const nextQueue = [...currentQueue, nextItem];
  writeQueue(nextQueue);
  return nextItem;
}

export async function flushQueuedFieldReports(): Promise<FlushQueuedFieldReportsResult> {
  const queue = readQueuedFieldReports();

  if (queue.length === 0 || typeof navigator === "undefined" || !navigator.onLine) {
    return {
      synced: [],
      remaining: queue,
      lastError: null,
    };
  }

  const synced: QueuedFieldReport[] = [];
  const remaining: QueuedFieldReport[] = [];
  let lastError: string | null = null;

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];

    try {
      const response = await fetch("/api/field-reports/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: item.jobId,
          report: item.report,
        }),
      });

      if (response.ok) {
        synced.push(item);
        continue;
      }

      lastError = await readResponseError(response);

      if ([400, 404, 409].includes(response.status)) {
        continue;
      }

      remaining.push(item, ...queue.slice(index + 1));
      break;
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Kuyruktaki saha raporu gonderilemedi.";
      remaining.push(item, ...queue.slice(index + 1));
      break;
    }
  }

  writeQueue(remaining);

  return {
    synced,
    remaining,
    lastError,
  };
}
