import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MapPin, Phone, TriangleAlert, Users2 } from "lucide-react";
import { HoldReason, JobRole, JobStatus, Role } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import {
  getJobById,
  submitScoreObjectionAction,
  updateHoldDetailsAction,
  updateJobStatusAction,
} from "@/app/(dashboard)/jobs/actions";
import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import ClientNotificationPanel from "@/components/jobs/ClientNotificationPanel";
import { getStatusLabel } from "@/components/jobs/StatusBadge";
import StatusBadge from "@/components/jobs/StatusBadge";
import CloseoutFlow from "@/components/scoring/CloseoutFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
import {
  buildClientNotificationTemplate,
  buildWhatsAppDeepLink,
} from "@/lib/client-notifications";
import { holdReasonOptions } from "@/lib/jobs";
import { getOnHoldDefaultDays } from "@/lib/system-settings";

type JobDetailPageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

const secondaryLinkClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5";
const primaryButtonClass = "h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean";
const holdReasonLabelMap = new Map(
  holdReasonOptions.map((option) => [option.value, option.label] as const)
);
const promptThreeActionStatuses: JobStatus[] = [
  JobStatus.KESIF,
  JobStatus.PLANLANDI,
  JobStatus.DEVAM_EDIYOR,
  JobStatus.BEKLEMEDE,
  JobStatus.TAMAMLANDI,
];

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return format(date, "dd MMM yyyy HH:mm", { locale: tr });
}

function getInfoValue(value?: string | null) {
  return value && value.trim().length > 0 ? value : "Bilgi bekleniyor";
}

