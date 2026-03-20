"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import RatingScale from "@/components/scoring/RatingScale";
import { Button } from "@/components/ui/button";

type DeliveryReportDraft = {
  unitInfoScore: number | null;
  photosScore: number | null;
  partsListScore: number | null;
  hasSubcontractor: boolean | null;
  subcontractorScore: number | null;
  clientNotifyScore: number | null;
  notes: string;
};

type DeliveryReportModalProps = {
  open: boolean;
  boatName: string;
  categoryName: string;
  value: DeliveryReportDraft;
  onChange: (value: DeliveryReportDraft) => void;
  onContinue: () => void;
};

export default function DeliveryReportModal({
  open,
  boatName,
  categoryName,
  value,
  onChange,
  onContinue,
}: DeliveryReportModalProps) {
  if (!open) {
    return null;
  }

  const answeredCount = [
    value.unitInfoScore,
    value.photosScore,
    value.partsListScore,
    value.hasSubcontractor === null
      ? null
      : value.hasSubcontractor
        ? value.subcontractorScore
        : 5,
    value.clientNotifyScore,
  ].filter(Boolean).length;

  const canContinue = answeredCount === 5;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-marine-navy/95 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-5xl space-y-6 rounded-[32px] border border-white/10 bg-marine-navy p-6 text-white shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-seafoam">
            Zorunlu Kapanis Akisi
          </p>
          <h2 className="text-3xl font-semibold">
            Is Teslim Raporu - {boatName} / {categoryName}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-200">
            Bu adim tamamlanmadan puanlama ekranina gecilemez. ESC veya dis alana
            tiklayarak kapatma devre disidir.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Progress value={answeredCount * 20}>
            <ProgressLabel className="text-white">Teslim raporu ilerlemesi</ProgressLabel>
            <ProgressValue className="text-slate-200">
              {() => `${answeredCount}/5 alan dolduruldu`}
            </ProgressValue>
          </Progress>
        </div>

        <div className="grid gap-4">
          <RatingScale
            label="S1 - Unite Bilgileri"
            description="Motor/cihaz modeli, seri numarasi ve calisma saati girildi mi?"
            value={value.unitInfoScore}
            onChange={(unitInfoScore) => onChange({ ...value, unitInfoScore })}
            anchors={[
              "1 - Hic girilmedi",
              "3 - Kismi bilgi",
              "5 - Tam bilgi ve calisma saati",
            ]}
          />

          <RatingScale
            label="S2 - Servis Gorselleri"
            description="Once ve sonra fotograflar yuklendi mi?"
            value={value.photosScore}
            onChange={(photosScore) => onChange({ ...value, photosScore })}
            anchors={[
              "1 - Hic yok",
              "3 - Once veya sonra",
              "5 - Once, sonra ve detay kareler",
            ]}
          />

          <RatingScale
            label="S3 - Malzeme / Parca Listesi"
            description="Degistirilen tum parca ve malzemeler yazildi mi?"
            value={value.partsListScore}
            onChange={(partsListScore) => onChange({ ...value, partsListScore })}
            anchors={[
              "1 - Hic yazilmadi",
              "3 - Ana parcalar",
              "5 - Tam liste ve parca numaralari",
            ]}
          />

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
                S4 - Taseron / Dis Tedarikci
              </p>
              <p className="text-base font-semibold text-white">
                Bu iste taseron veya dis tedarikci kullanildi mi?
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    hasSubcontractor: false,
                    subcontractorScore: 5,
                  })
                }
                className={`min-h-12 rounded-2xl border px-4 py-3 text-left transition-all ${
                  value.hasSubcontractor === false
                    ? "border-white bg-white text-marine-navy"
                    : "border-white/15 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
                }`}
              >
                Hayir - otomatik 5 puan (N/A)
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    hasSubcontractor: true,
                    subcontractorScore: value.subcontractorScore,
                  })
                }
                className={`min-h-12 rounded-2xl border px-4 py-3 text-left transition-all ${
                  value.hasSubcontractor
                    ? "border-white bg-white text-marine-navy"
                    : "border-white/15 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
                }`}
              >
                Evet - firma ve kapsam kaydi gerekli
              </button>
            </div>

            {value.hasSubcontractor ? (
              <div className="mt-4">
                <RatingScale
                  label="S4 - Taseron Detayi"
                  description="Firma bilgisi ve yapilan is yazildi mi?"
                  value={value.subcontractorScore}
                  onChange={(subcontractorScore) =>
                    onChange({ ...value, subcontractorScore })
                  }
                  anchors={[
                    "1 - Kayit yok",
                    "3 - Kismi bilgi",
                    "5 - Firma + kapsam tam girildi",
                  ]}
                />
              </div>
            ) : null}
          </div>

          <RatingScale
            label="S5 - Musteri / Kaptan Bildirimi"
            description="Musteri veya kaptan is tamamlandiginda bilgilendirildi mi?"
            value={value.clientNotifyScore}
            onChange={(clientNotifyScore) => onChange({ ...value, clientNotifyScore })}
            anchors={[
              "1 - Yapilmadi",
              "2 - Sadece sozlu",
              "5 - Yazili rapor ve oneriler ile tamam",
            ]}
          />

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="deliveryNotes">
              Ek notlar
            </label>
            <Textarea
              id="deliveryNotes"
              value={value.notes}
              onChange={(event) => onChange({ ...value, notes: event.target.value })}
              className="min-h-[120px] border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              placeholder="Gerekli notlar, musteriye iletilen aksiyonlar veya ek teknik aciklamalar..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-200">
            Devam etmek icin 5 teslim raporu alaninin tamami doldurulmalidir.
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            disabled={!canContinue}
            className="h-12 bg-white px-6 text-marine-navy hover:bg-slate-100"
          >
            Devam Et
          </Button>
        </div>
      </div>
    </div>
  );
}
