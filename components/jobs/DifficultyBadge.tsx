import { Gauge } from "lucide-react";

import { getDifficultyStep } from "@/lib/categories";
import { cn } from "@/lib/utils";

const toneMap = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-red-200 bg-red-50 text-red-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

export default function DifficultyBadge({ multiplier }: { multiplier: number }) {
  const step = getDifficultyStep(multiplier);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        toneMap[step.tone]
      )}
    >
      <Gauge className="size-3.5" />
      x{multiplier.toFixed(1)} - {step.label}
    </span>
  );
}