function isWithinObjectionWindow(date: Date | null | undefined) {
  if (!date) {
    return false;
  }

  return Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: JobDetailPageProps) {
  const currentUser = await requireAppUser();
  const [data, onHoldDefaultDays] = await Promise.all([
    getJobById(params.id),
    getOnHoldDefaultDays(),
  ]);

  if (!data) {
    notFound();
  }

  const { job, sameBoatOpenJobs, recentBoatHistory } = data;
  const responsible =
    job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU)?.user ??
    job.assignments[0]?.user ??
    null;
  const supportAssignments = job.assignments.filter(
    (assignment) => assignment.role === JobRole.DESTEK
  );
  const statusMessage = takeFirstValue(searchParams?.error);
  const created = takeFirstValue(searchParams?.created) === "1";
  const updated = takeFirstValue(searchParams?.updated) === "1";
  const objectionSubmitted = takeFirstValue(searchParams?.objection) === "1";
  const closeoutRequested = takeFirstValue(searchParams?.closeout) === "1";
  const canManageJob =
    currentUser.role === Role.ADMIN || currentUser.role === Role.COORDINATOR;
  const canSendClientNotification = canManageJob && job.boat.contacts.length > 0;
  const primaryContact =
    job.boat.contacts.find(
      (contact) => contact.isPrimary && contact.whatsappOptIn && contact.phone
    ) ??
    job.boat.contacts.find((contact) => contact.whatsappOptIn && contact.phone) ??
    null;
  const primaryContactTemplate = primaryContact
    ? buildClientNotificationTemplate({
        boatName: job.boat.name,
        categoryName: job.category.name,
        date: job.startedAt ?? job.createdAt,
        location: job.location,
        berthDetail: job.location,
        technicianName: responsible?.name ?? "Teknisyen",
        contactName: primaryContact.name,
        contactLanguage: primaryContact.language,
      })
    : null;
  const primaryContactWhatsAppUrl =
    primaryContact?.phone && primaryContactTemplate
      ? buildWhatsAppDeepLink(primaryContact.phone, primaryContactTemplate.text)
      : null;
  const needsMandatoryCloseout =
    job.status === JobStatus.TAMAMLANDI &&
    (!job.deliveryReport || !job.evaluation || job.jobScores.length === 0);
  const responsibleScore =
    job.jobScores.find((score) => score.role === JobRole.SORUMLU) ??
    job.jobScores[0] ??
    null;
  const supportScores = job.jobScores.filter((score) => score.role === JobRole.DESTEK);
  const canObjectToScore =
    job.jobScores.length > 0 &&
    isWithinObjectionWindow(job.closedAt) &&
    currentUser.role !== Role.ADMIN;

  const timeline = [
    {
      label: "İş oluşturuldu",
      description: "İş sisteme kaydedildi.",
      date: job.createdAt,
    },
    job.startedAt
      ? {
          label: "Saha çalışması başladı",
          description: "Teknisyen ekip göreve başladı.",
          date: job.startedAt,
        }
      : null,
    job.holdReason
      ? {
          label: "İş beklemeye alındı",
          description: `${holdReasonLabelMap.get(job.holdReason as HoldReason) ?? "Bekleme"}${
            job.holdUntil ? ` - hedef hat?rlatma ${formatDateTime(job.holdUntil)}` : ""
          }`,
          date: job.updatedAt,
        }
      : null,
    job.completedAt
      ? {
          label: "?? tamamland?",
          description: "Operasyonel is adimlari bitirildi.",
          date: job.completedAt,
        }
      : null,
    job.deliveryReport
      ? {
          label: "Teslim raporu kaydedildi",
          description: "Teslim kriterleri sisteme girildi.",
          date: job.deliveryReport.createdAt,
        }
      : null,
    job.evaluation
      ? {
          label: "Form 1 puanlama tamamland?",
          description: `${job.evaluation.evaluator.name} tarafindan kaydedildi.`,
          date: job.evaluation.createdAt,
        }
      : null,
    job.closedAt
      ? {
          label: "?? kapat?ld?",
          description: "Puanlama sonras? resmi kapan?? yap?ld?.",
          date: job.closedAt,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; description: string; date: Date }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/jobs" className={secondaryLinkClass}>
          <ArrowLeft className="size-4" />
          Geri
        </Link>
        <StatusBadge status={job.status} />
        <DifficultyBadge multiplier={job.multiplier} />
        {job.boat.isVip ? (
          <Badge
            variant="outline"
            className="border-[#BA7517] text-[#BA7517]"
          >
            ★ VIP Müşteri
          </Badge>
        ) : null}
      </div>

      {created ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ?? kayd? ba?ar?yla olu?turuldu.
        </div>
      ) : null}

      {updated ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          ?? durumu g?ncellendi.
        </div>
      ) : null}

      {objectionSubmitted ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Puan itiraz? kaydedildi. Admin ekibine bildirim g?nderildi.
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(statusMessage)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          {sameBoatOpenJobs.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <TriangleAlert className="size-5" />
                  Ayn? teknede a??k i?ler var
                </CardTitle>
                <CardDescription className="text-amber-800">
                  ?ak??ma veya tekrar kay?t riskini azaltmak i?in bu i?leri kontrol edin.
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
                  {formatDateTime(job.createdAt)}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Phone className="mb-2 size-4 text-marine-ocean" />
                  {job.contactName
                    ? `${job.contactName} - ${getInfoValue(job.contactPhone)}`
                    : getInfoValue(job.contactPhone)}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-marine-navy">İş Açıklaması</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{job.description}</p>
                {job.notes ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-marine-navy">İş notu:</span> {job.notes}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg text-marine-navy">Ekip ve İş Geçmişi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-marine-ocean">
                    <Users2 className="size-4" />
                    Ekip atamasi
                  </div>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <div>
                      <div className="font-medium text-marine-navy">Sorumlu</div>
                      <div>{responsible ? responsible.name : "Hen?z atanmadi"}</div>
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
                  <div className="font-medium text-marine-navy">Durum ?zeti</div>
                  <div className="mt-2 space-y-2">
                    <div>Mevcut durum: {getStatusLabel(job.status)}</div>
                    <div>Teslim raporu: {job.deliveryReport ? "Var" : "Yok"}</div>
                    <div>Form 1 puanlama: {job.evaluation ? "Var" : "Yok"}</div>
                    <div>Kapand?: {job.closedAt ? formatDateTime(job.closedAt) : "Hay?r"}</div>
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
                Sureklilik takibi icin ayn? teknenin son servis gecmisi.
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
                  Bu tekne i?in ?nceki servis ge?mi?i bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg text-marine-navy">Operasyon ?zeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
                  Kateg?ri
                </div>
                <div className="mt-2 font-medium text-marine-navy">{job.category.name}</div>
                <div className="mt-1">{job.category.subScope}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
                  Zorluk ?arpan
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
                  Kaydedilen teslim raporu ve Form 1 puanlar?n?n personel da??l?m?.
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
                          : `Rol ?arpan ${responsibleScore?.roleMultiplier ?? 1}`}
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
                            Destek rolu x{score.roleMultiplier}
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
                  Kapan??tan sonraki 30 g?n i?inde Form 1 puanlamas? i?in inceleme talep
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
                    Puanlamaya Itiraz Et
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canSendClientNotification ? (
            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg text-marine-navy">
                  Randevu bildirimi g?nder
                </CardTitle>
              <CardDescription>
                  İrtibat kişinin dil tercihine göre WA şablonu hazırlanır.
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
                  appointmentDateIso={job.createdAt.toISOString()}
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
              <CardTitle className="text-lg text-marine-navy">Aksiyon Paneli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              {!canManageJob ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Bu kaydin operasyon aksiyonlari yaln?zca koordinat?r veya admin tarafindan
                  y?netilebilir.
                </div>
              ) : null}

              {canManageJob && job.status === JobStatus.KESIF ? (
                <>
                  <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-3">
                    Kesif kaydi once randevuya alinabilir, gerekirse ayn? ekrandan normal
                    i?e d?n??t?r?lebilir.
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

              {canManageJob && job.status === JobStatus.DEVAM_EDIYOR ? (
                <>
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

                  <form action={updateJobStatusAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="newStatus" value={JobStatus.TAMAMLANDI} />
                    <input
                      type="hidden"
                      name="next"
                      value={`/jobs/${job.id}?closeout=1&updated=1`}
                    />
                    <Button type="submit" size="lg" className={primaryButtonClass}>
                      Tamamland? Olarak ??aretle
                    </Button>
                  </form>
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

              {canManageJob && needsMandatoryCloseout ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    ?? ancak zorunlu teslim raporu ve Form 1 puanlama tamamland?ktan sonra
                    kapanabilir.
                  </p>
                  <CloseoutFlow
                    jobId={job.id}
                    boatName={job.boat.name}
                    categoryName={job.category.name}
                    multiplier={job.multiplier}
                    startOpen={closeoutRequested}
                  />
                </div>
              ) : null}

              {canManageJob &&
              job.status === JobStatus.TAMAMLANDI &&
              !needsMandatoryCloseout ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  Kapan?? puanlama verileri kaydedildi. ?? kayd? kapan?? ad?m?na haz?r.
                </div>
              ) : null}

              {!promptThreeActionStatuses.includes(job.status) ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Bu durum icin Prompt 4 kapsaminda ek aksiyon tanimlanmadi.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
