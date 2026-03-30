"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ScoreboardMonthOption } from "@/lib/scoreboard";

type ScoreboardPeriodPickerProps = {
  currentValue: string;
  options: ScoreboardMonthOption[];
};

export default function ScoreboardPeriodPicker({
  currentValue,
  options,
}: ScoreboardPeriodPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={currentValue}
      onChange={(event) => {
        const [year, month] = event.target.value.split("-");
        const params = new URLSearchParams(searchParams?.toString());
        params.set("year", year);
        params.set("month", String(Number(month)));
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="h-11 rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy outline-none transition-colors focus:border-marine-ocean focus:ring-2 focus:ring-marine-ocean/20"
      aria-label="Ay ve yıl seç"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
