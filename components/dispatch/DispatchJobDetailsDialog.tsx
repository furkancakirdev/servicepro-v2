"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateDispatchJobDetails } from "@/app/(dashboard)/dispatch/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DISPATCH_REGIONS } from "@/lib/dispatch/constants";
import type { DispatchJobCard, DispatchTechnicianOption } from "@/lib/dispatch/types";

type DispatchJobDetailsDialogProps = {
  job: DispatchJobCard;
  dateValue: string;
  technicians: DispatchTechnicianOption[];
  trigger: ReactNode;
};

export default function DispatchJobDetailsDialog({
  job,
  dateValue,
  technicians,
  trigger,
}: DispatchJobDetailsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [regionId, setRegionId] = useState(job.regionId);
  const [scheduledDate, setScheduledDate] = useState(job.dispatchDateIso?.slice(0, 10) ?? dateValue);
  const [responsibleId, setResponsibleId] = useState(job.responsibleId ?? "");
  const [supportIds, setSupportIds] = useState<string[]>(job.supportIds);
  const [location, setLocation] = useState(job.location ?? "");

  const technicianOptions = useMemo(
    () => technicians.filter((technician) => technician.id !== responsibleId),
    [responsibleId, technicians]
  );

  function toggleSupport(userId: string) {
    setSupportIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await updateDispatchJobDetails({
          jobId: job.id,
          dateValue: scheduledDate,
          regionId,
          responsibleId: responsibleId || null,
          supportIds,
          location: regionId === "marmaris-disi" ? location : null,
        });
        toast.success("Dispatch karti guncellendi.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Dispatch karti guncellenirken hata olustu."
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <div className="w-full text-left" />
        }
      >
        {trigger}
      </DialogTrigger>

      {open ? (
        <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle className="text-marine-navy">{job.boatName}</DialogTitle>
            <DialogDescription>
              {job.categoryName} icin tarih, bolge ve ekip atamasini buradan yonetin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-medium text-marine-navy">{job.descriptionPreview}</div>
              <div className="mt-2 text-sm text-slate-600">
                Mevcut lokasyon: {job.locationLabel}
              </div>
            </div>

            {job.hasLocationWarning ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>Marmaris Disi islerinde acik lokasyon bilgisi zorunlu.</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-marine-navy">Plan tarihi</span>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 outline-none transition-colors focus:border-marine-ocean/40"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-marine-navy">Bolge</span>
                <select
                  value={regionId}
                  onChange={(event) => setRegionId(event.target.value as typeof regionId)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 outline-none transition-colors focus:border-marine-ocean/40"
                >
                  {DISPATCH_REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {regionId === "marmaris-disi" ? (
              <label className="space-y-2 text-sm">
                <span className="font-medium text-marine-navy">Acik lokasyon</span>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Ornek: Bozburun Marina"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 outline-none transition-colors focus:border-marine-ocean/40"
                />
              </label>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-marine-navy">Sorumlu teknisyen</span>
                <select
                  value={responsibleId}
                  onChange={(event) => setResponsibleId(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 outline-none transition-colors focus:border-marine-ocean/40"
                >
                  <option value="">Secilmedi</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2 text-sm">
                <div className="font-medium text-marine-navy">Destek ekibi</div>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {technicianOptions.length > 0 ? (
                    technicianOptions.map((technician) => (
                      <label
                        key={technician.id}
                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={supportIds.includes(technician.id)}
                          onChange={() => toggleSupport(technician.id)}
                          className="size-4 rounded border-slate-300"
                        />
                        <span>{technician.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-slate-500">Ek destek secenegi yok.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Vazgec
              </Button>
              <Button
                type="button"
                className="gap-2 bg-marine-navy text-white hover:bg-marine-ocean"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isPending ? "Kaydediliyor..." : "Karti guncelle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
