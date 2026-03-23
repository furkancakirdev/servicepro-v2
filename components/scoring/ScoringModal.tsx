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
          <h2 className="text-3xl font-semibold">İş Değerlendirmesi</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-200">
            Koordinatör teslim raporunu okuyup aynı 5 kriter üzerinden puanlama yapar.
          </p>
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            x{multiplier.toFixed(1)} Zorluk - Puanlar bu katsayıyla çarpılacak
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Progress value={answeredCount * 20}>
            <ProgressLabel className="text-white">Form 1 ilerlemesi</ProgressLabel>
            <ProgressValue className="text-slate-200">
              {() => `${answeredCount}/5 soru yanıtlandı`}
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
            label="S1 - Ünite Bilgileri"
            description="Teslim raporunda ünite bilgileri eksiksiz ve tutarlı mı?"
            value={value.q1_unit}
            onChange={(q1_unit) => onChange({ ...value, q1_unit })}
            anchors={[
              "1 - Ciddi eksik",
              "3 - Kısmi yeterli",
              "5 - Tam ve tutarlı",
            ]}
          />

          <RatingScale
            label="S2 - Servis Görselleri"
            description="Görseller teslim raporunu destekleyecek kadar açık ve yeterli mi?"
            value={value.q2_photos}
            onChange={(q2_photos) => onChange({ ...value, q2_photos })}
            anchors={[
              "1 - Yetersiz",
              "3 - Kısmi yeterli",
              "5 - Önce, sonra ve detay net",
            ]}
          />

          <RatingScale
            label="S3 - Parça / Malzeme Listesi"
            description="Malzeme ve parça listesi operasyonel kapanış için yeterli mi?"
            value={value.q3_parts}
            onChange={(q3_parts) => onChange({ ...value, q3_parts })}
            anchors={[
              "1 - Yok",
              "3 - Ana kalemler var",
              "5 - Tam liste, detaylı",
            ]}
          />

          <RatingScale
            label="S4 - Taşeron / Dış Tedarikçi"
            description={
              hasSubcontractor
                ? "Taşeron kaydı ve kapsam bilgisi açık şekilde yazıldı mı?"
                : "Bu işte taşeron kullanılmadı. Soru otomatik olarak 5 kabul edilir."
            }
            value={hasSubcontractor ? value.q4_sub : 5}
            onChange={(q4_sub) => onChange({ ...value, q4_sub })}
            anchors={[
              "1 - Kayıt yok",
              "3 - Kısmi bilgi",
              "5 - N/A veya tam kayıt",
            ]}
            disabled={!hasSubcontractor}
          />

          <RatingScale
            label="S5 - Müşteri / Kaptan Bildirimi"
            description="Kapanış bildirimi profesyonel ve izlenebilir şekilde yapıldı mı?"
            value={value.q5_notify}
            onChange={(q5_notify) => onChange({ ...value, q5_notify })}
            anchors={[
              "1 - Bildirim yok",
              "3 - Kısmi takip var",
              "5 - Yazılı ve net kapanış",
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Button type="button" variant="outline" size="lg" onClick={onBack} className="h-12">
            Teslim Raporuna Dön
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="h-12 bg-white px-6 text-marine-navy hover:bg-slate-100"
          >
            Puanla ve İşi Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
