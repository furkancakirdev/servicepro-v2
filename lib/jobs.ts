import { HoldReason, JobStatus } from "@prisma/client";

export const boatTypeOptions = ["M/V", "S/Y", "CAT", "RIB", "GULET", "DIGER"] as const;
export const activeOperationalStatuses: JobStatus[] = [
  JobStatus.PLANLANDI,
  JobStatus.DEVAM_EDIYOR,
  JobStatus.BEKLEMEDE,
];
export const jobStatusGroups = {
  ACTIVE: activeOperationalStatuses,
} as const;
export const jobDateFields = [
  "createdAt",
  "plannedStartAt",
  "plannedEndAt",
  "startedAt",
  "actualStartAt",
  "completedAt",
  "closedAt",
  "actualEndAt",
] as const;
export const DEFAULT_JOBS_PAGE_SIZE = 20;
export const MAX_JOBS_PAGE_SIZE = 100;

export type JobStatusGroup = keyof typeof jobStatusGroups;
export type JobDateField = (typeof jobDateFields)[number];
export type JobsPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};
export type JobsPaginationInput = {
  page?: number | string | null;
  pageSize?: number | string | null;
};
export type JobScheduleInput = {
  plannedStartAt: Date | string;
  plannedEndAt?: Date | string | null;
  slaHours?: number | null;
};
export type NormalizedJobSchedule = {
  plannedStartAt: Date;
  plannedEndAt: Date;
  slaHours: number;
};

export type CreateJobFieldName =
  | "boatName"
  | "boatType"
  | "categoryId"
  | "description"
  | "responsibleId"
  | "plannedStartAt"
  | "plannedEndAt"
  | "slaHours";

export type CreateJobFormState = {
  error: string | null;
  fieldErrors: Partial<Record<CreateJobFieldName, string>>;
};

export const initialCreateJobFormState: CreateJobFormState = {
  error: null,
  fieldErrors: {},
};

export type JobFiltersInput = {
  status?: JobStatus;
  statusGroup?: JobStatusGroup;
  pendingScoring?: boolean;
  query?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  dateField?: JobDateField;
  page?: number | string;
  pageSize?: number | string;
};

export type JobFilterOption = {
  id: string;
  name: string;
};

export type JobFormMeta = {
  boats: Array<{
    id: string;
    name: string;
    type: string;
    jobCount: number;
    continuitySuggestions: Array<{
      userId: string;
      name: string;
      visitCount: number;
      lastVisitedAt: string | null;
      label: string;
    }>;
  }>;
  technicians: JobFilterOption[];
  categories: Array<{
    id: string;
    name: string;
    subScope: string;
    multiplier: number;
    brandHints: string | null;
  }>;
};

export const holdReasonOptions: Array<{
  value: HoldReason;
  label: string;
}> = [
  { value: HoldReason.PARCA_BEKLENIYOR, label: "Parca bekleniyor" },
  { value: HoldReason.MUSTERI_ONAYI, label: "Müşteri onayi" },
  { value: HoldReason.DIS_SERVIS, label: "Dis servis" },
  { value: HoldReason.DIGER, label: "Diger" },
];

export const openStatuses: JobStatus[] = [
  JobStatus.KESIF,
  JobStatus.PLANLANDI,
  JobStatus.DEVAM_EDIYOR,
  JobStatus.BEKLEMEDE,
  JobStatus.TAMAMLANDI,
  JobStatus.GARANTI,
];

type JobDateSource = {
  createdAt: Date;
  plannedStartAt?: Date | null;
  plannedEndAt?: Date | null;
  startedAt: Date | null;
  actualStartAt?: Date | null;
  completedAt: Date | null;
  closedAt: Date | null;
  actualEndAt?: Date | null;
};

function normalizePositiveInteger(
  value: number | string | null | undefined,
  fallback: number,
  max?: number
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  const normalized = Math.trunc(parsed);
  return typeof max === "number" ? Math.min(normalized, max) : normalized;
}

