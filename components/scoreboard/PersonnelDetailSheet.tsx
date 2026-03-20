"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Award, Medal, ShieldCheck, Star } from "lucide-react";
import { BadgeType } from "@prisma/client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TechnicianScoreboardEntry } from "@/types";

type PersonnelDetailSheetProps = {
  entry: TechnicianScoreboardEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthLabel: string;
};

const badgeMeta: Record<
  BadgeType,
  { label: string; icon: typeof Star; tone: string }
> = {
  SERVIS_YILDIZI: {
    label: "Servis Yildizi",
    icon: Star,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  KALITE_USTASI: {
    label: "Kalite Ustasi",
    icon: ShieldCheck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  EKIP_OYUNCUSU: {
    label: "Ekip Oyuncusu",
    icon: Award,
    tone: "border-sky-200 bg-sky-50 text-sky-800",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PersonnelDetailSheet({
  entry,
  open,
  onOpenChange,
  monthLabel,
}: PersonnelDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[96vw] max-w-3xl overflow-y-auto bg-white p-0"
      >
        {entry ? (
          <>
            <SheetHeader className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="bg-marine-navy text-white">
                  <AvatarFallback className="bg-marine-navy text-white">
                    {getInitials(entry.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-xl text-marine-navy">
                    {entry.user.name}
                  </SheetTitle>
                  <SheetDescription>
                    {monthLabel} donemi detaylari ve is bazli puan breakdowni
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 px-6 py-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Toplam
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-marine-navy">
                    {entry.total.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Is puani
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-marine-navy">
                    {entry.jobScore.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Usta
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-marine-navy">
                    {entry.workshopScore?.toFixed(1) ?? "-"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Koordinator
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-marine-navy">
                    {entry.coordinatorScore?.toFixed(1) ?? "-"}
                  </div>
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-marine-navy">Bu ayin isleri</h3>
                {entry.jobs.length > 0 ? (
                  entry.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-marine-navy">{job.boatName}</div>
                          <div className="text-sm text-slate-600">{job.categoryName}</div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          {format(new Date(job.date), "dd MMM yyyy", { locale: tr })}
                        </div>
                      </div>
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {job.baseScore.toFixed(1)} baz puan x {job.multiplier.toFixed(1)} zorluk x{" "}
                        {job.roleMultiplier.toFixed(2)} rol ={" "}
                        <span className="font-semibold text-marine-navy">
                          {job.finalScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                          {job.role === "SORUMLU" ? "Sorumlu" : "Destek"}
                        </span>
                        {job.isKesif ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                            Retroaktif kesif puani
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                    Bu donem icin puana yansiyan kapali is bulunmuyor.
                  </div>
                )}
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-semibold text-marine-navy">
                    Usta aylik notu
                  </h3>
                  {entry.workshopEvaluation ? (
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <div className="font-medium">
                        Normalized score: {entry.workshopEvaluation.normalizedScore.toFixed(1)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entry.workshopEvaluation.questions.map((value, index) => (
                          <span
                            key={`workshop-${index}`}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                          >
                            S{index + 1}: {value}
                          </span>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        {entry.workshopEvaluation.notes?.trim() || "Not girilmemis."}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Degerlendirme bekleniyor
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-semibold text-marine-navy">
                    Koordinator aylik notu
                  </h3>
                  {entry.coordinatorEvaluation ? (
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <div className="font-medium">
                        Normalized score: {entry.coordinatorEvaluation.normalizedScore.toFixed(1)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entry.coordinatorEvaluation.questions.map((value, index) => (
                          <span
                            key={`coordinator-${index}`}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                          >
                            S{index + 1}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Degerlendirme bekleniyor
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-marine-navy">Bu ayki rozetler</h3>
                {entry.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {entry.badges.map((badge) => {
                      const meta = badgeMeta[badge.type];
                      const Icon = meta.icon;

                      return (
                        <div
                          key={badge.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${meta.tone}`}
                        >
                          <Icon className="size-4" />
                          <span>{meta.label}</span>
                          <Medal className="size-4 opacity-70" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                    Bu donem henuz rozet kazanilmamis.
                  </div>
                )}
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
