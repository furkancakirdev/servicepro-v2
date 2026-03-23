import Link from "next/link";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { JobStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import JobList from "@/components/jobs/JobList";
import { getStatusLabel } from "@/components/jobs/StatusBadge";
import { Input } from "@/components/ui/input";
import { getJobFilterOptions, getJobs } from "@/app/(dashboard)/jobs/actions";
import { requireAppUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type JobsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const primaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean";
const filterInputClass =
  "h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean/40 focus:ring-2 focus:ring-marine-ocean/10";

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isJobStatus(value?: string): value is JobStatus {
  return value ? Object.values(JobStatus).includes(value as JobStatus) : false;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  await requireAppUser();

  const rawStatus = takeFirstValue(searchParams?.status);
  const currentStatus = isJobStatus(rawStatus) ? rawStatus : undefined;
  const query = takeFirstValue(searchParams?.q) ?? "";
  const technicianId = takeFirstValue(searchParams?.technicianId) ?? "";
  const startDate = takeFirstValue(searchParams?.startDate) ?? "";
  const endDate = takeFirstValue(searchParams?.endDate) ?? "";

  const [jobs, technicians] = await Promise.all([
    getJobs({
      status: currentStatus,
      query,
      technicianId: technicianId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    getJobFilterOptions(),
  ]);

  const buildStatusHref = (status?: JobStatus) => {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (technicianId) params.set("technicianId", technicianId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);

    const serialized = params.toString();
    return serialized ? `/jobs?${serialized}` : "/jobs";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
              Operasyon
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-marine-navy">İş Listesi</h1>
            <p className="mt-2 text-sm text-slate-600">
              Arama, tarih ve teknisyen filtresiyle aktif servis operasyonunu yonetin.
            </p>
          </div>
          <Link href="/jobs/new" className={primaryLinkClass}>
            Yeni İş
          </Link>
        </div>

        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_180px_180px_220px_auto_auto]"
          method="get"
        >
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              defaultValue={query}
              className="h-12 pl-10"
              placeholder="Tekne adi, kateg?ri veya açıklama ara"
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marine-ocean" />
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className={cn(filterInputClass, "w-full pl-10")}
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marine-ocean" />
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className={cn(filterInputClass, "w-full pl-10")}
            />
          </div>

          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marine-ocean" />
            <select
              name="technicianId"
              defaultValue={technicianId}
              className={cn(filterInputClass, "w-full pl-10")}
            >
              <option value="">Tum teknisyenler</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 bg-marine-navy px-5 text-white hover:bg-marine-ocean"
          >
            Filtrele
          </Button>

          <Link
            href="/jobs"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5"
          >
            Temizle
          </Link>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildStatusHref()}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              !currentStatus
                ? "border-marine-navy bg-marine-navy text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
            )}
          >
            Tum
          </Link>
          {Object.values(JobStatus).map((status) => (
            <Link
              key={status}
              href={buildStatusHref(status)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                currentStatus === status
                  ? "border-marine-navy bg-marine-navy text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
              )}
            >
              {getStatusLabel(status)}
            </Link>
          ))}
        </div>
      </div>

      <JobList jobs={jobs} />
    </div>
  );
}

