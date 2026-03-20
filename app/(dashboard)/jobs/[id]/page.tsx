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
import { getStatusLabel } from "@/components/jobs/StatusBadge";
import StatusBadge from "@/components/jobs/StatusBadge";
import CloseoutFlow from "@/components/scoring/CloseoutFlow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
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

  const { job, sameBoatOpenJobs } = data;
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
      label: "Is olusturuldu",
      description: "Kayit operasyon paneline eklendi.",
      date: job.createdAt,
    },
    job.startedAt
      ? {
          label: "Saha calismasi basladi",
          description: "Teknisyen ekip goreve basladi.",
          date: job.startedAt,
        }
      : null,
    job.holdReason
      ? {
          label: "Is beklemeye alindi",
          description: `${holdReasonLabelMap.get(job.holdReason as HoldReason) ?? "Bekleme"}${
            job.holdUntil ? ` - hedef hatirlatma ${formatDateTime(job.holdUntil)}` : ""
          }`,
          date: job.updatedAt,
        }
      : null,
    job.completedAt
      ? {
          label: "Is tamamlandi",
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
          label: "Form 1 puanlama tamamlandi",
          description: `${job.evaluation.evaluator.name} tarafindan kaydedildi.`,
          date: job.evaluation.createdAt,
        }
      : null,
    job.closedAt
      ? {
          label: "Is kapatildi",
          description: "Puanlama sonrasi resmi kapanis yapildi.",
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
      </div>

      {created ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Is kaydi basariyla olusturuldu.
        </div>
      ) : null}

      {updated ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Is durumu guncellendi.
        </div>
      ) : null}

      {objectionSubmitted ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Puan itirazi kaydedildi. Admin ekibine bildirim gonderildi.
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
                  Ayni teknede acik isler var
                </CardTitle>
                <CardDescription className="text-amber-800">
                  Cakisma veya tekrar kayit riskini azaltmak icin bu isleri kontrol edin.
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
              <CardDescription>Is #{job.id.slice(0, 8)}</CardDescription>
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
                <h2 className="text-lg font-semibold text-marine-navy">Is Aciklamasi</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{job.description}</p>
                {job.notes ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-marine-navy">Ic not:</span> {job.notes}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg text-marine-navy">Personel ve timeline</CardTitle>
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
                      <div>{responsible ? responsible.name : "Henuz atanmadi"}</div>
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
                  <div className="font-medium text-marine-navy">Durum ozeti</div>
                  <div className="mt-2 space-y-2">
                    <div>Mevcut durum: {getStatusLabel(job.status)}</div>
                    <div>Teslim raporu: {job.deliveryReport ? "Var" : "Yok"}</div>
                    <div>Form 1 puanlama: {job.evaluation ? "Var" : "Yok"}</div>
                    <div>Kapandi: {job.closedAt ? formatDateTime(job.closedAt) : "Hayir"}</div>
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
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-lg text-marine-navy">Operasyon ozeti</CardTitle>
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
                  Zorluk carpan
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
                <CardTitle className="text-lg text-marine-navy">Kapanis puan ozeti</CardTitle>
                <CardDescription>
                  Kaydedilen teslim raporu ve Form 1 puanlarinin personel dagilimi.
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
                        {responsibleScore?.user.name ?? "Kayit bulunamadi"}
                      </div>
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        {job.evaluation
                          ? `Base ${job.evaluation.baseScore.toFixed(1)} x ${job.multiplier}`
                          : `Rol carpan ${responsibleScore?.roleMultiplier ?? 1}`}
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
                  Kapanistan sonraki 30 gun icinde Form 1 puanlamasi icin inceleme talep
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
                    placeholder="Neyi duzeltmemizi istediginizi kisaca aciklayin."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean"
                  />
                  <Button type="submit" variant="outline" className="h-12 w-full">
                    Puanlamaya Itiraz Et
                  </Button>
                </form>
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
                  Bu kaydin operasyon aksiyonlari yalnizca koordinator veya admin tarafindan
                  yonetilebilir.
                </div>
              ) : null}

              {canManageJob && job.status === JobStatus.KESIF ? (
                <>
                  <div className="rounded-2xl border border-marine-ocean/20 bg-marine-ocean/5 px-4 py-3">
                    Kesif kaydi once randevuya alinabilir, gerekirse ayni ekrandan normal
                    ise donusturulebilir.
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
                      Ise Donustur
                    </Button>
                  </form>
                </>
              ) : null}

              {canManageJob && job.status === JobStatus.PLANLANDI ? (
                <form action={updateJobStatusAction}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="newStatus" value={JobStatus.DEVAM_EDIYOR} />
                  <Button type="submit" size="lg" className={primaryButtonClass}>
                    Baslat
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
                        Hatirlatma gunu
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
                      Tamamlandi Olarak Isaretle
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
                    Is ancak zorunlu teslim raporu ve Form 1 puanlama tamamlandiktan sonra
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
                  Kapanis puanlama verileri kaydedildi. Is kaydi kapanis adimina hazir.
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
