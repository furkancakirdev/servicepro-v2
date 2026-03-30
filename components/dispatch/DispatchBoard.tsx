"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CalendarDays, GripHorizontal, MapPin, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { assignJobToDate } from "@/app/(dashboard)/dispatch/actions";
import type {
  DispatchBoardData,
  DispatchJobCard,
  DispatchRegionId,
} from "@/lib/dispatch/types";

import DispatchJobDetailsDialog from "./DispatchJobDetailsDialog";

type DispatchBoardProps = {
  data: DispatchBoardData;
};

type DropZoneProps = {
  regionId: DispatchRegionId;
  dateValue: string;
  label: string;
  jobs: DispatchJobCard[];
  draggedJobId: string | null;
  onDragStart: (jobId: string) => void;
  onDrop: (regionId: DispatchRegionId, dateValue: string) => void;
  availableTechnicians: DispatchBoardData["availableTechnicians"];
};

function WarningBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-amber-800">{description}</div>
        </div>
      </div>
    </div>
  );
}

function DispatchJobCardView({
  job,
  onDragStart,
}: {
  job: DispatchJobCard;
  onDragStart: (jobId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(job.id)}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-marine-ocean/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-marine-navy">{job.boatName}</div>
          <div className="mt-1 text-sm text-slate-600">{job.categoryName}</div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          <GripHorizontal className="size-3.5" />
          Tasinabilir
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
          {job.timeLabel ?? "Saat yok"}
        </span>
        <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
          {job.responsibleName ?? "Teknisyen bekliyor"}
        </span>
        {job.priority ? (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            {job.priority}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <span>{job.assignedTechnician ?? "Sorumlu teknisyen secilmedi"}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <span>{job.location?.trim() || job.locationLabel}</span>
        </div>
      </div>

      {job.hasLocationWarning ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Marmaris Disi gorevinde acik lokasyon zorunlu.
        </div>
      ) : null}
    </div>
  );
}

function DropZone({
  regionId,
  dateValue,
  label,
  jobs,
  draggedJobId,
  onDragStart,
  onDrop,
  availableTechnicians,
}: DropZoneProps) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(regionId, dateValue)}
      className={`min-h-[180px] rounded-[24px] border border-dashed p-3 transition-colors ${
        draggedJobId
          ? "border-marine-ocean/40 bg-marine-ocean/5"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-marine-navy">{label}</div>
        <div className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500">
          {jobs.length} is
        </div>
      </div>

      <div className="space-y-3">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <DispatchJobDetailsDialog
              key={job.id}
              job={job}
              dateValue={dateValue}
              technicians={availableTechnicians}
              trigger={<DispatchJobCardView job={job} onDragStart={onDragStart} />}
            />
          ))
        ) : (
          <div className="rounded-2xl bg-white/80 px-4 py-6 text-sm text-slate-500">
            Buraya kart birakip {label.toLowerCase()} icin plan olusturabilirsiniz.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DispatchBoard({ data }: DispatchBoardProps) {
  const router = useRouter();
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDrop(regionId: DispatchRegionId, dateValue: string) {
    if (!draggedJobId) {
      return;
    }

    startTransition(async () => {
      try {
        await assignJobToDate({
          jobId: draggedJobId,
          dateValue,
          regionId,
        });
        toast.success("Is yeni tarih ve bolgeye tasindi.");
        setDraggedJobId(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Kart tasinirken hata olustu.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {data.warnings.length > 0 ? (
        <div className="space-y-3">
          {data.warnings.map((warning) => (
            <WarningBanner
              key={warning.id}
              title={warning.title}
              description={warning.description}
            />
          ))}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-panel sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.16em] text-marine-ocean">
              {data.viewMode === "daily" ? "Gunluk gorunum" : "Haftalik gorunum"}
            </div>
            <div className="mt-1 text-lg font-semibold text-marine-navy">{data.dateLabel}</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            <CalendarDays className="size-4 text-marine-ocean" />
            {data.weekLabel}
          </div>
        </div>
      </div>

      {data.viewMode === "daily" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {data.regions.map((region) => (
            <div
              key={region.id}
              className={`rounded-[28px] border border-slate-200 bg-white p-4 shadow-panel ${
                isPending ? "opacity-80" : ""
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-marine-navy text-sm font-semibold text-white">
                    {region.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-marine-navy">{region.label}</div>
                    <div className="text-sm text-slate-500">{region.jobCount} planli is</div>
                  </div>
                </div>
              </div>

              {region.days.map((day) => (
                <DropZone
                  key={`${region.id}-${day.dateValue}`}
                  regionId={region.id}
                  dateValue={day.dateValue}
                  label={day.dateLabel}
                  jobs={day.jobs}
                  draggedJobId={draggedJobId}
                  onDragStart={setDraggedJobId}
                  onDrop={handleDrop}
                  availableTechnicians={data.availableTechnicians}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className={`space-y-4 ${isPending ? "opacity-80" : ""}`}>
          {data.regions.map((region) => (
            <div
              key={region.id}
              className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-panel"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-marine-navy text-sm font-semibold text-white">
                  {region.icon}
                </div>
                <div>
                  <div className="font-semibold text-marine-navy">{region.label}</div>
                  <div className="text-sm text-slate-500">{region.jobCount} planli is</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-6">
                {region.days.map((day) => (
                  <DropZone
                    key={`${region.id}-${day.dateValue}`}
                    regionId={region.id}
                    dateValue={day.dateValue}
                    label={`${day.dayLabel} • ${day.dateLabel}`}
                    jobs={day.jobs}
                    draggedJobId={draggedJobId}
                    onDragStart={setDraggedJobId}
                    onDrop={handleDrop}
                    availableTechnicians={data.availableTechnicians}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[28px] border border-rose-200 bg-white p-4 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-rose-900">Tarihe atanmamis isler</div>
            <div className="text-sm text-rose-700">
              Kartlari bolge gunlerine surukleyerek planlayin veya karti acip detaydan atayin.
            </div>
          </div>
          <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
            {data.unassignedJobs.length} bekleyen kart
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.unassignedJobs.length > 0 ? (
            data.unassignedJobs.map((job) => (
              <DispatchJobDetailsDialog
                key={job.id}
                job={job}
                dateValue={data.dateValue}
                technicians={data.availableTechnicians}
                trigger={<DispatchJobCardView job={job} onDragStart={setDraggedJobId} />}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Tarih bekleyen dispatch karti kalmadi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
