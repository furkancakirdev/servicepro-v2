"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { calculateMonthlyBadgesAction } from "@/app/(dashboard)/settings/actions";

type MonthlyBadgeCalculatorProps = {
  defaultMonth: number;
  defaultYear: number;
};

export default function MonthlyBadgeCalculator({
  defaultMonth,
  defaultYear,
}: MonthlyBadgeCalculatorProps) {
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [isPending, startTransition] = useTransition();

  function handleBadgeCalc() {
    startTransition(async () => {
      try {
        const result = await calculateMonthlyBadgesAction(month, year);
        const winners = result.map((entry) => entry.winner).join(", ");

        toast.success(
          winners
            ? `Rozetler hesaplandı: ${winners}`
            : "Rozet hesabı tamamlandı, bu dönem için kazanan çıkmadı."
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Rozet hesaplanırken bir hata oluştu."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="badge-month"
            className="mb-2 block text-sm font-medium text-marine-navy"
          >
            Ay
          </label>
          <input
            id="badge-month"
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean"
          />
        </div>
        <div>
          <label
            htmlFor="badge-year"
            className="mb-2 block text-sm font-medium text-marine-navy"
          >
            Yıl
          </label>
          <input
            id="badge-year"
            type="number"
            min={2024}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleBadgeCalc}
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-marine-navy px-4 text-sm font-medium text-white transition-colors hover:bg-marine-ocean disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Rozetler hesaplanıyor..." : "Rozetleri Hesapla"}
      </button>
    </div>
  );
}
