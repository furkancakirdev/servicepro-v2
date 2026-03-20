"use client";

import { cn } from "@/lib/utils";

type RatingScaleProps = {
  label: string;
  description: string;
  value: number | null;
  onChange: (value: number) => void;
  anchors: string[];
  disabled?: boolean;
};

export default function RatingScale({
  label,
  description,
  value,
  onChange,
  anchors,
  disabled = false,
}: RatingScaleProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
          {label}
        </p>
        <p className="text-base font-semibold text-white">{description}</p>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            disabled={disabled}
            onClick={() => onChange(score)}
            className={cn(
              "min-h-12 rounded-2xl border text-base font-semibold transition-all",
              disabled
                ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                : value === score
                  ? "border-white bg-white text-marine-navy shadow-lg shadow-black/20"
                  : "border-white/15 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
            )}
          >
            {score}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-3">
        {anchors.map((anchor) => (
          <div key={anchor} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            {anchor}
          </div>
        ))}
      </div>
    </div>
  );
}
