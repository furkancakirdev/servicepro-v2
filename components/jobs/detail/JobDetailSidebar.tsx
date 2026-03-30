import { HoldReason, JobStatus } from "@prisma/client";

import {
  submitScoreObjectionAction,
  updateHoldDetailsAction,
  updateJobStatusAction,
} from "@/app/(dashboard)/jobs/actions";
import ClientNotificationPanel from "@/components/jobs/ClientNotificationPanel";
import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import JobStatusActionDialogs from "@/components/jobs/detail/JobStatusActionDialogs";
import CoordinatorEvaluationFlow from "@/components/scoring/CoordinatorEvaluationFlow";
import FieldReportFlow from "@/components/scoring/FieldReportFlow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { holdReasonOptions } from "@/lib/jobs";
import type { FieldReportInput } from "@/lib/scoring";
import type { ServiceJobDetail } from "@/types";

import {
  formatDateTime,
  holdReasonLabelMap,
  primaryButtonClass,
  promptThreeActionStatuses,
  type JobDetailScore,
  type JobDetailUser,
} from "./shared";

type JobDetailSidebarProps = {
  job: ServiceJobDetail;
  responsible: JobDetailUser | null;
  canManageJob: boolean;
  canSubmitFieldReport: boolean;
  canEvaluateAndClose: boolean;
  canObjectToScore: boolean;
  canSendClientNotification: boolean;
  fieldReport: FieldReportInput | null;
  currentUserId: string;
  technicians: Array<{
    id: string;
    name: string;
  }>;
  onHoldDefaultDays: number;
  primaryContactWhatsAppUrl: string | null;
  responsibleScore: JobDetailScore | null;
  supportScores: JobDetailScore[];
};

