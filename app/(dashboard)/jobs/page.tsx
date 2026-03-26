import Link from "next/link";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { JobStatus } from "@prisma/client";

import { getJobFilterOptions, getJobs } from "@/app/(dashboard)/jobs/actions";
import { takeFirstValue } from "@/components/jobs/detail/shared";
import JobList from "@/components/jobs/JobList";
import { getStatusLabel } from "@/components/jobs/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAppUser } from "@/lib/auth";
import {
  getJobDateFieldLabel,
  isJobDateField,
  isJobStatusGroup,
  type JobDateField,
  type JobStatusGroup,
} from "@/lib/jobs";
import { cn } from "@/lib/utils";

type JobsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const primaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean";
const filterInputClass =
  "h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean/40 focus:ring-2 focus:ring-marine-ocean/10";

function isJobStatus(value?: string): value is JobStatus {
  return value ? Object.values(JobStatus).includes(value as JobStatus) : false;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  await requireAppUser();

  const rawStatus = takeFirstValue(searchParams?.status);
  const rawStatusGroup = takeFirstValue(searchParams?.statusGroup);
  const rawDateField = takeFirstValue(searchParams?.dateField);
  const pendingScoring = takeFirstValue(searchParams?.pendingScoring) === "1";
  const currentStatus = isJobStatus(rawStatus) ? rawStatus : undefined;
  const currentStatusGroup = isJobStatusGroup(rawStatusGroup) ? rawStatusGroup : undefined;
  const currentDateField = isJobDateField(rawDateField) ? rawDateField : "createdAt";
  const query = takeFirstValue(searchParams?.q) ?? "";
  const technicianId = takeFirstValue(searchParams?.technicianId) ?? "";
  const startDate = takeFirstValue(searchParams?.startDate) ?? "";
  const endDate = takeFirstValue(searchParams?.endDate) ?? "";
  const currentPage = Math.max(1, Number.parseInt(takeFirstValue(searchParams?.page) ?? "1", 10) || 1);
  const dateFieldLabel = getJobDateFieldLabel(currentDateField);

  const [jobResult, technicians] = await Promise.all([
    getJobs({
      status: currentStatus,
      statusGroup: currentStatusGroup,
      pendingScoring,
      query,
      technicianId: technicianId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dateField: currentDateField,
      page: currentPage,
    }),
    getJobFilterOptions(),
  ]);

  const buildJobsHref = ({
    status,
    statusGroup,
    pendingScoring: shouldFilterPendingScoring = false,
    dateField = currentDateField,
    page = 1,
  }: {
    status?: JobStatus;
    statusGroup?: JobStatusGroup;
    pendingScoring?: boolean;
    dateField?: JobDateField;
    page?: number;
  } = {}) => {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (technicianId) params.set("technicianId", technicianId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);
    if (statusGroup) params.set("statusGroup", statusGroup);
    if (shouldFilterPendingScoring) params.set("pendingScoring", "1");
    if (dateField !== "createdAt") params.set("dateField", dateField);
    if (page > 1) params.set("page", String(page));

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
            <h1 className="mt-2 text-2xl font-semibold text-marine-navy">Is Listesi</h1>
            <p className="mt-2 text-sm text-slate-600">
              Arama, {dateFieldLabel.toLowerCase()} ve teknisyen filtresiyle operasyon akisini
              yonetin.
            </p>
          </div>
          <Link href="/jobs/new" className={primaryLinkClass}>
            Yeni Is
          </Link>
        </div>

        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_180px_180px_220px_auto_auto]"
          method="get"
        >
          <input type="hidden" name="dateField" value={currentDateField} />

          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              defaultValue={query}
              className="h-12 pl-10"
              placeholder="Tekne adi, kategori veya aciklama ara"
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
            href={buildJobsHref()}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              !currentStatus && !currentStatusGroup && !pendingScoring
                ? "border-marine-navy bg-marine-navy text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
            )}
          >
            Tumu
          </Link>
          <Link
            href={buildJobsHref({ statusGroup: "ACTIVE" })}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              currentStatusGroup === "ACTIVE"
                ? "border-marine-navy bg-marine-navy text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
            )}
          >
            Aktif operasyon
          </Link>
          {Object.values(JobStatus).map((status) => (
            <Link
              key={status}
              href={buildJobsHref({ status })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                currentStatus === status &&
                  !(pendingScoring && status === JobStatus.TAMAMLANDI) &&
                  !currentStatusGroup
                  ? "border-marine-navy bg-marine-navy text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
              )}
            >
              {getStatusLabel(status)}
            </Link>
          ))}
          <Link
            href={buildJobsHref({
              status: JobStatus.TAMAMLANDI,
              pendingScoring: true,
            })}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              pendingScoring
                ? "border-marine-navy bg-marine-navy text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
            )}
          >
            Bekleyen puanlama
          </Link>
        </div>
      </div>

      <JobList
        jobs={jobResult.items}
        dateField={currentDateField}
        totalCount={jobResult.totalCount}
        page={jobResult.page}
        pageSize={jobResult.pageSize}
        totalPages={jobResult.totalPages}
        buildPageHref={(page) => buildJobsHref({ status: currentStatus, statusGroup: currentStatusGroup, pendingScoring, dateField: currentDateField, page })}
      />
    </div>
  );
}
