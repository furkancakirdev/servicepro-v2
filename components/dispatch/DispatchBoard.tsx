"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, GripHorizontal, MapPin, MoveRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { reassignDispatchJob } from "@/app/(dashboard)/dispatch/actions";
import type { DispatchBoardData, DispatchTimelineBlock } from "@/lib/dispatch";

const blockToneStyles: Record<DispatchTimelineBlock["tone"], string> = {
  blue: "border-sky-200 bg-[#E6F1FB] text-sky-900",
  green: "border-emerald-200 bg-[#EAF3DE] text-emerald-900",
  amber: "border-amber-200 bg-[#FAEEDA] text-amber-900",
  purple: "border-violet-200 bg-[#EEEDFE] text-violet-900",
  slate: "border-slate-300 bg-slate-100 text-slate-700",
};

const timelineHours = Array.from({ length: 10 }, (_, index) => 8 + index);
const timelineWindowMinutes = 9 * 60;

type DispatchBoardProps = {
  data: DispatchBoardData;
};

function TimelineHeader() {
  return (
    <div className="grid grid-cols-10 rounded-t-[28px] border border-slate-200 bg-white">
      {timelineHours.map((hour) => (
        <div
          key={hour}
          className="border-l border-slate-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 first:border-l-0"
        >
          {String(hour).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

function JobToken({
  title,
  subtitle,
  draggable = false,
  onDragStart,
}: {
  title: string;
  subtitle: string;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-3 text-left transition-colors hover:border-rose-300"
    >
      <div>
        <div className="font-medium text-rose-900">{title}</div>
        <div className="mt-1 text-sm text-rose-700">{subtitle}</div>
      </div>
      <GripHorizontal className="mt-0.5 size-4 shrink-0 text-rose-500" />
    </button>
  );
}

export default function DispatchBoard({ data }: DispatchBoardProps) {
  const router = useRouter();
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const busyLaneIds = useMemo(
    () => new Set(data.lanes.filter((lane) => lane.isOverloaded).map((lane) => lane.id)),
    [data.lanes]
  );

  function handleDrop(technicianId: string) {
    if (!draggedJobId) {
      return;
    }

    setStatusMessage(null);
    startTransition(async () => {
      await reassignDispatchJob({
        jobId: draggedJobId,
        technicianId,
      });
      setStatusMessage("Atama güncellendi. Timeline yenileniyor.");
      setDraggedJobId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {statusMessage ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {statusMessage}
        </div>
      ) : null}

      {data.warnings.length > 0 ? (
        <div className="space-y-3">
          {data.warnings.map((warning) => (
            <div
              key={warning.id}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-medium">{warning.title}</div>
                  <div className="mt-1 text-amber-800">{warning.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4 text-sm font-semibold text-marine-navy">
            Teknisyen rosteri
          </div>
          <div className="space-y-2 p-3">
            {data.lanes.map((lane) => (
              <div
                key={lane.id}
                className={`rounded-2xl border px-3 py-3 ${
                  busyLaneIds.has(lane.id)
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-marine-navy text-sm font-semibold text-white">
                    {lane.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-marine-navy">{lane.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{lane.jobCount} iş</span>
                      <span>•</span>
                      <span className="truncate">{lane.locationLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 overflow-x-auto">
          <div className="min-w-[920px]">
            <TimelineHeader />
            <div className="rounded-b-[28px] border border-t-0 border-slate-200 bg-white">
              {data.lanes.map((lane) => (
                <div
                  key={lane.id}
                  className="grid grid-cols-[220px_minmax(0,1fr)] border-t border-slate-100 first:border-t-0"
                >
                  <div className="border-r border-slate-100 px-4 py-4">
                    <div className="font-medium text-marine-navy">{lane.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{lane.locationLabel}</div>
                  </div>
                  <div
                    className={`relative h-[92px] bg-[linear-gradient(to_right,rgba(226,232,240,0.8)_1px,transparent_1px)] bg-[length:10%_100%] px-2 py-3 ${
                      isPending ? "opacity-70" : ""
                    }`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(lane.id)}
                  >
                    {lane.blocks.length > 0 ? (
                      lane.blocks.map((block) => {
                        const left = (block.startMinutes / timelineWindowMinutes) * 100;
                        const width = (block.durationMinutes / timelineWindowMinutes) * 100;

                        return (
                          <div
                            key={block.id}
                            draggable={Boolean(block.jobId)}
                            onDragStart={() => setDraggedJobId(block.jobId ?? null)}
                            className={`absolute top-3 rounded-2xl border px-3 py-2 text-xs shadow-sm ${
                              blockToneStyles[block.tone]
                            } ${block.jobId ? "cursor-grab active:cursor-grabbing" : ""}`}
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(width, 12)}%`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{block.title}</div>
                                <div className="truncate opacity-80">{block.subtitle}</div>
                                <div className="mt-1 flex items-center gap-1 opacity-70">
                                  <MapPin className="size-3" />
                                  <span>
                                    {block.startLabel} - {block.endLabel}
                                  </span>
                                </div>
                              </div>
                              {block.hasWarningDot ? (
                                <span className="mt-1 inline-flex size-2 rounded-full bg-rose-500" />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex h-full items-center px-3 text-sm text-slate-400">
                        Bu satır şu anda boş. Kırmızı kartları sürükleyip buraya
                        bırakabilirsiniz.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-rose-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-rose-900">Atanmamış işler</div>
                <div className="text-sm text-rose-700">
                  Kırmızı kartları ilgili teknisyen satırına taşıyarak atama yapın.
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                <MoveRight className="size-3.5" />
                Sürükle ve bırak
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.unassignedJobs.length > 0 ? (
                data.unassignedJobs.map((job) => (
                  <JobToken
                    key={job.id}
                    title={job.boatName}
                    subtitle={`${job.categoryName} • ${job.locationLabel}`}
                    draggable
                    onDragStart={() => setDraggedJobId(job.id)}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Bugün için atanmamış iş bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