export default function JobDetailSidebar({
  job,
  responsible,
  canManageJob,
  canSubmitFieldReport,
  canEvaluateAndClose,
  canObjectToScore,
  canSendClientNotification,
  fieldReport,
  currentUserId,
  technicians,
  onHoldDefaultDays,
  primaryContactWhatsAppUrl,
  responsibleScore,
  supportScores,
}: JobDetailSidebarProps) {
  const cancellableStatuses: JobStatus[] = [
    JobStatus.KESIF,
    JobStatus.PLANLANDI,
    JobStatus.DEVAM_EDIYOR,
    JobStatus.BEKLEMEDE,
  ];
  const isPendingEvaluation =
    job.status === JobStatus.TAMAMLANDI &&
    Boolean(job.deliveryReport) &&
    !job.evaluation &&
    job.jobScores.length === 0;
  const canCancelJob = canManageJob && cancellableStatuses.includes(job.status);
  const canCloseAsWarranty =
    canManageJob &&
    job.status === JobStatus.TAMAMLANDI &&
    Boolean(job.deliveryReport) &&
    !job.evaluation &&
    job.jobScores.length === 0;

  return (
    <div className="space-y-6">
      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-lg text-marine-navy">Operasyon ?zeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
              Kategori
            </div>
            <div className="mt-2 font-medium text-marine-navy">{job.category.name}</div>
            <div className="mt-1">{job.category.subScope}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
              Zorluk ?arpan?
            </div>
            <div className="mt-2">
              <DifficultyBadge multiplier={job.multiplier} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
              Bekleme durumu
            </div>
            <div className="mt-2">
              {job.holdReason
                ? `${holdReasonLabelMap.get(job.holdReason) ?? "Beklemede"} - ${formatDateTime(job.holdUntil)}`
                : "Aktif bekleme nedeni yok"}
            </div>
          </div>
        </CardContent>
      </Card>

      {job.jobScores.length > 0 ? (
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg text-marine-navy">Kapan?? puan ?zeti</CardTitle>
            <CardDescription>
              Kaydedilen Form-1 puanlar?n?n personel da??l?m?.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Sorumlu teknisyen
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="font-medium text-marine-navy">
                    {responsibleScore?.user.name ?? "Kay?t bulunamad?"}
                  </div>
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    {job.evaluation
                      ? `Base ${job.evaluation.baseScore.toFixed(1)} x ${job.multiplier}`
                      : `Rol ?arpan? ${responsibleScore?.roleMultiplier ?? 1}`}
                  </div>
                </div>
                <div className="text-2xl font-semibold text-emerald-700">
                  +{responsibleScore?.finalScore.toFixed(1) ?? "0.0"}
                </div>
              </div>
            </div>

            {supportScores.length > 0 ? (
              <div className="space-y-3">
                {supportScores.map((score) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <div className="font-medium text-marine-navy">{score.user.name}</div>
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        Destek rol? x{score.roleMultiplier}
                      </div>
                    </div>
                    <div className="font-semibold text-marine-navy">
                      +{score.finalScore.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canObjectToScore ? (
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg text-marine-navy">Puanlamaya itiraz et</CardTitle>
            <CardDescription>
              Kapan??tan sonraki 30 g?n i?inde Form-1 puanlamas? i?in inceleme talep
              edebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitScoreObjectionAction} className="space-y-3">
              <input type="hidden" name="jobId" value={job.id} />
              <textarea
                name="reason"
                required
                minLength={10}
                rows={4}
                placeholder="Neyi d?zeltmemizi istedi?inizi k?saca a??klay?n."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean"
              />
              <Button type="submit" variant="outline" className="h-12 w-full">
                Puanlamaya ?tiraz Et
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canSendClientNotification ? (
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="text-lg text-marine-navy">Randevu bildirimi gönder</CardTitle>
            <CardDescription>
              İrtibat kişinin dil tercihine göre WhatsApp şablonu hazırlanır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {primaryContactWhatsAppUrl ? (
              <div className="mb-4">
                <a
                  href={primaryContactWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Randevu Bildirimi G?nder
                </a>
              </div>
            ) : null}
            <ClientNotificationPanel
              jobId={job.id}
              boatName={job.boat.name}
              categoryName={job.category.name}
              location={job.location}
              appointmentDateIso={
                (job.actualStartAt ?? job.startedAt ?? job.plannedStartAt ?? job.createdAt).toISOString()
              }
              technicianName={responsible?.name ?? "Teknisyen"}
              contacts={job.boat.contacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                role: contact.role,
                phone: contact.phone,
                email: contact.email,
                language: contact.language,
                isPrimary: contact.isPrimary,
                whatsappOptIn: contact.whatsappOptIn,
              }))}
              notifications={job.clientNotifications.map((notification) => ({
                id: notification.id,
                templateLang: notification.templateLang,
                sentAt: notification.sentAt?.toISOString() ?? null,
                confirmed: notification.confirmed,
                contact: {
                  name: notification.contact.name,
                },
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-lg text-marine-navy">Aksiyon paneli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {!canManageJob && !canSubmitFieldReport ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Bu kayd?n operasyon aksiyonlar? yaln?zca atanm?? teknisyen veya koordinat?r
              taraf?ndan y?netilebilir.
            </div>
          ) : null}

          {canManageJob && job.status === JobStatus.KESIF ? (
            <>
              <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-3">
                Ke?if kayd? ?nce randevuya al?nabilir, gerekirse ayn? ekrandan normal i?e
                d?n??t?r?lebilir.
              </div>

              <form action={updateJobStatusAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="newStatus" value={JobStatus.PLANLANDI} />
                <Button type="submit" size="lg" className={primaryButtonClass}>
                  Randevuya Al
                </Button>
              </form>

              <form action={updateJobStatusAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="newStatus" value={JobStatus.PLANLANDI} />
                <input type="hidden" name="convertKesif" value="true" />
                <Button type="submit" size="lg" variant="outline" className="h-12 w-full">
                  ??e D?n??t?r
                </Button>
              </form>
            </>
          ) : null}

          {canManageJob && job.status === JobStatus.PLANLANDI ? (
            <form action={updateJobStatusAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="newStatus" value={JobStatus.DEVAM_EDIYOR} />
              <Button type="submit" size="lg" className={primaryButtonClass}>
                Ba?lat
              </Button>
            </form>
          ) : null}

          {job.status === JobStatus.DEVAM_EDIYOR ? (
            <>
              {canManageJob ? (
                <form
                  action={updateHoldDetailsAction}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="jobId" value={job.id} />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-marine-navy" htmlFor="reason">
                      Bekletme nedeni
                    </label>
                    <select
                      id="reason"
                      name="reason"
                      defaultValue={HoldReason.PARCA_BEKLENIYOR}
                      className="h-12 w-full rounded-lg border border-input bg-white px-3 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                    >
                      {holdReasonOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-marine-navy"
                      htmlFor="reminderDays"
                    >
                      Hat?rlatma g?n?
                    </label>
                    <input
                      id="reminderDays"
                      type="number"
                      min={1}
                      max={14}
                      defaultValue={onHoldDefaultDays}
                      name="reminderDays"
                      className="h-12 w-full rounded-lg border border-input bg-white px-3 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                    />
                  </div>
                  <Button type="submit" size="lg" variant="outline" className="h-12 w-full">
                    Beklemeye Al
                  </Button>
                </form>
              ) : null}

              {canSubmitFieldReport ? (
                <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 p-4">
                  <p className="mb-3 text-sm text-slate-600">
                    Saha personeli bu işi kapatmadan önce sadece saha raporunu ve görselleri
                    gönderir. Form-1 puanlaması koordinatör tarafında yapılır.
                  </p>
                  <FieldReportFlow
                    jobId={job.id}
                    boatName={job.boat.name}
                    categoryName={job.category.name}
                    currentUserId={currentUserId}
                    technicians={technicians}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {canManageJob && job.status === JobStatus.BEKLEMEDE ? (
            <form action={updateJobStatusAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="newStatus" value={JobStatus.DEVAM_EDIYOR} />
              <Button type="submit" size="lg" className={primaryButtonClass}>
                Devam Et
              </Button>
            </form>
          ) : null}

          {job.status === JobStatus.TAMAMLANDI && !job.deliveryReport ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              ?? tamamland? ancak saha raporu gelmedi. Nihai puanlama i?in ?nce teknisyen
              tarafından saha raporu gönderilmelidir.
            </div>
          ) : null}

          {isPendingEvaluation ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Saha raporu alındı. Koordinatör saha görsellerini inceleyip Form-1
                puanlamas?n? tamamlad?ktan sonra i? kapanacakt?r.
              </p>
              <JobStatusActionDialogs
                jobId={job.id}
                showCancel={false}
                showWarranty={canCloseAsWarranty}
              />
              {canEvaluateAndClose && fieldReport ? (
                <CoordinatorEvaluationFlow
                  jobId={job.id}
                  multiplier={job.multiplier}
                  report={fieldReport}
                />
              ) : null}
            </div>
          ) : null}

          <JobStatusActionDialogs
            jobId={job.id}
            showCancel={canCancelJob}
            showWarranty={false}
          />

          {canManageJob &&
          job.status === JobStatus.KAPANDI &&
          job.evaluation &&
          job.jobScores.length > 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              Form-1 puanlama tamamland? ve i? resmi olarak kapat?ld?.
            </div>
          ) : null}

          {!promptThreeActionStatuses.includes(job.status) && job.status !== JobStatus.KAPANDI ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Bu i? durumu i?in ek aksiyon yok.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
