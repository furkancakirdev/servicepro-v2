import { JobStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

export const statusConfig: Record<
  JobStatus,
  { label: string; className: string }
> = {
  KESIF: {
    label: "Keşif",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  PLANLANDI: {
    label: "Planlandı",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  DEVAM_EDIYOR: {
    label: "Devam Ediyor",
    className: "border-blue-300 bg-blue-100 text-blue-800",
  },
  BEKLEMEDE: {
    label: "Beklemede",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  TAMAMLANDI: {
    label: "Tamamlandı",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  KAPANDI: {
    label: "Kapandı",
    className: "border-green-300 bg-green-100 text-green-800",
  },
  GARANTI: {
    label: "Garanti",
    className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  },
  IPTAL: {
    label: "İptal",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function getStatusLabel(status: JobStatus) {
  return statusConfig[status].label;
}

export default function StatusBadge({ status }: { status: JobStatus }) {
  const current = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase",
        current.className
      )}
    >
      {current.label}
    </span>
  );
}
