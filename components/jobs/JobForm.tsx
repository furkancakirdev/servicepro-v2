"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, ShieldCheck, UsersRound, Wrench } from "lucide-react";

import { createJobAction } from "@/app/(dashboard)/jobs/actions";
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
  boatTypeOptions,
  initialCreateJobFormState,
  type JobFormMeta,
} from "@/lib/jobs";
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
      {pending ? "Kaydediliyor..." : "??i kaydet"}
    </Button>
  );
}

export default function JobForm({ meta }: JobFormProps) {
  const [state, formAction] = useFormState(createJobAction, initialCreateJobFormState);
  const [boatNameInput, setBoatNameInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
  const [selectedSupportIds, setSelectedSupportIds] = useState<string[]>([]);

  const canSubmit = meta.categories.length > 0 && meta.technicians.length > 0;
  const matchedBoat = useMemo(() => {
    const normalizedBoatName = boatNameInput.trim().toLocaleLowerCase("tr");

    if (!normalizedBoatName) {
      return null;
    }

    return (
      meta.boats.find(
        (boat) => boat.name.trim().toLocaleLowerCase("tr") === normalizedBoatName
      ) ?? null
    );
  }, [boatNameInput, meta.boats]);
  const recommendedTechnicianIds = new Set(
    matchedBoat?.continuitySuggestions.map((suggestion) => suggestion.userId) ?? []
  );
  const recommendedTechnicians = meta.technicians.filter((technician) =>
    recommendedTechnicianIds.has(technician.id)
  );
  const otherTechnicians = meta.technicians.filter(
    (technician) => !recommendedTechnicianIds.has(technician.id)
  );

  function renderResponsibleOption(
    technician: JobFormMeta["technicians"][number],
    recommendationLabel?: string
  ) {
    const selected = selectedResponsibleId === technician.id;

    return (
      <label
        key={technician.id}
        className={cn(
          "cursor-pointer rounded-2xl border px-4 py-4 transition-all",
          selected
            ? "border-marine-navy bg-marine-navy text-white shadow-lg shadow-marine-navy/10"
            : "border-slate-200 bg-slate-50 hover:border-marine-ocean/40 hover:bg-white"
        )}
      >
        <input
          type="radio"
          name="responsibleId"
          value={technician.id}
          className="sr-only"
          checked={selected}
          onChange={() => {
            setSelectedResponsibleId(technician.id);
            setSelectedSupportIds((current) =>
              current.filter((item) => item !== technician.id)
            );
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{technician.name}</div>
            <div
              className={cn("text-sm", selected ? "text-white/80" : "text-slate-600")}
            >
              {recommendationLabel ?? "Sorumlu teknisyen"}
            </div>
          </div>
          {selected ? <Check className="size-5" /> : null}
        </div>
      </label>
    );
  }

  function renderSupportOption(
    technician: JobFormMeta["technicians"][number],
    recommendationLabel?: string
  ) {
    const checked = selectedSupportIds.includes(technician.id);
    const disabled = selectedResponsibleId === technician.id;

    return (
      <label
        key={technician.id}
        className={cn(
          "flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 transition-colors",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : checked
              ? "border-marine-ocean bg-marine-ocean/10 text-marine-navy"
              : "border-slate-200 bg-slate-50 hover:border-marine-ocean/40 hover:bg-white"
        )}
      >
        <div>
          <div className="font-medium">{technician.name}</div>
          <div className="text-sm">
            {disabled
              ? "Sorumlu secildigi icin destekte kullanilamaz"
              : recommendationLabel ?? "Destek personeli"}
          </div>
        </div>
        <input
          type="checkbox"
          name="supportIds"
          value={technician.id}
          className="size-4 rounded border-slate-300"
          checked={checked}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.checked) {
              setSelectedSupportIds((current) => [...current, technician.id]);
              return;
            }

            setSelectedSupportIds((current) =>
              current.filter((item) => item !== technician.id)
            );
          }}
        />
      </label>
    );
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
              Tekne, lokasyon ve irtibat bilgilerini ekleyip saha kaydini ba?latin.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="boatName">Tekne adi</Label>
              <Input
                id="boatName"
                name="boatName"
                value={boatNameInput}
                onChange={(event) => setBoatNameInput(event.target.value)}
                className="h-12"
                placeholder="M/V Bonita II"
                list="job-boat-suggestions"
                aria-invalid={Boolean(state.fieldErrors.boatName)}
              />
              <datalist id="job-boat-suggestions">
                {meta.boats.map((boat) => (
                  <option key={boat.id} value={boat.name}>
                    {boat.type}
                  </option>
                ))}
              </datalist>
              {state.fieldErrors.boatName ? (
                <p className="text-sm text-red-600">{state.fieldErrors.boatName}</p>
              ) : null}
              {matchedBoat?.continuitySuggestions.length ? (
                <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-3 text-sm text-slate-700">
                  <div className="font-medium text-marine-navy">Sureklilik onerisi</div>
                  <div className="mt-1">
                    {matchedBoat.continuitySuggestions
                      .slice(0, 3)
                      .map((suggestion) => suggestion.label)
                      .join(" | ")}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="boatType">Tekne tipi</Label>
              <select
                id="boatType"
                name="boatType"
                defaultValue={boatTypeOptions[0]}
                className={cn(
                  "h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors",
                  state.fieldErrors.boatType
                    ? "border-red-300 ring-2 ring-red-100"
                    : "focus:border-ring focus:ring-3 focus:ring-ring/50"
                )}
              >
                {boatTypeOptions.map((boatType) => (
                  <option key={boatType} value={boatType}>
                    {boatType}
                  </option>
                ))}
              </select>
              {state.fieldErrors.boatType ? (
                <p className="text-sm text-red-600">{state.fieldErrors.boatType}</p>
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
              <Label htmlFor="contactName">?rtibat kisisi</Label>
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
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-marine-navy">2. Kateg?ri ve kapsam</CardTitle>
            <CardDescription>
              Zorluk katsayisi kateg?ri secimiyle otomatik gelir ve puanlamada aynen
              kullanilir.
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
                      {category.brandHints ?? "Genel kateg?ri"}
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
                placeholder="Ariza semptomlarini, is kapsamindaki notlari ve teknisyenin sahada bilmesi gereken detaylari yazin..."
                aria-invalid={Boolean(state.fieldErrors.description)}
              />
              {state.fieldErrors.description ? (
                <p className="text-sm text-red-600">{state.fieldErrors.description}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">?? notlar</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                placeholder="Parca bekleniyor, ek ekipman gerekli, müşteri notu gibi operasyon detaylari..."
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
                    Garanti isi
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    ?? kaydi garanti kapsamindaysa puanlama ve takip akisi buna g?re
                    ayrilir.
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
                    Kesif kaydi olarak ac
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Ilk ziyaret sadece tespit amacliysa durum otomatik olarak
                    {" "}
                    &quot;Kesif&quot;
                    {" "}
                    acilir.
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
            <CardTitle className="flex items-center gap-2 text-marine-navy">
              <UsersRound className="size-5 text-marine-ocean" />
              3. Personel atama
            </CardTitle>
            <CardDescription>
              Sorumlu teknisyen ve destek ekibini aynı kayit ekranindan belirleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label>Sorumlu teknisyen</Label>
              {recommendedTechnicians.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Bu tekne icin son 90 gunde en sik g?revlendirilen teknisyenler once gosteriliyor.
                  </div>
                  <div className="grid gap-3">
                    {recommendedTechnicians.map((technician) =>
                      renderResponsibleOption(
                        technician,
                        matchedBoat?.continuitySuggestions.find(
                          (suggestion) => suggestion.userId === technician.id
                        )?.label ?? "Onerilen teknisyen"
                      )
                    )}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3">
                {otherTechnicians.map((technician) => renderResponsibleOption(technician))}
              </div>
              {state.fieldErrors.responsibleId ? (
                <p className="text-sm text-red-600">{state.fieldErrors.responsibleId}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label>Destek ekibi</Label>
              {recommendedTechnicians.length > 0 ? (
                <div className="grid gap-3">
                  {recommendedTechnicians.map((technician) =>
                    renderSupportOption(
                      technician,
                      matchedBoat?.continuitySuggestions.find(
                        (suggestion) => suggestion.userId === technician.id
                      )?.label ?? "Onerilen destek"
                    )
                  )}
                </div>
              ) : null}
              <div className="grid gap-3">
                {otherTechnicians.map((technician) => renderSupportOption(technician))}
              </div>
            </div>

            {state.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            {!canSubmit ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Kateg?ri veya teknisyen kaydi olmadigi icin yeni is acilamiyor.
              </div>
            ) : null}

            <SubmitButton disabled={!canSubmit} />

            <p className="text-sm leading-6 text-slate-600">
              Kayit olu?tuktan sonra detay sayfasindan durum gecisleri, bekletme
              nedenleri ve aynı tekne icin a??k is uyarilari yonetilir.
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

