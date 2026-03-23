"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  saveCoordinatorEvaluationsAction,
  saveWorkshopEvaluationsAction,
} from "@/app/(dashboard)/scoreboard/actions";
import {
  initialMonthlyEvaluationActionState,
  type MonthlyEvaluationActionState,
} from "@/app/(dashboard)/scoreboard/state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MonthlyEvaluationFormEntry } from "@/types";

type MonthlyEvaluationSheetProps = {
  mode: "workshop" | "coordinator";
  month: number;
  year: number;
  monthLabel: string;
  roster: MonthlyEvaluationFormEntry[];
};

type WorkshopRowState = {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  notes: string;
};

type CoordinatorRowState = {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  q5: number | null;
};

const workshopQuestions = [
  { key: "q1", label: "S1: Teknik yetkinlik" },
  { key: "q2", label: "S2: ?? disiplini" },
  { key: "q3", label: "S3: Gelisim" },
] as const;

const coordinatorQuestions = [
  { key: "q1", label: "S1: Direktife uyum" },
  { key: "q2", label: "S2: Guvenlik ozeni" },
  { key: "q3", label: "S3: Temsil kalitesi" },
  { key: "q4", label: "S4: Ekip katkisi" },
  { key: "q5", label: "S5: Gelisim istegi" },
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RatingButtons({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={cn(
            "flex h-10 min-w-10 items-center justify-center rounded-xl border text-sm font-semibold transition-all",
            value === score
              ? "border-marine-navy bg-marine-navy text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-marine-ocean hover:text-marine-navy"
          )}
        >
          {score}
        </button>
      ))}
    </div>
  );
}

function buildWorkshopRows(roster: MonthlyEvaluationFormEntry[]): WorkshopRowState[] {
  return roster.map((entry) => ({
    employeeId: entry.user.id,
    name: entry.user.name,
    avatarUrl: entry.user.avatarUrl,
    q1: entry.workshopEvaluation?.q1 ?? null,
    q2: entry.workshopEvaluation?.q2 ?? null,
    q3: entry.workshopEvaluation?.q3 ?? null,
    notes: entry.workshopEvaluation?.notes ?? "",
  }));
}

function buildCoordinatorRows(roster: MonthlyEvaluationFormEntry[]): CoordinatorRowState[] {
  return roster.map((entry) => ({
    employeeId: entry.user.id,
    name: entry.user.name,
    avatarUrl: entry.user.avatarUrl,
    q1: entry.coordinatorEvaluation?.q1 ?? null,
    q2: entry.coordinatorEvaluation?.q2 ?? null,
    q3: entry.coordinatorEvaluation?.q3 ?? null,
    q4: entry.coordinatorEvaluation?.q4 ?? null,
    q5: entry.coordinatorEvaluation?.q5 ?? null,
  }));
}

