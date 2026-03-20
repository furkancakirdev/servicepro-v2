import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Clock3,
  MapPin,
  Trophy,
  Wrench,
} from "lucide-react";

import ActivityChart from "@/components/dashboard/ActivityChart";
import StatusBadge from "@/components/jobs/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";

const alertToneStyles = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
} as const;

export default async function DashboardHomePage() {
  const currentUser = await requireAppUser();

  if (currentUser.role === "TECHNICIAN") {
    redirect("/my-jobs");
  }

  const dashboard = await getDashboardData(currentUser);
  const statCards = [
    {
      title: "Acik isler",
      value: dashboard.activeJobsCount,
      description: "Planlandi, devam ediyor ve beklemede kayitlar.",
      icon: Wrench,
    },
    {
      title: "Bu ay tamamlanan",
      value: dashboard.completedThisMonthCount,
      description: "Ayni ay icinde teslime gelen operasyonlar.",
      icon: ClipboardCheck,
    },
    {
      title: "Bekleyen puanlama",
      value: dashboard.pendingScoringCount,
      description: "TAMAMLANDI durumundaki kapanis bekleyen isler.",
      icon: Clock3,
    },
    {
      title: "Bu ayin lideri",
      value: dashboard.leader ? `${dashboard.leader.score.toFixed(1)} puan` : "-",
      description: dashboard.leader?.name ?? "Henuz puan kaydi yok.",
      icon: Trophy,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-panel">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.45fr_0.95fr] lg:px-8">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-marine-ocean/20 bg-marine-ocean/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-marine-ocean">
              Gunluk Operasyon Merkezi
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-marine-navy sm:text-4xl">
                Saha, puanlama ve rozet akisi artik tek bakista yonetiliyor.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Prompt 6 ile dashboard gercek Prisma verisine baglandi; bekleyen
                puanlamalar, aylik liderlik ve aktif is yogunlugu artik canli olarak
                izlenebiliyor.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
              >
                Is Listesine Git
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/scoreboard"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:bg-slate-50"
              >
                Puan Tablosunu Ac
              </Link>
            </div>
          </div>

          <Card className="border-slate-200/80 bg-slate-950 text-white">
            <CardHeader>
              <CardTitle className="text-white">Operasyon snapshot</CardTitle>
              <CardDescription className="text-slate-300">
                Bu ayki saha temposu ve kalite akisi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {dashboard.pendingScoringCount} is teslim raporu ve Form 1 kapanisini bekliyor.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {dashboard.overdueHoldCount} beklemedeki is icin hatirlatma tetiklendi.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Lider: {dashboard.leader?.name ?? "Henuz puan kaydi yok"}{" "}
                {dashboard.leader ? `(${dashboard.leader.score.toFixed(1)})` : ""}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="border-white/80 bg-white/95">
              <CardHeader className="space-y-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-marine-ocean/10 text-marine-ocean">
                  <Icon className="size-5" />
                </div>
                <div>
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="mt-1 text-2xl text-marine-navy">
                    {card.value}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">
                {card.description}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <AlertTriangle className="size-5 text-marine-ocean" />
                Uyarilar
              </CardTitle>
              <CardDescription>
                Kapanis, aylik degerlendirme ve bekleme riski olan basliklar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.alerts.length > 0 ? (
                dashboard.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border px-4 py-4 ${alertToneStyles[alert.tone]}`}
                  >
                    <div className="font-medium">{alert.title}</div>
                    <div className="mt-1 text-sm opacity-90">{alert.description}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
                  Su anda kritik bir operasyon uyarisi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <MapPin className="size-5 text-marine-ocean" />
                Bugun benim islerim
              </CardTitle>
              <CardDescription>
                Sistemdeki aktif isler lokasyon bazinda gruplanir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.myJobs.length > 0 ? (
                dashboard.myJobs.map((group) => (
                  <div key={group.location} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-marine-navy">
                          {group.location}
                        </div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          {group.jobs.length} aktif is
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.jobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-marine-ocean/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-marine-navy">{job.boatName}</div>
                              <div className="text-sm text-slate-600">{job.categoryName}</div>
                            </div>
                            <StatusBadge status={job.status} />
                          </div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            {job.timeLabel} plan akisi
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
                  Bu kullanici icin aktif is atamasi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <BarChart3 className="size-5 text-marine-ocean" />
                Son 30 gun aktivite
              </CardTitle>
              <CardDescription>
                Olusturulan ve tamamlanan islerin gunluk ritmi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityChart data={dashboard.activity} />
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Trophy className="size-5 text-marine-ocean" />
                Bu ay top 5
              </CardTitle>
              <CardDescription>
                Aylik toplam puana gore mini leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.topFive.length > 0 ? (
                dashboard.topFive.map((entry) => (
                  <Link
                    key={entry.user.id}
                    href="/scoreboard"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-marine-ocean/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-marine-navy text-sm font-semibold text-white">
                        {entry.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-marine-navy">
                          {entry.user.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Is puani {entry.jobScore.toFixed(1)}</span>
                          {entry.hasMissingEval ? (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Degerlendirme bekleniyor
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-marine-navy">
                        {entry.total.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {entry.badges.length} rozet
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
                  Bu ay icin henuz leaderboard verisi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
