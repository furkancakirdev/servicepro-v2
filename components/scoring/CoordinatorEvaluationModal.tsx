"use client";

import RatingScale from "@/components/scoring/RatingScale";
import { Button } from "@/components/ui/button";

type EvaluationDraft = {
  q1_unit: number | null;
  q2_photos: number | null;
  q3_parts: number | null;
  q4_sub: number | null;
  q5_notify: number | null;
};

type FieldReportView = {
  unitInfo: string;
  partsUsed?: string;
  hasSubcontractor: boolean;
  subcontractorDetails?: string;
  notes?: string;
  photos: {
    before?: string;
    after?: string;
    details: string[];
  };
};

type CoordinatorEvaluationModalProps = {
  open: boolean;
  multiplier: number;
  report: FieldReportView;
  value: EvaluationDraft;
  canSubmit: boolean;
  error?: string | null;
  onClose: () => void;
  onChange: (value: EvaluationDraft) => void;
};

function PhotoTile({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
    >
      <div
        className="h-32 w-full bg-cover bg-center transition-transform group-hover:scale-[1.02]"
        style={{ backgroundImage: `url("${url}")` }}
      />
      <div className="px-3 py-2 text-xs font-medium text-slate-600">{label}</div>
    </a>
  );
}

export default function CoordinatorEvaluationModal({
  open,
  multiplier,
  report,
  value,
  canSubmit,
  error,
  onClose,
  onChange,
}: CoordinatorEvaluationModalProps) {
  if (!open) {
    return null;
  }

  const answeredCount = [
    value.q1_unit,
    value.q2_photos,
    value.q3_parts,
    report.hasSubcontractor ? value.q4_sub : 5,
    value.q5_notify,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-marine-navy/95 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl space-y-6 rounded-[32px] border border-white/10 bg-marine-navy p-6 text-white shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-seafoam">
            Form 1
          </p>
          <h2 className="text-3xl font-semibold">Koordinatör Değerlendirmesi</h2>
          <p className="max-w-4xl text-sm leading-7 text-slate-200">
            Aşağıdaki saha raporu teknisyen tarafından gönderildi. Önce raporu inceleyin,
            ardından 5 kriterin puanlamasını verip işi kapatın.
          </p>
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            x{multiplier.toFixed(1)} zorluk çarpanı uygulanacak
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-marine-seafoam">
                Saha raporu
              </div>
              <div className="mt-3 grid gap-4">
                <div className="rounded-2xl border border-slate-200/20 bg-black/10 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Ünite bilgisi
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">
                    {report.unitInfo || "Bilgi girilmemiş."}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/20 bg-black/10 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Parça / malzeme listesi
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">
                    {report.partsUsed || "Parça listesi girilmemiş."}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/20 bg-black/10 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Taşeron bilgisi
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">
                    {report.hasSubcontractor
                      ? report.subcontractorDetails || "Taşeron seçili ancak detay girilmemiş."
                      : "Bu işte taşeron kullanılmadı."}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/20 bg-black/10 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Ek saha notları
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">
                    {report.notes || "Ek not bulunmuyor."}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-marine-seafoam">
                Görseller
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {report.photos.before ? <PhotoTile label="Önce" url={report.photos.before} /> : null}
                {report.photos.after ? <PhotoTile label="Sonra" url={report.photos.after} /> : null}
                {report.photos.details.map((url, index) => (
                  <PhotoTile key={`${url}-${index}`} label={`Detay ${index + 1}`} url={url} />
                ))}
                {!report.photos.before && !report.photos.after && report.photos.details.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/20 px-4 py-8 text-sm text-slate-300">
                    Görsel bulunmuyor.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="rounded-[24px] border border-white/10 bg-black/10 px-4 py-4 text-sm text-slate-200">
              {answeredCount}/5 soru yanıtlandı. Tüm puanlar tamamlandığında iş kapanır.
            </div>

            <RatingScale
              label="S1 - Ünite bilgileri"
              description="Raporlanan ünite bilgisi operasyonel olarak yeterli mi?"
              value={value.q1_unit}
              onChange={(q1_unit) => onChange({ ...value, q1_unit })}
              anchors={["1 - Yetersiz", "3 - Kısmi", "5 - Tam ve net"]}
            />

            <RatingScale
              label="S2 - Fotoğraf kalitesi"
              description="Görseller işi doğrulayacak netlikte ve kapsamda mı?"
              value={value.q2_photos}
              onChange={(q2_photos) => onChange({ ...value, q2_photos })}
              anchors={["1 - Yetersiz", "3 - Kısmi", "5 - Net ve yeterli"]}
            />

            <RatingScale
              label="S3 - Parça / malzeme listesi"
              description="Parça ve sarf listesi muhasebe/operasyon için yeterli mi?"
              value={value.q3_parts}
              onChange={(q3_parts) => onChange({ ...value, q3_parts })}
              anchors={["1 - Eksik", "3 - Kısmi", "5 - Tam liste"]}
            />

            <RatingScale
              label="S4 - Taşeron / dış tedarikçi"
              description={
                report.hasSubcontractor
                  ? "Taşeron bilgisi ve kapsam açık mı?"
                  : "Bu işte taşeron yok. Soru otomatik 5 kabul edilir."
              }
              value={report.hasSubcontractor ? value.q4_sub : 5}
              onChange={(q4_sub) => onChange({ ...value, q4_sub })}
              anchors={["1 - Eksik", "3 - Kısmi", "5 - N/A veya tam kayıt"]}
              disabled={!report.hasSubcontractor}
            />

            <RatingScale
              label="S5 - Kapanış iletisi / teslim netliği"
              description="Raporun kapanış netliği ve koordinasyon kalitesi yeterli mi?"
              value={value.q5_notify}
              onChange={(q5_notify) => onChange({ ...value, q5_notify })}
              anchors={["1 - Belirsiz", "3 - Orta", "5 - Net kapanış"]}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-black/10 p-5">
              <Button type="button" variant="outline" size="lg" onClick={onClose} className="h-12">
                Vazgeç
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
      </div>
    </div>
  );
}
