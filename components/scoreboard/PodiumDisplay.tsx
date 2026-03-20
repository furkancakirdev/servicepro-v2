import { Award, Medal, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TechnicianScoreboardEntry } from "@/types";

type PodiumDisplayProps = {
  entries: TechnicianScoreboardEntry[];
};

const toneMap = {
  1: {
    badge: "border-amber-200 bg-amber-100 text-amber-800",
    icon: Trophy,
    iconClassName: "text-amber-500",
    heightClassName: "md:pt-12",
  },
  2: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    icon: Medal,
    iconClassName: "text-slate-500",
    heightClassName: "md:pt-6",
  },
  3: {
    badge: "border-orange-200 bg-orange-100 text-orange-800",
    icon: Award,
    iconClassName: "text-orange-500",
    heightClassName: "md:pt-8",
  },
} as const;

export default function PodiumDisplay({ entries }: PodiumDisplayProps) {
  const first = entries[0] ?? null;
  const second = entries[1] ?? null;
  const third = entries[2] ?? null;
  const podium = [second, first, third].filter(Boolean) as TechnicianScoreboardEntry[];

  if (podium.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 md:items-end">
      <style>{`
        @keyframes podium-rise {
          from {
            opacity: 0;
            transform: translateY(32px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {podium.map((entry, index) => {
        const tone = toneMap[entry.rank as 1 | 2 | 3];
        const Icon = tone.icon;

        return (
          <Card
            key={entry.user.id}
            className={cn(
              "border-white/80 bg-white/95 shadow-panel",
              tone.heightClassName
            )}
            style={{
              animation: "podium-rise 0.65s ease-out both",
              animationDelay: `${index * 120}ms`,
            }}
          >
            <CardHeader className="items-start">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                  tone.badge
                )}
              >
                {entry.rank}. Sira
              </div>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Icon className={cn("size-5", tone.iconClassName)} />
                {entry.user.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div className="text-3xl font-semibold text-marine-navy">
                {entry.total.toFixed(1)}
              </div>
              <div>Bu ayin toplam puani</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                Is: {entry.jobScore.toFixed(1)} | Usta:{" "}
                {entry.workshopScore?.toFixed(1) ?? "Bekleniyor"} | Koor:{" "}
                {entry.coordinatorScore?.toFixed(1) ?? "Bekleniyor"}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
