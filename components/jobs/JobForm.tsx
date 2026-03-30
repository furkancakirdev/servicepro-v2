"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Check,
  ChevronsUpDown,
  Plus,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { createJobAction } from "@/app/(dashboard)/jobs/actions";
import BoatFormModal from "@/components/boats/BoatFormModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  initialCreateJobFormState,
  jobPriorityConfig,
  jobPriorityOptions,
  type JobPriority,
  type JobFormBoatOption,
  type JobFormMeta,
} from "@/lib/jobs";
import { useActionStateCompat } from "@/lib/use-action-state-compat";
import { cn } from "@/lib/utils";

type JobFormProps = {
  meta: JobFormMeta;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || pending}
      className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean"
    >
      {pending ? "Kaydediliyor..." : "İşi kaydet"}
    </Button>
  );
}

function buildBoatMetaLabel(boat: Pick<JobFormBoatOption, "type" | "homePort" | "flag">) {
  return [boat.type, boat.homePort, boat.flag].filter(Boolean).join(" - ");
}

export default function JobForm({ meta }: JobFormProps) {
  const [state, formAction] = useActionStateCompat(createJobAction, initialCreateJobFormState);
  const [boats, setBoats] = useState(meta.boats);
  const [selectedBoatId, setSelectedBoatId] = useState("");
  const [boatSearchQuery, setBoatSearchQuery] = useState("");
  const [isBoatPickerOpen, setIsBoatPickerOpen] = useState(false);
  const [isBoatModalOpen, setIsBoatModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<JobPriority>("NORMAL");
  const boatPickerRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = meta.categories.length > 0;
  const selectedBoat = useMemo(
    () => boats.find((boat) => boat.id === selectedBoatId) ?? null,
    [boats, selectedBoatId]
  );
  const filteredBoats = useMemo(() => {
    const normalizedQuery = boatSearchQuery.trim().toLocaleLowerCase("tr");

    if (!normalizedQuery) {
      return boats;
    }

    return boats.filter((boat) =>
      [
        boat.name,
        boat.type,
        boat.ownerName ?? "",
        boat.homePort ?? "",
        boat.flag ?? "",
      ].some((value) => value.toLocaleLowerCase("tr").includes(normalizedQuery))
    );
  }, [boatSearchQuery, boats]);

  useEffect(() => {
    if (!isBoatPickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!boatPickerRef.current?.contains(event.target as Node)) {
        setIsBoatPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isBoatPickerOpen]);

  function handleBoatCreated(boat: JobFormBoatOption) {
    setBoats((current) =>
      [...current.filter((item) => item.id !== boat.id), boat].sort(
        (left, right) =>
          right.jobCount - left.jobCount || left.name.localeCompare(right.name, "tr")
      )
    );
    setSelectedBoatId(boat.id);
    setBoatSearchQuery("");
  }

  return (
    <form
      action={formAction}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]"
    >
      <div className="space-y-6">
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-marine-navy">1. Tekne bilgileri</CardTitle>
            <CardDescription>
              Tekne, lokasyon ve irtibat bilgilerini ekleyip saha kaydını başlatın.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="boat-selector">Tekne</Label>
              <input type="hidden" name="boatId" value={selectedBoatId} />
              <div className="relative" ref={boatPickerRef}>
                <button
                  id="boat-selector"
                  type="button"
                  className={cn(
                    "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm outline-none transition-colors",
                    state.fieldErrors.boatId
                      ? "border-red-300 ring-2 ring-red-100"
                      : "border-input bg-transparent hover:border-marine-ocean/40 focus:border-ring focus:ring-3 focus:ring-ring/50"
                  )}
                  onClick={() => setIsBoatPickerOpen((current) => !current)}
                  aria-expanded={isBoatPickerOpen}
                  aria-haspopup="listbox"
                >
                  {selectedBoat ? (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-marine-navy">
                        {selectedBoat.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {buildBoatMetaLabel(selectedBoat) || "Kayıtlı tekne"}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">Kayıtlı tekne seçin</span>
                  )}
                  <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
                </button>

                {isBoatPickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-3">
                      <Input
                        value={boatSearchQuery}
                        onChange={(event) => setBoatSearchQuery(event.target.value)}
                        className="h-10"
                        placeholder="Tekne ara..."
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto p-2">
                      {filteredBoats.length > 0 ? (
                        filteredBoats.map((boat) => {
                          const selected = boat.id === selectedBoatId;

                          return (
                            <button
                              key={boat.id}
                              type="button"
                              className={cn(
                                "flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                                selected
                                  ? "bg-marine-navy text-white"
                                  : "hover:bg-slate-50"
                              )}
                              onClick={() => {
                                setSelectedBoatId(boat.id);
                                setBoatSearchQuery("");
                                setIsBoatPickerOpen(false);
                              }}
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium">{boat.name}</div>
                                <div
                                  className={cn(
                                    "mt-1 truncate text-xs",
                                    selected ? "text-white/80" : "text-slate-500"
                                  )}
                                >
                                  {buildBoatMetaLabel(boat) || boat.type}
                                </div>
                                {boat.ownerName ? (
                                  <div
                                    className={cn(
                                      "mt-1 truncate text-xs",
                                      selected ? "text-white/75" : "text-slate-400"
                                    )}
                                  >
                                    Sahip: {boat.ownerName}
                                  </div>
                                ) : null}
                              </div>
                              {selected ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-6 text-sm text-slate-500">
                          Aramanızla eşleşen tekne bulunamadı.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 p-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full justify-center gap-2"
                        onClick={() => {
                          setIsBoatPickerOpen(false);
                          setIsBoatModalOpen(true);
                        }}
                      >
                        <Plus className="size-4" />
                        Yeni Tekne Ekle
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {state.fieldErrors.boatId ? (
                <p className="text-sm text-red-600">{state.fieldErrors.boatId}</p>
              ) : null}

              <p className="text-sm text-slate-500">
                İş kaydı sadece rehberdeki teknelerle açılır. Listede yoksa önce tekne oluşturun.
              </p>

              {selectedBoat?.continuitySuggestions.length ? (
                <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-3 text-sm text-slate-700">
                  <div className="font-medium text-marine-navy">Süreklilik önerisi</div>
                  <div className="mt-1">
                    {selectedBoat.continuitySuggestions
                      .slice(0, 3)
                      .map((suggestion) => suggestion.label)
                      .join(" | ")}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasyon</Label>
              <Input
                id="location"
                name="location"
                className="h-12"
                placeholder="Yat Marin - F pontonu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">İrtibat kişisi</Label>
              <Input
                id="contactName"
                name="contactName"
                className="h-12"
                placeholder="Kaptan Marco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefon</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                className="h-12"
                placeholder="+90 555 010 11 22"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-3 text-sm text-slate-700">
                Planlama kuralı: operasyonun başlangıç ve tahmini bitiş zamanı birlikte
                girilir. Dispatch panosu bu iki bilgiyle zaman bloklarını oluşturur.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plannedStartDate">Planlanan başlangıç</Label>
              <Input
                id="plannedStartDate"
                name="plannedStartDate"
                type="datetime-local"
                className="h-12"
                aria-invalid={Boolean(state.fieldErrors.plannedStartDate)}
              />
              {state.fieldErrors.plannedStartDate ? (
                <p className="text-sm text-red-600">{state.fieldErrors.plannedStartDate}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDate">Tahmini bitiş</Label>
              <Input
                id="estimatedDate"
                name="estimatedDate"
                type="datetime-local"
                className="h-12"
                aria-invalid={Boolean(state.fieldErrors.estimatedDate)}
              />
              {state.fieldErrors.estimatedDate ? (
                <p className="text-sm text-red-600">{state.fieldErrors.estimatedDate}</p>
              ) : null}
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label>Öncelik</Label>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {jobPriorityOptions.map((priority) => {
                  const current = jobPriorityConfig[priority];
                  const selected = selectedPriority === priority;

                  return (
                    <label
                      key={priority}
                      className={cn(
                        "cursor-pointer rounded-2xl border px-4 py-4 transition-all",
                        selected
                          ? current.accentClassName
                          : "border-slate-200 bg-slate-50 hover:border-marine-ocean/40 hover:bg-white"
                      )}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={priority}
                        className="sr-only"
                        checked={selected}
                        onChange={() => setSelectedPriority(priority)}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-medium">
                            <span
                              className={cn(
                                "inline-flex size-2.5 rounded-full",
                                priority === "ACIL"
                                  ? "bg-rose-500"
                                  : priority === "YUKSEK"
                                    ? "bg-amber-500"
                                    : priority === "NORMAL"
                                      ? "bg-sky-500"
                                      : "bg-emerald-500"
                              )}
                            />
                            {current.label}
                          </div>
                          <p className="text-sm text-slate-600">
                            {priority === "ACIL"
                              ? "İlk planlamada öne çıkart."
                              : priority === "YUKSEK"
                                ? "Takvime üst sıralarda yerleştir."
                                : priority === "NORMAL"
                                  ? "Standart operasyon akışı."
                                  : "Müsait pencereye planlanabilir."}
                          </p>
                        </div>
                        {selected ? <Check className="size-4 shrink-0" /> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
              {state.fieldErrors.priority ? (
                <p className="text-sm text-red-600">{state.fieldErrors.priority}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-marine-navy">2. Kategori ve kapsam</CardTitle>
            <CardDescription>
              Zorluk katsayısı kategori seçimiyle otomatik gelir ve puanlamada aynen
              kullanılır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {meta.categories.map((category) => {
                const selected = selectedCategoryId === category.id;

                return (
                  <label
                    key={category.id}
                    className={cn(
                      "cursor-pointer rounded-[24px] border p-4 text-left transition-all",
                      selected
                        ? "border-marine-navy bg-marine-navy text-white shadow-lg shadow-marine-navy/10"
                        : "border-slate-200 bg-slate-50 hover:border-marine-ocean/40 hover:bg-white"
                    )}
                  >
                    <input
                      type="radio"
                      name="categoryId"
                      value={category.id}
                      className="sr-only"
                      checked={selected}
                      onChange={() => setSelectedCategoryId(category.id)}
                    />
                    <div
                      className={cn(
                        "text-xs font-semibold uppercase tracking-[0.18em]",
                        selected ? "text-white/80" : "text-marine-ocean"
                      )}
                    >
                      {category.brandHints ?? "Genel kategori"}
                    </div>
                    <div className="mt-2 text-base font-semibold">{category.name}</div>
                    <div
                      className={cn(
                        "mt-1 text-sm",
                        selected ? "text-white/85" : "text-slate-600"
                      )}
                    >
                      {category.subScope}
                    </div>
                    <div
                      className={cn(
                        "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                        selected ? "bg-white/15 text-white" : "bg-marine-navy text-white"
                      )}
                    >
                      x{category.multiplier.toFixed(1)}
                    </div>
                  </label>
                );
              })}
            </div>
            {state.fieldErrors.categoryId ? (
              <p className="text-sm text-red-600">{state.fieldErrors.categoryId}</p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                name="description"
                className="min-h-[144px]"
                placeholder="Arıza semptomlarını, iş kapsamındaki notları ve teknisyenin sahada bilmesi gereken detayları yazın..."
                aria-invalid={Boolean(state.fieldErrors.description)}
              />
              {state.fieldErrors.description ? (
                <p className="text-sm text-red-600">{state.fieldErrors.description}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">İş notları</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                placeholder="Parça bekleniyor, ek ekipman gerekli, müşteri notu gibi operasyon detayları..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-marine-ocean/40 hover:bg-white">
                <input
                  type="checkbox"
                  name="isWarranty"
                  className="mt-1 size-4 rounded border-slate-300"
                />
                <div>
                  <div className="flex items-center gap-2 font-medium text-marine-navy">
                    <ShieldCheck className="size-4 text-marine-ocean" />
                    Garanti işi
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    İş kaydı garanti kapsamındaysa puanlama ve takip akışı buna göre ayrılır.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-marine-ocean/40 hover:bg-white">
                <input
                  type="checkbox"
                  name="isKesif"
                  className="mt-1 size-4 rounded border-slate-300"
                />
                <div>
                  <div className="flex items-center gap-2 font-medium text-marine-navy">
                    <Wrench className="size-4 text-marine-ocean" />
                    Keşif kaydı olarak aç
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    İlk ziyaret sadece tespit amaçlıysa durum otomatik olarak{" "}
                    &quot;Keşif&quot; açılır.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-marine-navy">3. Kayıt özeti</CardTitle>
            <CardDescription>
              İşler tekne bazlı havuza düşer. Ekip ataması saha teslim formunda geriye dönük
              olarak teknisyen tarafından bildirilir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-4 text-sm leading-7 text-slate-700">
              Koordinatör sadece tekneyi, kategoriyi ve operasyon penceresini planlar. İşi
              sahada kim tamamladıysa, teslim raporu anında{" "}
              <span className="font-medium text-marine-navy">Sorumlu</span> ve{" "}
              <span className="font-medium text-marine-navy">Destek</span> seçimlerini yaparak
              kaydı geriye dönük netleştirir.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Havuz mantığı sayesinde sabah sabit atama zorunluluğu ortadan kalkar. İş ilk
              etapta atamasız açılır ve detay sayfasından başlatılır.
            </div>

            {state.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            {!canSubmit ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Aktif kategori kaydı olmadığı için yeni iş açılamıyor.
              </div>
            ) : null}

            <SubmitButton disabled={!canSubmit} />

            <p className="text-sm leading-6 text-slate-600">
              Kayıt oluştuktan sonra detay sayfasından durum geçişleri, bekletme nedenleri
              ve aynı tekne için açık iş uyarıları yönetilir.
            </p>
          </CardContent>
        </Card>
      </div>

      <BoatFormModal
        open={isBoatModalOpen}
        onOpenChange={setIsBoatModalOpen}
        onCreated={handleBoatCreated}
        title="Yeni tekne ekle"
        description="Rehbere yeni tekne ekleyin. Kayıt tamamlanınca iş formunda otomatik seçilir."
      />
    </form>
  );
}
