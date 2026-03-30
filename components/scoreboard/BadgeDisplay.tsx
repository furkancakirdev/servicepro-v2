import { Award, ShieldCheck, Star } from "lucide-react";
import { BadgeType } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreboardBadgeSummary } from "@/types";

type BadgeDisplayProps = {
  badgeSummary: ScoreboardBadgeSummary[];
};

const badgeMeta: Record<
  BadgeType,
  { label: string; icon: typeof Star; tone: string }
> = {
  SERVIS_YILDIZI: {
    label: "Servis Yıldızı",
    icon: Star,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  KALITE_USTASI: {
    label: "Kalite Ustası",
    icon: ShieldCheck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  EKIP_OYUNCUSU: {
    label: "Ekip Oyuncusu",
    icon: Award,
    tone: "border-sky-200 bg-sky-50 text-sky-800",
  },
};

export default function BadgeDisplay({ badgeSummary }: BadgeDisplayProps) {
  return (
    <Card className="border-white/80 bg-white/95">
      <CardHeader>
        <CardTitle className="text-marine-navy">Rozet görünümü</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        {badgeSummary.map((summary) => {
          const meta = badgeMeta[summary.type];
          const Icon = meta.icon;

          return (
            <div
              key={summary.type}
              className={`rounded-2xl border px-4 py-3 ${meta.tone}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-4" />
                <div className="font-medium">{meta.label}</div>
              </div>
              <div className="mt-2 text-xs leading-6">
                {summary.winners.length > 0
                  ? summary.winners
                      .map((winner) => `${winner.name} (${winner.score.toFixed(1)})`)
                      .join(", ")
                  : "Bu ay henüz kazanan yok."}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

