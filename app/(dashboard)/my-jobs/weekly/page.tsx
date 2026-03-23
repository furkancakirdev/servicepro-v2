import Link from "next/link";
import { CalendarRange } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
import { getMyJobsOverview } from "@/lib/my-jobs";

type MyJobsWeeklyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MyJobsWeeklyPage({
  searchParams,
}: MyJobsWeeklyPageProps) {
  const currentUser = await requireAppUser();
  const overview = await getMyJobsOverview(currentUser.id);
  const selectedDay = takeFirstValue(searchParams?.day);
  const activeDay =
    overview.weeklySummary.find((day) => day.dateValue === selectedDay) ??
    overview.weeklySummary.find((day) => day.isToday) ??
    overview.weeklySummary[0];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white px-5 py-6 shadow-panel sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-marine-ocean/10 text-marine-ocean">
            <CalendarRange className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
              Haftalik g?runum
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-marine-navy">Haftam</h1>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {overview.weeklySummary.map((day) => (
          <Link
            key={day.dateIso}
            href={`/my-jobs/weekly?day=${day.dateValue}`}
            className={`rounded-2xl border px-4 py-4 transition-colors ${
              day.dateValue === activeDay?.dateValue
                ? "border-marine-navy bg-marine-navy text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-marine-ocean/40"
            }`}
          >
            <div className="text-xs uppercase tracking-[0.16em] opacity-80">{day.label}</div>
            <div className="mt-3 text-2xl font-semibold">{day.count}</div>
            <div className="mt-1 text-sm opacity-80">is</div>
          </Link>
        ))}
      </div>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-marine-navy">
            {activeDay?.label} gunu ozeti
          </CardTitle>
          <CardDescription>
            Secili gun icin toplam {activeDay?.count ?? 0} is planli g?runuyor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeDay?.count ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Bu gunun detaylari bugünku isler ekraninda ilgili job kartlarina baglidir.
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              Secili gunde planlanmis is bulunmuyor.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

