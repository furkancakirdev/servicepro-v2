import { HoldReason, JobStatus } from "@prisma/client";

export const boatTypeOptions = ["M/V", "S/Y", "CAT", "RIB", "GULET", "DIGER"] as const;

export type CreateJobFieldName =
  | "boatName"
  | "boatType"
  | "categoryId"
  | "description"
  | "responsibleId";

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
  query?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
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

