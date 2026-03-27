import { HoldReason, JobRole, JobStatus, type Role } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { holdReasonOptions } from "@/lib/jobs";
import type { ServiceJobDetail, ServiceJobListItem } from "@/types";

export type RelatedOpenJob = Pick<ServiceJobListItem, "id" | "status" | "createdAt"> & {
  category: { name: string; subScope: string };
};

export type RecentBoatHistoryItem = {
  id: string;
  closedAt: Date | null;
  createdAt: Date;
  category: {
    name: string;
    subScope: string;
  };
  assignments: Array<{
    user: {
      name: string;
    };
  }>;
};

export type TimelineEntry = {
  label: string;
  description: string;
  date: Date;
};

export type JobDetailUser = ServiceJobDetail["assignments"][number]["user"];
export type JobDetailAssignment = ServiceJobDetail["assignments"][number];
export type JobDetailScore = ServiceJobDetail["jobScores"][number];
export type AppRole = Role;

export const secondaryLinkClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5";
export const primaryButtonClass = "h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean";
export const holdReasonLabelMap = new Map(
  holdReasonOptions.map((option) => [option.value, option.label] as const)
);
export const promptThreeActionStatuses: JobStatus[] = [
  JobStatus.KESIF,
  JobStatus.PLANLANDI,
  JobStatus.DEVAM_EDIYOR,
  JobStatus.BEKLEMEDE,
  JobStatus.TAMAMLANDI,
];

export function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return format(date, "dd MMM yyyy HH:mm", { locale: tr });
}

export function getInfoValue(value?: string | null) {
  return value && value.trim().length > 0 ? value : "Bilgi bekleniyor";
}

export function isWithinObjectionWindow(date: Date | null | undefined) {
  if (!date) {
    return false;
  }

  return Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
}

export function buildJobTimeline(job: ServiceJobDetail): TimelineEntry[] {
  return [
    {
      label: "Is olusturuldu",
      description: "Is sisteme kaydedildi.",
      date: job.createdAt,
    },
    job.plannedStartAt
      ? {
          label: "Planlandi",
          description: job.plannedEndAt
            ? `Planlanan pencere ${formatDateTime(job.plannedStartAt)} - ${formatDateTime(job.plannedEndAt)}`
            : "Servis icin planlanan baslangic kaydedildi.",
          date: job.plannedStartAt,
        }
      : null,
    (job.actualStartAt ?? job.startedAt)
      ? {
          label: "Saha calismasi basladi",
          description: "Teknisyen ekip goreve basladi.",
          date: job.actualStartAt ?? job.startedAt!,
        }
      : null,
    job.holdReason
      ? {
          label: "Is beklemeye alindi",
          description: `${holdReasonLabelMap.get(job.holdReason as HoldReason) ?? "Bekleme"}${
            job.holdUntil ? ` - hedef hatirlatma ${formatDateTime(job.holdUntil)}` : ""
          }`,
          date: job.updatedAt,
        }
      : null,
    (job.actualEndAt ?? job.completedAt)
      ? {
          label: "Is tamamlandi",
          description: "Operasyonel is adimlari bitirildi.",
          date: job.actualEndAt ?? job.completedAt!,
        }
      : null,
    job.deliveryReport
      ? {
          label: "Saha raporu gonderildi",
          description: "Teknisyen saha notlarini ve gorselleri sisteme aktardi.",
          date: job.deliveryReport.createdAt,
        }
      : null,
    job.evaluation
      ? {
          label: "Form 1 puanlama tamamlandi",
          description: `${job.evaluation.evaluator.name} tarafindan kaydedildi.`,
          date: job.evaluation.createdAt,
        }
      : null,
    job.closedAt
      ? {
          label: "Is kapatildi",
          description: "Puanlama sonrasi resmi kapanis yapildi.",
          date: job.closedAt,
        }
      : null,
  ].filter(Boolean) as TimelineEntry[];
}
