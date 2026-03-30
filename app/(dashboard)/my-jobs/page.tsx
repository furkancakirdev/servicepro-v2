import Link from "next/link";
import { ArrowRight, CalendarRange, Crown, MapPin } from "lucide-react";
import { Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getMyJobsOverview } from "@/lib/my-jobs";

function getPoolRoleLabel(role: "SORUMLU" | "DESTEK" | null) {
  if (role === "SORUMLU") {
    return "Sorumlu";
  }

  if (role === "DESTEK") {
    return "Destek";
  }

  return "Havuz";
}

export default async function MyJobsPage() {
  const currentUser = await requireRoles([Role.TECHNICIAN]);
  const overview = await getMyJobsOverview(currentUser.id);
  const dominantTab = overview.todayJobs[0]?.dispatchTab ?? "YATMARIN";

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white px-5 py-6 shadow-panel sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
              Açık İş Havuzu
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-marine-navy">
              {currentUser.name} | Bugün {overview.todayJobs.length} iş | {dominantTab}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Teknisyenler günlük açık iş havuzunu birlikte görür. İşi sahada tamamlayan ekip,
              teslim raporu anında sorumlu ve destek rollerini geriye dönük bildirir.
            </p>
          </div>
          <Link
            href="/my-jobs/weekly"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-marine-ocean/20 bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5"
          >
            <CalendarRange className="size-4" />
            Haftalık havuz
          </Link>
        </div>
      </section>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-marine-navy">Hafta özeti</CardTitle>
          <CardDescription>
            Pazartesi - Cumartesi açık iş havuzu. Bugün vurgulu gösterilir.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {overview.weeklySummary.map((day) => (
            <Link
              key={day.dateIso}
              href={`/my-jobs/weekly?day=${day.dateValue}`}
              className={`rounded-2xl border px-4 py-4 transition-colors ${
                day.isToday
                  ? "border-marine-navy bg-marine-navy text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-marine-ocean/40 hover:bg-white"
              }`}
            >
              <div className="text-xs uppercase tracking-[0.16em] opacity-75">{day.label}</div>
              <div className="mt-3 text-2xl font-semibold">{day.count}</div>
              <div className="mt-1 text-sm opacity-80">iş</div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {overview.todayJobs.length > 0 ? (
          overview.todayJobs.map((job) => (
            <Link
              key={job.id}
              href={`/my-jobs/${job.id}`}
              className="block rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel transition-transform hover:-translate-y-0.5 sm:px-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-marine-ocean">
                      {job.timeLabel}
                    </div>
                    {job.isVip ? (
                      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                        <Crown className="size-3.5" />
                        VIP
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-marine-navy">
                    {job.boatName}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{job.categoryName}</div>
                </div>
                <Badge variant="outline">
                  {getPoolRoleLabel(job.role)} | x{job.multiplier.toFixed(1)}
                </Badge>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-marine-ocean" />
                  {job.locationLabel}
                </div>
                <div className="inline-flex items-center gap-2 text-marine-navy">
                  Detay
                  <ArrowRight className="size-4" />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-600">
            Bugün için havuzda planlanmış aktif iş bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}
