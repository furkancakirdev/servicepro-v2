import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWeeklyDispatchData } from "@/lib/dispatch";
import { requireRoles } from "@/lib/auth";

type WeeklyDispatchPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDispatchDate(input?: string) {
  if (!input) {
    return new Date();
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function WeeklyDispatchPage({
  searchParams,
}: WeeklyDispatchPageProps) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);

  const date = parseDispatchDate(takeFirstValue(searchParams?.date));
  const dateValue = format(date, "yyyy-MM-dd");
  const weekly = await getWeeklyDispatchData(date);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
            ERP Planlama
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-marine-navy">
            Haftalık İş Planı
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pazartesi - Cumartesi dagilimini ve ekip yukunu tek bakista kontrol edin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-marine-ocean/10 px-4 py-2 text-sm font-medium text-marine-ocean">
            <CalendarRange className="size-4" />
            {weekly.weekLabel}
          </div>
          <Link
            href={`/dispatch?date=${dateValue}&tab=YATMARIN`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-marine-ocean/20 bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5"
          >
            <ArrowLeft className="size-4" />
            Gunluk board
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {weekly.days.map((day) => (
            <Card key={day.dateIso} className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg text-marine-navy">{day.label}</CardTitle>
                <CardDescription>
                  {day.unassignedJobs.length} atanmamis is, {day.lanes.reduce((sum, lane) => sum + lane.jobCount, 0)} toplam atama
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {day.lanes.map((lane) => (
                  <div key={lane.userId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-marine-navy">{lane.name}</div>
                      <Badge variant="outline">{lane.jobCount}/{lane.maxCapacity}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {lane.jobs.length > 0 ? (
                        lane.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
                          >
                            <div className="font-medium text-marine-navy">{job.boatName}</div>
                            <div>{job.categoryName}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                              {job.locationLabel}
                            </div>
                          </div>
                        ))
                      ) : null}
                    </div>
                  </div>
                ))}

                {day.unassignedJobs.length > 0 ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <div className="font-medium text-rose-900">Atanmamis isler</div>
                    <div className="mt-2 space-y-2 text-sm text-rose-800">
                      {day.unassignedJobs.map((job) => (
                        <div key={job.id}>
                          {job.boatName} - {job.categoryName}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-marine-navy">Teknisyen yuk cubugu</CardTitle>
            <CardDescription>
              Haftalık toplam atama ve maksimum kapasite görünümü.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weekly.technicianLoads.map((load) => {
              const progress = Math.min((load.totalJobs / load.maxCapacity) * 100, 100);

              return (
                <div key={load.userId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-marine-navy">{load.name}</span>
                    <span className="text-slate-500">
                      {load.totalJobs}/{load.maxCapacity}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        progress >= 100
                          ? "bg-rose-500"
                          : progress >= 70
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
