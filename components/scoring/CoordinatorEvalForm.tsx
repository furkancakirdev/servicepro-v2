import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CoordinatorEvalForm() {
  return (
    <Card className="border-white/80 bg-white/95">
      <CardHeader>
        <CardTitle className="text-marine-navy">Koordinatör ayl?k değerlendirme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          Uyum, guvenlik, temsil ve ekip katkisi sorulari icin kabuk hazir.
        </div>
      </CardContent>
    </Card>
  );
}

