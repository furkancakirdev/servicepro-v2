"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";

type FieldReportDraft = {
  unitInfo: string;
  responsibleId: string;
  supportIds: string[];
  partsUsed: string;
  hasSubcontractor: boolean;
  subcontractorDetails: string;
  notes: string;
};

type FieldReportPhotos = {
  before?: string;
  after?: string;
  details: string[];
};

type FieldCompletionModalProps = {
  open: boolean;
  boatName: string;
  categoryName: string;
  value: FieldReportDraft;
  photos: FieldReportPhotos;
  technicians: Array<{
    id: string;
    name: string;
  }>;
  uploading: boolean;
  isOnline: boolean;
  queuedCount: number;
  syncingQueue: boolean;
  error?: string | null;
  onChange: (value: FieldReportDraft) => void;
  onPhotoUpload: (file: File, type: "before" | "after" | "detail") => Promise<void>;
  onClose?: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

export default function FieldCompletionModal({
  open,
  boatName,
  categoryName,
  value,
  photos,
  technicians,
  uploading,
  isOnline,
  queuedCount,
  syncingQueue,
  error,
  onChange,
  onPhotoUpload,
  onClose,
  onSubmit,
  canSubmit,
}: FieldCompletionModalProps) {
  const [dictationTarget, setDictationTarget] = useState<"partsUsed" | "notes" | null>(null);
  const latestValueRef = useRef(value);
  const dictationTargetRef = useRef<"partsUsed" | "notes" | null>(null);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    dictationTargetRef.current = dictationTarget;
  }, [dictationTarget]);

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

  const {
    isSupported: isVoiceSupported,
    isListening,
    error: voiceError,
    start,
    stop,
  } = useVoiceDictation({
    lang: "tr-TR",
    onTranscript: (transcript) => {
      const target = dictationTargetRef.current;

      if (!target) {
        return;
      }

      const current = latestValueRef.current;
      onChange({
        ...current,
        [target]: transcript,
      });
    },
  });

  useEffect(() => {
    if (!isListening && dictationTargetRef.current) {
      setDictationTarget(null);
    }
  }, [isListening]);

  if (!open) {
    return null;
  }

  const completedSections = [
    value.responsibleId.trim().length > 0,
    value.unitInfo.trim().length > 0,
    Boolean(photos.before || photos.after || photos.details.length > 0),
    !value.hasSubcontractor || value.subcontractorDetails.trim().length > 0,
  ].filter(Boolean).length;

  function toggleDictation(target: "partsUsed" | "notes") {
    if (!isVoiceSupported) {
      return;
    }

    if (isListening) {
      stop();

      if (dictationTarget === target) {
        setDictationTarget(null);
        return;
      }
    }

    const baseText = target === "partsUsed" ? value.partsUsed : value.notes;
    const started = start(baseText);

    if (started) {
      setDictationTarget(target);
    }
  }

  function renderDictationButton(target: "partsUsed" | "notes") {
    const active = isListening && dictationTarget === target;

    return (
      <Button
        type="button"
        size="sm"
        variant={active ? "secondary" : "outline"}
        className="h-9 gap-2"
        onClick={() => toggleDictation(target)}
        disabled={!isVoiceSupported}
      >
        {active ? <Square className="size-4" /> : <Mic className="size-4" />}
        {active ? "Durdur" : "Sesli not"}
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-marine-navy/95 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="mx-auto w-full max-w-4xl space-y-6 rounded-[32px] border border-white/10 bg-marine-navy p-6 text-white shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-seafoam">
            Saha Raporu
          </p>
          <h2 className="text-3xl font-semibold">
            {boatName} / {categoryName}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-200">
            Bu ekran sadece saha verisi icindir. Fotograf, unite bilgisi, parca listesi ve
            saha notlarini hizlica girebilirsiniz.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <Progress value={(completedSections / 4) * 100}>
            <ProgressLabel className="text-white">Saha raporu ilerlemesi</ProgressLabel>
            <ProgressValue className="text-slate-200">
              {() => `${completedSections}/4 kritik alan hazir`}
            </ProgressValue>
          </Progress>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {!isOnline ? (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="size-4" />
              Internet baglantisi yok.
            </div>
            <p className="mt-1 text-amber-100/90">
              Gonder tusuna bastiginizda form cihaza kuyruklanir ve baglanti geri geldiginde
              otomatik olarak senkronize edilir.
            </p>
          </div>
        ) : null}

        {syncingQueue ? (
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
            Bekleyen saha raporlari gonderiliyor...
          </div>
        ) : null}

        {queuedCount > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
            Cihazda bekleyen saha raporu: {queuedCount}
          </div>
        ) : null}

        {!isVoiceSupported ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            Tarayiciniz sesli dikte ozelligini desteklemiyor. Chrome ve Safari tabanli
            guncel tarayicilarda mikrofonla not yazabilirsiniz.
          </div>
        ) : null}

        {voiceError ? (
          <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {voiceError}
          </div>
        ) : null}

        <div className="grid gap-5">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
                Isi yapan ekip
              </p>
              <p className="text-sm leading-6 text-slate-200">
                Isi kapatan ekip burada beyan edilir. Sorumlu teknisyen tek secilir, destek
                personeli gerekiyorsa eklenir.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium text-white">Sorumlu teknisyen</p>
                <div className="grid gap-3">
                  {technicians.map((technician) => {
                    const selected = value.responsibleId === technician.id;

                    return (
                      <button
                        key={`responsible-${technician.id}`}
                        type="button"
                        className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                          selected
                            ? "border-marine-seafoam bg-marine-seafoam/10 text-white"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25"
                        }`}
                        onClick={() =>
                          onChange({
                            ...value,
                            responsibleId: technician.id,
                            supportIds: value.supportIds.filter((item) => item !== technician.id),
                          })
                        }
                      >
                        <div className="font-medium">{technician.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                          {selected ? "Sorumlu secildi" : "Sorumlu olarak ata"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white">Destek ekibi</p>
                <div className="grid gap-3">
                  {technicians.map((technician) => {
                    const checked = value.supportIds.includes(technician.id);
                    const disabled = value.responsibleId === technician.id;

                    return (
                      <label
                        key={`support-${technician.id}`}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors ${
                          disabled
                            ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                            : checked
                              ? "border-marine-seafoam bg-marine-seafoam/10 text-white"
                              : "cursor-pointer border-white/10 bg-white/5 text-slate-200 hover:border-white/25"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{technician.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.12em]">
                            {disabled ? "Sorumlu secildigi icin pasif" : "Destek"}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="size-4 rounded border-white/30"
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => {
                            if (event.target.checked) {
                              onChange({
                                ...value,
                                supportIds: [...value.supportIds, technician.id],
                              });
                              return;
                            }

                            onChange({
                              ...value,
                              supportIds: value.supportIds.filter((item) => item !== technician.id),
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="unitInfo">
              Cihaz / unite bilgisi
            </label>
            <Textarea
              id="unitInfo"
              value={value.unitInfo}
              onChange={(event) => onChange({ ...value, unitInfo: event.target.value })}
              className="min-h-[120px] border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              placeholder="Model, seri numarasi, calisma saati ve sahada tespit edilen teknik bilgileri yazin..."
            />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
                Fotograf yukleme
              </p>
              <p className="text-sm leading-6 text-slate-200">
                En az bir saha gorseli ekleyin. Once, sonra ve detay kareleri tek tek
                gonderebilirsiniz.
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
                    {photos.before ? "✓ Once fotografi eklendi" : "+ Once fotografi"}
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
                    {photos.after ? "✓ Sonra fotografi eklendi" : "+ Sonra fotografi"}
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
                    ? `✓ Detay fotografi (${photos.details.length})`
                    : "+ Detay fotografi"}
                </div>
              </label>

              {uploading ? (
                <p className="text-xs text-slate-300">Fotograf yukleniyor...</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <label className="block text-sm font-medium text-white" htmlFor="partsUsed">
                  Degisen parcalar / malzemeler
                </label>
                {renderDictationButton("partsUsed")}
              </div>
              <Textarea
                id="partsUsed"
                value={value.partsUsed}
                onChange={(event) => onChange({ ...value, partsUsed: event.target.value })}
                className="min-h-[140px] border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                placeholder="Degisen parca, sarf malzeme ve varsa parca numaralarini yazin..."
              />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="mb-3 space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marine-seafoam">
                  Taseron / dis tedarikci
                </p>
                <p className="text-sm text-slate-200">
                  Bu iste taseron kullanildiysa firma ve kapsam bilgisini ekleyin.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={value.hasSubcontractor ? "outline" : "secondary"}
                  className="h-11"
                  onClick={() => onChange({ ...value, hasSubcontractor: false, subcontractorDetails: "" })}
                >
                  Kullanilmadi
                </Button>
                <Button
                  type="button"
                  variant={value.hasSubcontractor ? "secondary" : "outline"}
                  className="h-11"
                  onClick={() => onChange({ ...value, hasSubcontractor: true })}
                >
                  Kullanildi
                </Button>
              </div>

              {value.hasSubcontractor ? (
                <Textarea
                  value={value.subcontractorDetails}
                  onChange={(event) =>
                    onChange({ ...value, subcontractorDetails: event.target.value })
                  }
                  className="mt-3 min-h-[100px] border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  placeholder="Firma adi, yapilan is ve teslim edilen kapsam bilgisi..."
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <label className="block text-sm font-medium text-white" htmlFor="fieldNotes">
                Ek saha notlari
              </label>
              {renderDictationButton("notes")}
            </div>
            <Textarea
              id="fieldNotes"
              value={value.notes}
              onChange={(event) => onChange({ ...value, notes: event.target.value })}
              className="min-h-[120px] border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              placeholder="Bir sonraki ziyaret icin notlar, riskler veya koordinatörun bilmesi gereken detaylar..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-slate-200">
            Gonderimle birlikte is kaydi tamamlandi durumuna cekilir ve koordinatör
            puanlamasina hazir olur.
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={onClose} className="h-12">
              Vazgec
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="h-12 bg-white px-6 text-marine-navy hover:bg-slate-100"
            >
              Saha Raporunu Gonder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
