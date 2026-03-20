"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import RatingScale from "@/components/scoring/RatingScale";
import { Button } from "@/components/ui/button";

type EvaluationDraft = {
  q1_unit: number | null;
  q2_photos: number | null;
  q3_parts: number | null;
  q4_sub: number | null;
  q5_notify: number | null;
};

type ScoringModalProps = {
  open: boolean;
  multiplier: number;
  value: EvaluationDraft;
  hasSubcontractor: boolean;
  canSubmit: boolean;
  error?: string | null;
  onBack: () => void;
  onChange: (value: EvaluationDraft) => void;
};

export default function ScoringModal({
  open,
  multiplier,
  value,
  hasSubcontractor,
  canSubmit,
  error,
  onBack,
  onChange,
}: ScoringModalProps) {
  if (!open) {
    return null;
  }

  const answeredCount = [
    value.q1_unit,
    value.q2_photos,
    value.q3_parts,
    hasSubcontractor ? value.q4_sub : 5,
    value.q5_notify,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-marine-navy/95 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-5xl space-y-6 rounded-[32px] border border-white/10 bg-marine-navy p-6 text-white shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-seafoam">
            Form 1
          </p>
          <h2 className="text-3xl font-semibold">Is Degerlendirmesi</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-200">
            Koordinator teslim raporunu okuyup ayni 5 kriter uzerinden puanlama yapar.
          </p>
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            x{multiplier.toFixed(1)} Zorluk - Puanlar bu katsayiyla carpilacak
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Progress value={answeredCount * 20}>
            <ProgressLabel className="text-white">Form 1 ilerlemesi</ProgressLabel>
            <ProgressValue className="text-slate-200">
              {() => `${answeredCount}/5 soru yanitlandi`}
            </ProgressValue>
          </Progress>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4">
          <RatingScale
            label="S1 - Unite Bilgileri"
            description="Teslim raporunda unite bilgileri eksiksiz ve tutarli mi?"
            value={value.q1_unit}
            onChange={(q1_unit) => onChange({ ...value, q1_unit })}
            anchors={[
              "1 - Ciddi eksik",
              "3 - Kismi yeterli",
              "5 - Tam ve tutarli",
            ]}
          />

          <RatingScale
            label="S2 - Servis Gorselleri"
            description="Gorseller teslim raporunu destekleyecek kadar acik ve yeterli mi?"
            value={value.q2_photos}
            onChange={(q2_photos) => onChange({ ...value, q2_photos })}
            anchors={[
              "1 - Yetersiz",
              "3 - Kismi yeterli",
              "5 - Once, sonra ve detay net",
            ]}
          />

          <RatingScale
            label="S3 - Parca / Malzeme Listesi"
            description="Malzeme ve parca listesi operasyonel kapanis icin yeterli mi?"
            value={value.q3_parts}
            onChange={(q3_parts) => onChange({ ...value, q3_parts })}
            anchors={[
              "1 - Yok",
              "3 - Ana kalemler var",
              "5 - Tam liste, detayli",
            ]}
          />

          <RatingScale
            label="S4 - Taseron / Dis Tedarikci"
            description={
              hasSubcontractor
                ? "Taseron kaydi ve kapsam bilgisi acik sekilde yazildi mi?"
                : "Bu iste taseron kullanilmadi. Soru otomatik olarak 5 kabul edilir."
            }
            value={hasSubcontractor ? value.q4_sub : 5}
            onChange={(q4_sub) => onChange({ ...value, q4_sub })}
            anchors={[
              "1 - Kayit yok",
              "3 - Kismi bilgi",
              "5 - N/A veya tam kayit",
            ]}
            disabled={!hasSubcontractor}
          />

          <RatingScale
            label="S5 - Musteri / Kaptan Bildirimi"
            description="Kapanis bildirimi profesyonel ve izlenebilir sekilde yapildi mi?"
            value={value.q5_notify}
            onChange={(q5_notify) => onChange({ ...value, q5_notify })}
            anchors={[
              "1 - Bildirim yok",
              "3 - Kismi takip var",
              "5 - Yazili ve net kapanis",
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Button type="button" variant="outline" size="lg" onClick={onBack} className="h-12">
            Teslim Raporuna Don
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="h-12 bg-white px-6 text-marine-navy hover:bg-slate-100"
          >
            Puanla ve Isi Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
