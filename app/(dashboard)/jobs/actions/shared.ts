import { revalidatePath } from "next/cache";
import { HoldReason, JobStatus } from "@prisma/client";
import { z } from "zod";

import { jobPriorityOptions } from "@/lib/jobs";

export const createJobSchema = z.object({
  boatId: z.string().uuid("Tekne secimi zorunludur."),
  location: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  categoryId: z.string().uuid("Kategori seÃ§imi zorunludur."),
  description: z
    .string()
    .trim()
    .min(10, "AÃ§Ä±klama en az 10 karakter olmalÄ±."),
  isWarranty: z.boolean().default(false),
  isKesif: z.boolean().default(false),
  notes: z.string().trim().optional(),
  plannedStartDate: z.string().trim().min(1, "Planlanan operasyon baslangici zorunludur."),
  estimatedDate: z.string().trim().min(1, "Tahmini bitis tarihi zorunludur."),
  priority: z.enum(jobPriorityOptions).default("NORMAL"),
});

export const holdReasonSchema = z.nativeEnum(HoldReason);
export const jobStatusSchema = z.nativeEnum(JobStatus);

export const createJobActionSchema = createJobSchema.extend({
  nextPath: z.string().trim().optional(),
});

export const scoreFieldSchema = z.coerce.number().int().min(1).max(5);

export const fieldReportSchema = z
  .object({
    jobId: z.string().uuid(),
    unitInfo: z.string().trim().min(3, "Ãœnite bilgisi zorunludur."),
    responsibleId: z.string().uuid("Sorumlu teknisyen seÃ§imi zorunludur."),
    supportIds: z.array(z.string().uuid()).default([]),
    partsUsed: z.string().trim().optional(),
    hasSubcontractor: z.boolean().default(false),
    subcontractorDetails: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    beforePhotoUrl: z.string().trim().optional(),
    afterPhotoUrl: z.string().trim().optional(),
    detailPhotoUrls: z.array(z.string().trim()).default([]),
  })
  .superRefine((value, context) => {
    const hasPhoto = Boolean(
      value.beforePhotoUrl || value.afterPhotoUrl || value.detailPhotoUrls.length > 0
    );

    if (!hasPhoto) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beforePhotoUrl"],
        message: "En az bir saha fotoÄŸrafÄ± zorunludur.",
      });
    }

    if (value.hasSubcontractor && !value.subcontractorDetails?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcontractorDetails"],
        message: "TaÅŸeron seÃ§ildiÄŸinde firma ve kapsam bilgisi zorunludur.",
      });
    }

    if (value.supportIds.includes(value.responsibleId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportIds"],
        message: "Sorumlu teknisyen destek listesinde tekrar seÃ§ilemez.",
      });
    }
  });

export const evaluateAndCloseSchema = z.object({
  jobId: z.string().uuid(),
  q1_unit: scoreFieldSchema,
  q2_photos: scoreFieldSchema,
  q3_parts: scoreFieldSchema,
  q4_sub: scoreFieldSchema,
  q5_notify: scoreFieldSchema,
});

export const cancelJobSchema = z.object({
  jobId: z.string().uuid(),
  cancelReason: z
    .string()
    .trim()
    .min(3, "Iptal nedeni en az 3 karakter olmalidir."),
});

export const closeAsWarrantySchema = z.object({
  jobId: z.string().uuid(),
  warrantyNote: z
    .string()
    .trim()
    .min(3, "Garanti notu en az 3 karakter olmalidir."),
});

export const scoreObjectionSchema = z.object({
  jobId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Ä°tiraz nedenini en az 10 karakterle aÃ§Ä±klayÄ±n.")
    .max(500, "Ä°tiraz metni 500 karakteri geÃ§emez."),
});

export const reviewScoreObjectionSchema = z.object({
  jobId: z.string().uuid(),
  objectionLogId: z.string().uuid().optional(),
  reason: z
    .string()
    .trim()
    .min(10, "DÃ¼zenleme nedeni en az 10 karakter olmalÄ±.")
    .max(500, "DÃ¼zenleme notu 500 karakteri geÃ§emez."),
  q1_unit: scoreFieldSchema,
  q2_photos: scoreFieldSchema,
  q3_parts: scoreFieldSchema,
  q4_sub: scoreFieldSchema,
  q5_notify: scoreFieldSchema,
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export const CLOSEOUT_LATENCY_TARGET_P95_MS = 1500;

export const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  [JobStatus.KESIF]: [JobStatus.PLANLANDI, JobStatus.IPTAL],
  [JobStatus.PLANLANDI]: [JobStatus.DEVAM_EDIYOR, JobStatus.IPTAL],
  [JobStatus.DEVAM_EDIYOR]: [JobStatus.BEKLEMEDE, JobStatus.TAMAMLANDI, JobStatus.IPTAL],
  [JobStatus.BEKLEMEDE]: [JobStatus.DEVAM_EDIYOR, JobStatus.IPTAL],
  [JobStatus.TAMAMLANDI]: [JobStatus.KAPANDI, JobStatus.GARANTI],
  [JobStatus.KAPANDI]: [],
  [JobStatus.GARANTI]: [],
  [JobStatus.IPTAL]: [],
};

export function optionalString(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : undefined;
}

export function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export function hasAnsweredScore(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return false;
  }

  const numericValue = Number(raw);
  return Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 5;
}

export function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

export function isWithinObjectionWindow(date: Date | null | undefined) {
  if (!date) {
    return false;
  }

  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() <= thirtyDaysInMs;
}

export function revalidateAfterJobCreate() {
  revalidatePath("/jobs");
  revalidatePath("/");
  revalidatePath("/dispatch");
}

export function revalidateAfterStatusChange(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  revalidatePath("/my-jobs");
}

export function revalidateAfterFieldReport(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/my-jobs");
}

export function revalidateAfterCloseout(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/scoreboard");
  revalidatePath("/");
}

export function revalidateAfterHoldUpdate(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
}

export function revalidateAfterCancellation(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
}

export function revalidateAfterWarrantyClose(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}
