import { HoldReason, JobStatus } from "@prisma/client";

export const boatTypeOptions = ["M/V", "S/Y", "CAT", "RIB", "GULET", "DIGER"] as const;
export const jobPriorityOptions = ["ACIL", "YUKSEK", "NORMAL", "DUSUK"] as const;
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
  plannedStartAt?: Date | string | null;
  plannedStartDate?: Date | string | null;
  plannedEndAt?: Date | string | null;
  estimatedDate?: Date | string | number | null;
  slaHours?: number | null;
};
export type NormalizedJobSchedule = {
  plannedStartAt: Date;
  plannedEndAt: Date;
  slaHours: number;
};
export type JobPriority = (typeof jobPriorityOptions)[number];

export type CreateJobFieldName =
  | "boatId"
  | "categoryId"
  | "description"
  | "plannedStartDate"
  | "estimatedDate"
  | "priority";

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

export const jobPriorityConfig: Record<
  JobPriority,
  {
    label: string;
    iconToneClassName: string;
    badgeClassName: string;
    accentClassName: string;
  }
> = {
  ACIL: {
    label: "Acil",
    iconToneClassName: "text-rose-600",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
    accentClassName: "border-rose-300 bg-rose-50 text-rose-900",
  },
  YUKSEK: {
    label: "Yuksek",
    iconToneClassName: "text-amber-600",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    accentClassName: "border-amber-300 bg-amber-50 text-amber-900",
  },
  NORMAL: {
    label: "Normal",
    iconToneClassName: "text-sky-600",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
    accentClassName: "border-sky-300 bg-sky-50 text-sky-900",
  },
  DUSUK: {
    label: "Dusuk",
    iconToneClassName: "text-emerald-600",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accentClassName: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
};

export type BoatContinuitySuggestion = {
  userId: string;
  name: string;
  visitCount: number;
  lastVisitedAt: string | null;
  label: string;
};

export type JobFormBoatOption = {
  id: string;
  name: string;
  type: string;
  ownerName: string | null;
  homePort: string | null;
  flag: string | null;
  jobCount: number;
  continuitySuggestions: BoatContinuitySuggestion[];
};

export type JobFormMeta = {
  boats: JobFormBoatOption[];
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
  plannedStartDate?: Date | null;
  plannedStartAt?: Date | null;
  estimatedDate?: number | null;
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

function toEstimatedDate(value: Date | string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000);
  }

  if (value instanceof Date || typeof value === "string") {
    return toDate(value, "Tahmini bitis zamani");
  }

  return null;
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
  const plannedStartSource = input.plannedStartDate ?? input.plannedStartAt;
  const plannedStartAt = toDate(plannedStartSource, "Planlanan baslangic zamani");
  const plannedEndInput = toEstimatedDate(input.estimatedDate) ?? (input.plannedEndAt
    ? toDate(input.plannedEndAt, "Planlanan bitis zamani")
    : null);
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

export function getEstimatedDateAsDate(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000)
    : null;
}

export function toEstimatedDateSeconds(value: Date) {
  return Math.trunc(value.getTime() / 1000);
}

export function normalizeJobPriority(value?: string | null): JobPriority {
  return jobPriorityOptions.includes(value as JobPriority)
    ? (value as JobPriority)
    : "NORMAL";
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
  const plannedStartDate = job.plannedStartDate ?? job.plannedStartAt ?? job.createdAt;
  const estimatedDate = getEstimatedDateAsDate(job.estimatedDate);
  const plannedEndDate = estimatedDate ?? job.plannedEndAt ?? plannedStartDate;

  switch (field) {
    case "plannedStartAt":
      return plannedStartDate;
    case "plannedEndAt":
      return plannedEndDate;
    case "startedAt":
      return job.actualStartAt ?? job.startedAt ?? plannedStartDate;
    case "actualStartAt":
      return job.actualStartAt ?? job.startedAt ?? plannedStartDate;
    case "completedAt":
      return job.actualEndAt ?? job.completedAt ?? plannedEndDate;
    case "closedAt":
      return job.closedAt ?? job.createdAt;
    case "actualEndAt":
      return job.actualEndAt ?? job.completedAt ?? plannedEndDate;
    case "createdAt":
    default:
      return job.createdAt;
  }
}

export function getJobOperationalReference(
  job: Pick<
    JobDateSource,
    "createdAt" | "plannedStartDate" | "plannedStartAt" | "startedAt" | "actualStartAt"
  >
) {
  return job.actualStartAt ?? job.startedAt ?? job.plannedStartDate ?? job.plannedStartAt ?? job.createdAt;
}

