import Link from "next/link";
import { JobRole, JobStatus } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import JobCard from "@/components/jobs/JobCard";
import StatusBadge from "@/components/jobs/StatusBadge";
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

export default function JobList({ jobs }: { jobs: ServiceJobListItem[] }) {
  if (jobs.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center shadow-panel">
        <p className="text-lg font-semibold text-marine-navy">Filtreye uyan iş bulunamadı.</p>
        <p className="mt-2 text-sm text-slate-600">
          Arama kriterlerini temizleyip tekrar deneyin ya da yeni bir servis işi oluşturun.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Toplam <span className="font-semibold text-marine-navy">{jobs.length}</span> iş
          listeleniyor.
        </div>
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
              <TableHead className="px-4 py-4">Tarih</TableHead>
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
                    <div className="text-xs text-slate-500">İş #{job.jobNumber}</div>
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
                    {formatJobDate(job.createdAt)}
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
                        <Link href={`/jobs/${job.id}`} className={actionLinkClass}>
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
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </section>
  );
}