export default function MonthlyEvaluationSheet({
  mode,
  month,
  year,
  monthLabel,
  roster,
}: MonthlyEvaluationSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action =
    mode === "workshop" ? saveWorkshopEvaluationsAction : saveCoordinatorEvaluationsAction;
  const [actionState, formAction] = useFormState<MonthlyEvaluationActionState, FormData>(
    action,
    initialMonthlyEvaluationActionState
  );
  const [workshopRows, setWorkshopRows] = useState(() => buildWorkshopRows(roster));
  const [coordinatorRows, setCoordinatorRows] = useState(() => buildCoordinatorRows(roster));

  useEffect(() => {
    setWorkshopRows(buildWorkshopRows(roster));
    setCoordinatorRows(buildCoordinatorRows(roster));
  }, [roster]);

  useEffect(() => {
    if (!actionState.success) {
      return;
    }

    setOpen(false);
    router.refresh();
  }, [actionState.success, router]);

  const title =
    mode === "workshop"
      ? "Aylık Personel Değerlendirmesi"
      : "Koordinatör Değerlendirmesi";
  const description =
    mode === "workshop"
      ? "Form 2 - workshop chief ayl?k teknik ve disiplin değerlendirmesi"
      : "Form 3 - teknik koordinasyon davranissal ve operasyonel değerlendirme";
  const triggerLabel =
    mode === "workshop" ? "Usta Değerlendirmesi" : "Koordinatör Değerlendirmesi";

  const completion = useMemo(() => {
    if (mode === "workshop") {
      const completedRows = workshopRows.filter(
        (row) => row.q1 && row.q2 && row.q3
      ).length;

      return {
        completedRows,
        totalRows: workshopRows.length,
        isComplete: completedRows === workshopRows.length && workshopRows.length > 0,
        payload: JSON.stringify(
          workshopRows.map((row) => ({
            employeeId: row.employeeId,
            q1: row.q1,
            q2: row.q2,
            q3: row.q3,
            notes: row.notes,
          }))
        ),
      };
    }

    const completedRows = coordinatorRows.filter(
      (row) => row.q1 && row.q2 && row.q3 && row.q4 && row.q5
    ).length;

    return {
      completedRows,
      totalRows: coordinatorRows.length,
      isComplete: completedRows === coordinatorRows.length && coordinatorRows.length > 0,
      payload: JSON.stringify(
        coordinatorRows.map((row) => ({
          employeeId: row.employeeId,
          q1: row.q1,
          q2: row.q2,
          q3: row.q3,
          q4: row.q4,
          q5: row.q5,
        }))
      ),
    };
  }, [coordinatorRows, mode, workshopRows]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="lg"
            variant={mode === "workshop" ? "outline" : "default"}
            className={
              mode === "workshop"
                ? "h-11 border-marine-ocean/20 bg-white text-marine-navy hover:bg-marine-ocean/5"
                : "h-11 bg-marine-navy text-white hover:bg-marine-ocean"
            }
          />
        }
      >
        {triggerLabel}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[96vw] max-w-[1100px] overflow-y-auto bg-white p-0"
      >
        <form action={formAction}>
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="payload" value={completion.payload} />

          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle className="text-xl text-marine-navy">
              {title} - {monthLabel}
            </SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <ClipboardCheck className="size-4 text-marine-ocean" />
                {completion.completedRows}/{completion.totalRows} personel tamamlandi
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-marine-navy">
                {mode === "workshop" ? "Form 2" : "Form 3"}
              </div>
            </div>

            {actionState.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionState.error}
              </div>
            ) : null}

            {actionState.success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {actionState.updatedCount} personel icin değerlendirme kaydedildi.
              </div>
            ) : null}

            {mode === "workshop"
              ? workshopRows.map((row, rowIndex) => (
                  <div
                    key={row.employeeId}
                    className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="lg" className="bg-marine-navy text-white">
                        <AvatarFallback className="bg-marine-navy text-white">
                          {getInitials(row.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-marine-navy">{row.name}</div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Technician
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {workshopQuestions.map((question) => {
                        return (
                          <div
                            key={`${row.employeeId}-${question.key}`}
                            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center"
                          >
                            <div className="text-sm font-medium text-marine-navy">
                              {question.label}
                            </div>
                            <RatingButtons
                              value={row[question.key]}
                              onChange={(value) =>
                                setWorkshopRows((current) =>
                                  current.map((item, currentIndex) =>
                                    currentIndex === rowIndex
                                      ? { ...item, [question.key]: value }
                                      : item
                                  )
                                )
                              }
                            />
                          </div>
                        );
                      })}

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <label
                          htmlFor={`notes-${row.employeeId}`}
                          className="block text-sm font-medium text-marine-navy"
                        >
                          Not
                        </label>
                        <Textarea
                          id={`notes-${row.employeeId}`}
                          value={row.notes}
                          onChange={(event) =>
                            setWorkshopRows((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === rowIndex
                                  ? { ...item, notes: event.target.value }
                                  : item
                              )
                            )
                          }
                          className="mt-3 min-h-[90px] bg-white"
                          placeholder="Opsiyonel ayl?k not..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              : coordinatorRows.map((row, rowIndex) => (
                  <div
                    key={row.employeeId}
                    className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="lg" className="bg-marine-navy text-white">
                        <AvatarFallback className="bg-marine-navy text-white">
                          {getInitials(row.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-marine-navy">{row.name}</div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Technician
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {coordinatorQuestions.map((question) => {
                        return (
                          <div
                            key={`${row.employeeId}-${question.key}`}
                            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center"
                          >
                            <div className="text-sm font-medium text-marine-navy">
                              {question.label}
                            </div>
                            <RatingButtons
                              value={row[question.key]}
                              onChange={(value) =>
                                setCoordinatorRows((current) =>
                                  current.map((item, currentIndex) =>
                                    currentIndex === rowIndex
                                      ? { ...item, [question.key]: value }
                                      : item
                                  )
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-1 pt-4 backdrop-blur">
              <div className="text-sm text-slate-500">
                Tum personel kartlari tamamlanmadan toplu kayit aktif olmaz.
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={!completion.isComplete}
                className="h-11 bg-marine-navy px-5 text-white hover:bg-marine-ocean"
              >
                <CheckCircle2 className="size-4" />
                Toplu Kaydet
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

