import Link from "next/link";
import { Role } from "@prisma/client";
import { ClipboardCheck } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreboardEvaluationActionLink } from "@/types";

type ScoreBreakdownProps = {
  monthLabel: string;
  month: number;
  year: number;
  role: Role;
  missingWorkshopCount: number;
  missingCoordinatorCount: number;
  theoreticalMax: number;
  actions: ScoreboardEvaluationActionLink[];
};

function getPassiveEvaluationMessage(role: Role) {
  if (role === Role.TECHNICIAN) {
    return "Eksik değerlendirmeler yalnızca yönetici, atölye şefi ve koordinatör tarafından tamamlanabilir.";
  }

  return "Eksik değerlendirme görünmüyor.";
}

export default function ScoreBreakdown({
  monthLabel,
  month,
  year,
  role,
  missingWorkshopCount,
  missingCoordinatorCount,
  theoreticalMax,
  actions,
}: ScoreBreakdownProps) {
  const totalMissing = missingWorkshopCount + missingCoordinatorCount;

  return (
    <Card className="border-white/80 bg-white/95">
      <CardHeader>
        <CardTitle className="text-marine-navy">Ağırlık dağılımı</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
            Dönem
          </div>
          <div className="mt-2 font-medium text-marine-navy">{monthLabel}</div>
          <div className="mt-1 text-xs text-slate-500">
            Normalize iş puanı tavan ham değer: {theoreticalMax.toFixed(1)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>İş puanı</span>
            <span>%40</span>
          </div>
          <Progress value={40} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Usta değerlendirmesi</span>
            <span>%30</span>
          </div>
          <Progress value={30} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Koordinatör değerlendirmesi</span>
            <span>%30</span>
          </div>
          <Progress value={30} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Usta formu
            </div>
            <div className="mt-2 text-lg font-semibold text-amber-900">
              {missingWorkshopCount}
            </div>
            <div className="text-xs text-amber-800">personelde değerlendirme bekleniyor</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Koordinatör formu
            </div>
            <div className="mt-2 text-lg font-semibold text-amber-900">
              {missingCoordinatorCount}
            </div>
            <div className="text-xs text-amber-800">personelde değerlendirme bekleniyor</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-marine-navy">
                <ClipboardCheck className="size-4 text-marine-ocean" />
                Eksik değerlendirme aksiyonları
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {totalMissing > 0
                  ? `${month}/${year} döneminde toplam ${totalMissing} değerlendirme girdisi eksik.`
                  : getPassiveEvaluationMessage(role)}
              </div>
            </div>
          </div>

          {actions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Link key={action.key} href={action.href}>
                  <Button variant="outline" className="h-11 border-marine-ocean/20 bg-white">
                    {action.label} ({action.count})
                  </Button>
                </Link>
              ))}
            </div>
          ) : totalMissing > 0 ? (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-800">
              Bu eksikleri görüntülüyorsunuz, ancak tamamlama yetkisi sizde değil.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