function toDate(value: Date | string | null | undefined, fieldName: string) {
  if (!value) {
    throw new Error(`${fieldName} zorunludur.`);
  }

  const normalized = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(normalized.getTime())) {
    throw new Error(`${fieldName} gecersiz.`);
  }

  return normalized;
}

export function normalizeJobsPagination(
  input: JobsPaginationInput = {}
): JobsPagination {
  const pageSize = normalizePositiveInteger(
    input.pageSize,
    DEFAULT_JOBS_PAGE_SIZE,
    MAX_JOBS_PAGE_SIZE
  );
  const page = normalizePositiveInteger(input.page, 1);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function normalizeJobSchedule(input: JobScheduleInput): NormalizedJobSchedule {
  const plannedStartAt = toDate(input.plannedStartAt, "Planlanan baslangic zamani");
  const plannedEndInput = input.plannedEndAt
    ? toDate(input.plannedEndAt, "Planlanan bitis zamani")
    : null;
  const normalizedSlaHours =
    typeof input.slaHours === "number" && Number.isFinite(input.slaHours)
      ? Math.trunc(input.slaHours)
      : null;

  if (!plannedEndInput && (!normalizedSlaHours || normalizedSlaHours < 1)) {
    throw new Error("Planlanan bitis veya SLA suresi alanlarindan biri zorunludur.");
  }

  if (plannedEndInput && plannedEndInput.getTime() <= plannedStartAt.getTime()) {
    throw new Error("Planlanan bitis zamani baslangictan sonra olmalidir.");
  }

  if (normalizedSlaHours !== null && normalizedSlaHours < 1) {
    throw new Error("SLA suresi 1 saatten kisa olamaz.");
  }

  const plannedEndAt =
    plannedEndInput ??
    new Date(plannedStartAt.getTime() + (normalizedSlaHours ?? 0) * 60 * 60 * 1000);
  const slaHours =
    normalizedSlaHours ??
    Math.max(1, Math.ceil((plannedEndAt.getTime() - plannedStartAt.getTime()) / (60 * 60 * 1000)));

  return {
    plannedStartAt,
    plannedEndAt,
    slaHours,
  };
}

export function isJobStatusGroup(value?: string): value is JobStatusGroup {
  return value === "ACTIVE";
}

export function isJobDateField(value?: string): value is JobDateField {
  return value ? jobDateFields.includes(value as JobDateField) : false;
}

export function getJobDateFieldLabel(field: JobDateField) {
  switch (field) {
    case "plannedStartAt":
      return "Planlanan baslangic";
    case "plannedEndAt":
      return "Planlanan bitis";
    case "startedAt":
      return "Baslangic tarihi";
    case "actualStartAt":
      return "Gercek baslangic";
    case "completedAt":
      return "Tamamlanma tarihi";
    case "closedAt":
      return "Kapanis tarihi";
    case "actualEndAt":
      return "Gercek bitis";
    case "createdAt":
    default:
      return "Kayit tarihi";
  }
}

export function getJobDateValue(job: JobDateSource, field: JobDateField) {
  switch (field) {
    case "plannedStartAt":
      return job.plannedStartAt ?? job.createdAt;
    case "plannedEndAt":
      return job.plannedEndAt ?? job.plannedStartAt ?? job.createdAt;
    case "startedAt":
      return job.actualStartAt ?? job.startedAt ?? job.plannedStartAt ?? job.createdAt;
    case "actualStartAt":
      return job.actualStartAt ?? job.startedAt ?? job.plannedStartAt ?? job.createdAt;
    case "completedAt":
      return job.actualEndAt ?? job.completedAt ?? job.plannedEndAt ?? job.createdAt;
    case "closedAt":
      return job.closedAt ?? job.createdAt;
    case "actualEndAt":
      return job.actualEndAt ?? job.completedAt ?? job.plannedEndAt ?? job.createdAt;
    case "createdAt":
    default:
      return job.createdAt;
  }
}

export function getJobOperationalReference(
  job: Pick<JobDateSource, "createdAt" | "plannedStartAt" | "startedAt" | "actualStartAt">
) {
  return job.actualStartAt ?? job.startedAt ?? job.plannedStartAt ?? job.createdAt;
}

