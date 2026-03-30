import Link from "next/link";
import { addDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, LayoutGrid, Rows3 } from "lucide-react";
import { Role } from "@prisma/client";

import DispatchBoard from "@/components/dispatch/DispatchBoard";
import DispatchPublishDialog from "@/components/dispatch/DispatchPublishDialog";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth";
import { getDispatchBoardData, type DispatchViewMode } from "@/lib/dispatch";

type DispatchPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDispatchDate(input?: string) {
  if (!input) {
    return startOfDay(new Date());
  }

  const parsed = parseISO(input);
  return isValid(parsed) ? startOfDay(parsed) : startOfDay(new Date());
}

function parseViewMode(input?: string): DispatchViewMode {
  return input === "weekly" ? "weekly" : "daily";
}

function buildDispatchHref(dateValue: string, view: DispatchViewMode) {
  return `/dispatch?date=${dateValue}&view=${view}`;
}

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);

  const date = parseDispatchDate(takeFirstValue(searchParams?.date));
  const viewMode = parseViewMode(takeFirstValue(searchParams?.view));
  const data = await getDispatchBoardData(date, viewMode);
  const todayValue = format(new Date(), "yyyy-MM-dd");
  const previousDate = format(addDays(date, viewMode === "daily" ? -1 : -7), "yyyy-MM-dd");
  const nextDate = format(addDays(date, viewMode === "daily" ? 1 : 7), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
              Operasyon Planlama
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-marine-navy">Is Dagitim Panosu</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Isleri sabit bolgeler altinda gun ve hafta bazinda planlayin, sonra tek WhatsApp
              mesaji olarak yayinlayin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form method="get" className="flex items-center gap-3">
              <input type="hidden" name="view" value={viewMode} />
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marine-ocean" />
                <input
                  type="date"
                  name="date"
                  defaultValue={data.dateValue}
                  className="h-12 rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean/40 focus:ring-2 focus:ring-marine-ocean/10"
                />
              </div>
              <Button type="submit" variant="outline" className="h-12">
                Tarihi uygula
              </Button>
            </form>

            <Link href={buildDispatchHref(todayValue, viewMode)} className="inline-flex">
              <Button variant="outline" className="h-12">
                Bugune git
              </Button>
            </Link>

            <DispatchPublishDialog
              dateIso={data.dateIso}
              planDateLabel={data.dateLabel}
              dailyTR={data.templates.dailyTR}
              dailyEN={data.templates.dailyEN}
              publishedPlans={data.publishedPlans}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link href={buildDispatchHref(data.dateValue, "daily")} className="inline-flex">
              <Button
                variant={viewMode === "daily" ? "default" : "outline"}
                className="h-11 gap-2"
              >
                <Rows3 className="size-4" />
                Gunluk
              </Button>
            </Link>
            <Link href={buildDispatchHref(data.dateValue, "weekly")} className="inline-flex">
              <Button
                variant={viewMode === "weekly" ? "default" : "outline"}
                className="h-11 gap-2"
              >
                <LayoutGrid className="size-4" />
                Haftalik
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={buildDispatchHref(previousDate, viewMode)} className="inline-flex">
              <Button variant="outline" className="h-11 gap-2">
                <ArrowLeft className="size-4" />
                Onceki {viewMode === "daily" ? "gun" : "hafta"}
              </Button>
            </Link>
            <Link href={buildDispatchHref(nextDate, viewMode)} className="inline-flex">
              <Button variant="outline" className="h-11 gap-2">
                Sonraki {viewMode === "daily" ? "gun" : "hafta"}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <DispatchBoard data={data} />
    </div>
  );
}
