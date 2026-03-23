"use client";

import { useEffect } from "react";

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

type DeliveryPhotos = {
  before?: string;
  after?: string;
  details: string[];
};

type DeliveryReportModalProps = {
  open: boolean;
  boatName: string;
  categoryName: string;
  value: DeliveryReportDraft;
  photos: DeliveryPhotos;
  uploading: boolean;
  onChange: (value: DeliveryReportDraft) => void;
  onPhotoUpload: (file: File, type: "before" | "after" | "detail") => Promise<void>;
  onClose?: () => void;
  onContinue: () => void;
};

export default function DeliveryReportModal({
  open,
  boatName,
  categoryName,
  value,
  photos,
  uploading,
  onChange,
  onPhotoUpload,
  onClose,
  onContinue,
}: DeliveryReportModalProps) {
  useEffect(() => {
    if (!open || !onClose) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

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
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-marine-navy/95 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6 rounded-[32px] border border-white/10 bg-marine-navy p-6 text-white shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-seafoam">
            Zorunlu Kapanış Akışı
          </p>
          <h2 className="text-3xl font-semibold">
            İş Teslim Raporu - {boatName} / {categoryName}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-200">
            Yanıtlarınız otomatik kaydedilir. İstediğiniz zaman çıkabilirsiniz.
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
            label="S1 - Ünite Bilgileri"
            description="Motor/cihaz modeli, seri numarası ve çalışma saati girildi mi?"
            value={value.unitInfoScore}
            onChange={(unitInfoScore) => onChange({ ...value, unitInfoScore })}
            anchors={[
              "1 - Hiç girilmedi",
              "3 - Kısmi bilgi",
              "5 - Tam bilgi ve çalışma saati",
            ]}
          />

          <RatingScale
            label="S2 - Servis Görselleri"
            description="Önce ve sonra fotoğraflar yüklendi mi?"
            value={value.photosScore}
            onChange={(photosScore) => onChange({ ...value, photosScore })}
            anchors={[
              "1 - Hiç yok",
              "3 - Önce veya sonra",
              "5 - Önce, sonra ve detay kareler",
            ]}
          />

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
                Fotoğraf Yükleme
              </p>
              <p className="text-sm leading-6 text-slate-200">
                Önce, sonra ve detay fotoğraflarını doğrudan bu formdan yükleyebilirsiniz.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onPhotoUpload(file, "before");
                      }
                    }}
                  />
                  <div
                    className={`flex h-20 items-center justify-center rounded-xl border text-sm ${
                      photos.before
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                        : "border-dashed border-white/25 text-slate-300"
                    }`}
                  >
                    {photos.before ? "✓ Önce" : "+ Önce"}
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onPhotoUpload(file, "after");
                      }
                    }}
                  />
                  <div
                    className={`flex h-20 items-center justify-center rounded-xl border text-sm ${
                      photos.after
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                        : "border-dashed border-white/25 text-slate-300"
                    }`}
                  >
                    {photos.after ? "✓ Sonra" : "+ Sonra"}
                  </div>
                </label>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void onPhotoUpload(file, "detail");
                    }
                  }}
                />
                <div
                  className={`flex h-16 items-center justify-center rounded-xl border text-sm ${
                    photos.details.length > 0
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                      : "border-dashed border-white/25 text-slate-300"
                  }`}
                >
                  {photos.details.length > 0
                    ? `✓ Detay (${photos.details.length})`
                    : "+ Detay Fotoğrafı"}
                </div>
              </label>

              {uploading ? (
                <p className="text-xs text-slate-300">Yükleniyor...</p>
              ) : null}
            </div>
          </div>

          <RatingScale
            label="S3 - Malzeme / Parça Listesi"
            description="Değiştirilen tüm parça ve malzemeler yazıldı mı?"
            value={value.partsListScore}
            onChange={(partsListScore) => onChange({ ...value, partsListScore })}
            anchors={[
              "1 - Hiç yazılmadı",
              "3 - Ana parçalar",
              "5 - Tam liste ve parça numaraları",
            ]}
          />

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
                S4 - Taşeron / Dış Tedarikçi
              </p>
              <p className="text-base font-semibold text-white">
                Bu işte taşeron veya dış tedarikçi kullanıldı mı?
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
                Hayır - otomatik 5 puan (N/A)
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
                Evet - firma ve kapsam kaydı gerekli
              </button>
            </div>

            {value.hasSubcontractor ? (
              <div className="mt-4">
                <RatingScale
                  label="S4 - Taşeron Detayı"
                  description="Firma bilgisi ve yapılan iş yazıldı mı?"
                  value={value.subcontractorScore}
                  onChange={(subcontractorScore) =>
                    onChange({ ...value, subcontractorScore })
                  }
                  anchors={[
                    "1 - Kayıt yok",
                    "3 - Kısmi bilgi",
                    "5 - Firma + kapsam tam girildi",
                  ]}
                />
              </div>
            ) : null}
          </div>

          <RatingScale
            label="S5 - Müşteri / Kaptan Bildirimi"
            description="Müşteri veya kaptan iş tamamlandığında bilgilendirildi mi?"
            value={value.clientNotifyScore}
            onChange={(clientNotifyScore) => onChange({ ...value, clientNotifyScore })}
            anchors={[
              "1 - Yapılmadı",
              "2 - Sadece sözlü",
              "5 - Yazılı rapor ve öneriler ile tamam",
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
              placeholder="Gerekli notlar, müşteriye iletilen aksiyonlar veya ek teknik açıklamalar..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-200">
            Devam etmek için 5 teslim raporu alanının tamamı doldurulmalıdır.
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
