import Link from "next/link";
import { CalendarDays, LayoutGrid } from "lucide-react";
import { Role } from "@prisma/client";

import DispatchBoard from "@/components/dispatch/DispatchBoard";
import DispatchPublishDialog from "@/components/dispatch/DispatchPublishDialog";
import { Button } from "@/components/ui/button";
import { getDispatchBoardData, type DispatchTab } from "@/lib/dispatch";
import { requireRoles } from "@/lib/auth";

type DispatchPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const tabOptions: Array<{ value: DispatchTab; label: string }> = [
  { value: "YATMARIN", label: "Yatmarin" },
  { value: "NETSEL", label: "Netsel" },
  { value: "SAHA", label: "Saha" },
];

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

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);

  const date = parseDispatchDate(takeFirstValue(searchParams?.date));
  const tab = takeFirstValue(searchParams?.tab);
  const selectedTab = tabOptions.some((option) => option.value === tab)
    ? (tab as DispatchTab)
    : "YATMARIN";
  const data = await getDispatchBoardData(date, selectedTab);
  const dateValue = data.dateValue;

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
              ERP Planlama
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-marine-navy">
              Dispatch Board
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Teknisyen atama, gunluk yogunluk ve saha cikislarini tek ekranda yonetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form method="get" className="flex items-center gap-3">
              <input type="hidden" name="tab" value={selectedTab} />
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marine-ocean" />
                <input
                  type="date"
                  name="date"
                  defaultValue={dateValue}
                  className="h-12 rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean/40 focus:ring-2 focus:ring-marine-ocean/10"
                />
              </div>
              <Button type="submit" variant="outline" className="h-12">
                Tarihi uygula
              </Button>
            </form>

            <Link href={`/dispatch/weekly?date=${dateValue}`} className="inline-flex">
              <Button variant="outline" className="h-12 gap-2">
                <LayoutGrid className="size-4" />
                Haftalik gorunum
              </Button>
            </Link>

            <DispatchPublishDialog
              dateIso={data.dateIso}
              planDateLabel={data.dateLabel}
              workshopTR={data.templates.workshopTR}
              workshopEN={data.templates.workshopEN}
              fieldTR={data.templates.fieldTR}
              fieldEN={data.templates.fieldEN}
              publishedPlans={data.publishedPlans}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabOptions.map((option) => {
            const isActive = option.value === selectedTab;

            return (
              <Link
                key={option.value}
                href={`/dispatch?date=${dateValue}&tab=${option.value}`}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-marine-navy bg-marine-navy text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-marine-ocean/40 hover:text-marine-navy"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <DispatchBoard data={data} />
    </div>
  );
}
