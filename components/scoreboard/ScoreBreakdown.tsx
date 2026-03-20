import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScoreBreakdownProps = {
  monthLabel: string;
  missingWorkshopCount: number;
  missingCoordinatorCount: number;
  theoreticalMax: number;
};

export default function ScoreBreakdown({
  monthLabel,
  missingWorkshopCount,
  missingCoordinatorCount,
  theoreticalMax,
}: ScoreBreakdownProps) {
  return (
    <Card className="border-white/80 bg-white/95">
      <CardHeader>
        <CardTitle className="text-marine-navy">Agirlik dagilimi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
            Donem
          </div>
          <div className="mt-2 font-medium text-marine-navy">{monthLabel}</div>
          <div className="mt-1 text-xs text-slate-500">
            Normalize is puani tavan ham deger: {theoreticalMax.toFixed(1)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Is puani</span>
            <span>%40</span>
          </div>
          <Progress value={40} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Usta degerlendirmesi</span>
            <span>%30</span>
          </div>
          <Progress value={30} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Koordinator degerlendirmesi</span>
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
            <div className="text-xs text-amber-800">personelde degerlendirme bekleniyor</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Koordinator formu
            </div>
            <div className="mt-2 text-lg font-semibold text-amber-900">
              {missingCoordinatorCount}
            </div>
            <div className="text-xs text-amber-800">personelde degerlendirme bekleniyor</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
