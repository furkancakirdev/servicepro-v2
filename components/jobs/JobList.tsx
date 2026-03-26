import Link from "next/link";
import { JobRole, JobStatus } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import JobCard from "@/components/jobs/JobCard";
import StatusBadge from "@/components/jobs/StatusBadge";
import {
  getJobDateFieldLabel,
  getJobDateValue,
  type JobDateField,
} from "@/lib/jobs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ServiceJobListItem } from "@/types";

const actionLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-marine-ocean/20 bg-white px-3 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5";
const paginationLinkClass =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5";

function getResponsibleLabel(job: ServiceJobListItem) {
  return (
    job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU)?.user.name ??
    job.assignments[0]?.user.name ??
    "Atama bekleniyor"
  );
}

function getSupportCount(job: ServiceJobListItem) {
  return job.assignments.filter((assignment) => assignment.role === JobRole.DESTEK).length;
}

function getSupportNames(job: ServiceJobListItem) {
  return job.assignments
    .filter((assignment) => assignment.role === JobRole.DESTEK)
    .map((assignment) => assignment.user.name)
    .join(", ");
}

function formatJobDate(date: Date) {
  return format(date, "dd MMM yyyy HH:mm", { locale: tr });
}

function getVisiblePages(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const windowStart = Math.max(2, page - 1);
  const windowEnd = Math.min(totalPages - 1, page + 1);
  const pages: Array<number | "ellipsis"> = [1];

  if (windowStart > 2) {
    pages.push("ellipsis");
  }

  for (let current = windowStart; current <= windowEnd; current += 1) {
    pages.push(current);
  }

  if (windowEnd < totalPages - 1) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}

type JobListProps = {
  jobs: ServiceJobListItem[];
  dateField: JobDateField;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  buildPageHref: (page: number) => string;
};

export default function JobList({
  jobs,
  dateField,
  totalCount,
  page,
  pageSize,
  totalPages,
  buildPageHref,
}: JobListProps) {
  const dateFieldLabel = getJobDateFieldLabel(dateField);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const visiblePages = getVisiblePages(page, totalPages);

  const pagination = totalPages > 1 ? (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <Link
        href={buildPageHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`${paginationLinkClass} aria-disabled:pointer-events-none aria-disabled:opacity-50`}
      >
        Önceki
      </Link>

      {visiblePages.map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
            ...
          </span>
        ) : (
          <Link
            key={entry}
            href={buildPageHref(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={`${paginationLinkClass} ${
              entry === page
                ? "border-marine-navy bg-marine-navy text-white hover:bg-marine-ocean hover:text-white"
                : ""
            }`}
          >
            {entry}
          </Link>
        )
      )}

      <Link
        href={buildPageHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`${paginationLinkClass} aria-disabled:pointer-events-none aria-disabled:opacity-50`}
      >
        Sonraki
      </Link>
    </div>
  ) : null;

  if (jobs.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center shadow-panel">
        <p className="text-lg font-semibold text-marine-navy">Filtreye uyan is bulunamadi.</p>
        <p className="mt-2 text-sm text-slate-600">
          Arama kriterlerini temizleyip tekrar deneyin ya da yeni bir servis isi olusturun.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Toplam <span className="font-semibold text-marine-navy">{totalCount}</span> isten{" "}
          <span className="font-semibold text-marine-navy">{rangeStart}</span>-
          <span className="font-semibold text-marine-navy">{rangeEnd}</span> arasi listeleniyor.
        </div>
        {pagination}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-panel lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/80">
              <TableHead className="px-4 py-4">Tekne</TableHead>
              <TableHead className="px-4 py-4">Kategori</TableHead>
              <TableHead className="px-4 py-4">Zorluk</TableHead>
              <TableHead className="px-4 py-4">Personel</TableHead>
              <TableHead className="px-4 py-4">Durum</TableHead>
              <TableHead className="px-4 py-4">{dateFieldLabel}</TableHead>
              <TableHead className="px-4 py-4">Lokasyon</TableHead>
              <TableHead className="px-4 py-4 text-right">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const supportCount = getSupportCount(job);
              const supportNames = getSupportNames(job);

              return (
                <TableRow key={job.id} className="border-slate-100">
                  <TableCell className="px-4 py-4">
                    <div className="font-medium text-marine-navy">{job.boat.name}</div>
                    <div className="text-xs text-slate-500">Is #{job.jobNumber}</div>
                    <div className="text-xs text-slate-500">{job.boat.type}</div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="font-medium text-slate-700">{job.category.name}</div>
                    <div className="text-xs text-slate-500">{job.category.subScope}</div>
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <DifficultyBadge multiplier={job.multiplier} />
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="font-medium text-slate-700">{getResponsibleLabel(job)}</div>
                    {supportCount > 0 ? (
                      <div className="text-xs text-slate-500">{supportNames}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="px-4 py-4 text-slate-600">
                    {formatJobDate(getJobDateValue(job, dateField))}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-slate-600">
                    {job.location ?? "Lokasyon bekleniyor"}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/jobs/${job.id}`} className={actionLinkClass}>
                        Detay
                      </Link>
                      {job.status === JobStatus.TAMAMLANDI ? (
                        <Link href={`/jobs/${job.id}?closeout=1`} className={actionLinkClass}>
                          Kapat
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:hidden">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} dateField={dateField} />
        ))}
      </div>

      {pagination ? <div className="flex justify-end">{pagination}</div> : null}
    </section>
  );
}
