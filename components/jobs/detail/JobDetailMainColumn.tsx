import Link from "next/link";
import { Clock3, MapPin, Phone, TriangleAlert, Users2 } from "lucide-react";

import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import { getStatusLabel } from "@/components/jobs/StatusBadge";
import StatusBadge from "@/components/jobs/StatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceJobDetail } from "@/types";

import {
  formatDateTime,
  getInfoValue,
  type JobDetailAssignment,
  type JobDetailUser,
  type RecentBoatHistoryItem,
  type RelatedOpenJob,
  type TimelineEntry,
} from "./shared";
import type { FieldReportInput } from "@/lib/scoring";

type JobDetailMainColumnProps = {
  job: ServiceJobDetail;
  responsible: JobDetailUser | null;
  supportAssignments: JobDetailAssignment[];
  sameBoatOpenJobs: RelatedOpenJob[];
  recentBoatHistory: RecentBoatHistoryItem[];
  fieldReport: FieldReportInput | null;
  timeline: TimelineEntry[];
};

export default function JobDetailMainColumn({
  job,
  responsible,
  supportAssignments,
  sameBoatOpenJobs,
  recentBoatHistory,
  fieldReport,
  timeline,
}: JobDetailMainColumnProps) {
  return (
    <div className="space-y-6">
      {sameBoatOpenJobs.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <TriangleAlert className="size-5" />
              Aynı teknede açık işler var
            </CardTitle>
            <CardDescription className="text-amber-800">
              Çakışma veya tekrar kayıt riskini azaltmak için bu işleri kontrol edin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sameBoatOpenJobs.map((relatedJob) => (
              <Link
                key={relatedJob.id}
                href={`/jobs/${relatedJob.id}`}
                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-white px-4 py-3 transition-colors hover:border-amber-300"
              >
                <div>
                  <div className="font-medium text-slate-800">{relatedJob.category.name}</div>
                  <div className="text-sm text-slate-600">{relatedJob.category.subScope}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={relatedJob.status} />
                  <span className="text-xs text-slate-500">
                    {formatDateTime(relatedJob.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardDescription>İş #{job.jobNumber}</CardDescription>
          <CardTitle className="text-2xl text-marine-navy">
            {job.boat.name} - {job.category.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <MapPin className="mb-2 size-4 text-marine-ocean" />
              {getInfoValue(job.location)}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Clock3 className="mb-2 size-4 text-marine-ocean" />
              {formatDateTime(job.actualStartAt ?? job.startedAt ?? job.plannedStartAt ?? job.createdAt)}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Phone className="mb-2 size-4 text-marine-ocean" />
              {job.contactName
                ? `${job.contactName} - ${getInfoValue(job.contactPhone)}`
                : getInfoValue(job.contactPhone)}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-marine-navy">İş açıklaması</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{job.description}</p>
            {job.notes ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-medium text-marine-navy">İş notu:</span> {job.notes}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {fieldReport ? (
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg text-marine-navy">Saha raporu</CardTitle>
            <CardDescription>
              Teknisyen tarafindan gonderilen gorsel ve operasyon notlari.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-marine-ocean">
                  Unite bilgisi
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {fieldReport.unitInfo || "Bilgi girilmemis."}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-marine-ocean">
                  Parca / malzeme
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {fieldReport.partsUsed || "Parca listesi girilmemis."}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-marine-ocean">
                  Taseron bilgisi
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {fieldReport.hasSubcontractor
                    ? fieldReport.subcontractorDetails || "Detay belirtilmemis."
                    : "Bu iste taseron kullanilmadi."}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-marine-ocean">
                  Ek saha notlari
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {fieldReport.notes || "Ek not bulunmuyor."}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-marine-ocean">
                Fotograf galerisi
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fieldReport.photos.before ? (
                  <a
                    href={fieldReport.photos.before}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-medium text-marine-navy transition-colors hover:border-marine-ocean/40"
                  >
                    Once fotografi
                  </a>
                ) : null}
                {fieldReport.photos.after ? (
                  <a
                    href={fieldReport.photos.after}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-medium text-marine-navy transition-colors hover:border-marine-ocean/40"
                  >
                    Sonra fotografi
                  </a>
                ) : null}
                {fieldReport.photos.details.map((photo, index) => (
                  <a
                    key={`${photo}-${index}`}
                    href={photo}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-medium text-marine-navy transition-colors hover:border-marine-ocean/40"
                  >
                    Detay fotografi {index + 1}
                  </a>
                ))}
                {!fieldReport.photos.before &&
                !fieldReport.photos.after &&
                fieldReport.photos.details.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8">
                    Gorsel bulunmuyor.
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-lg text-marine-navy">Ekip ve iş geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-marine-ocean">
                <Users2 className="size-4" />
                Ekip ataması
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                <div>
                  <div className="font-medium text-marine-navy">Sorumlu</div>
                  <div>{responsible ? responsible.name : "Henüz atanmadı"}</div>
                </div>
                <div>
                  <div className="font-medium text-marine-navy">Destek</div>
                  {supportAssignments.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {supportAssignments.map((assignment) => (
                        <li key={assignment.id}>{assignment.user.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <div>Destek personeli yok.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <div className="font-medium text-marine-navy">Durum özeti</div>
              <div className="mt-2 space-y-2">
                <div>Mevcut durum: {getStatusLabel(job.status)}</div>
                <div>Teslim raporu: {job.deliveryReport ? "Var" : "Yok"}</div>
                <div>Form 1 puanlama: {job.evaluation ? "Var" : "Yok"}</div>
                <div>Kapandı: {job.closedAt ? formatDateTime(job.closedAt) : "Hayır"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {timeline.map((entry, index) => (
              <div
                key={`${entry.label}-${index}`}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="mt-1 size-3 rounded-full bg-marine-ocean" />
                <div>
                  <div className="font-medium text-marine-navy">{entry.label}</div>
                  <div className="mt-1 text-sm text-slate-600">{entry.description}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {formatDateTime(entry.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-lg text-marine-navy">Son 3 ziyaret</CardTitle>
          <CardDescription>
            Süreklilik takibi için aynı teknenin son servis geçmişi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentBoatHistory.length > 0 ? (
            recentBoatHistory.map((historyItem) => (
              <div
                key={historyItem.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
              >
                <div className="font-medium text-marine-navy">{historyItem.category.name}</div>
                <div className="mt-1">{historyItem.category.subScope}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {formatDateTime(historyItem.closedAt ?? historyItem.createdAt)} ·{" "}
                  {historyItem.assignments.map((assignment) => assignment.user.name).join(", ")}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              Bu tekne için önceki servis geçmişi bulunmuyor.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
