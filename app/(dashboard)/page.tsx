import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
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
      title: "Açık işler",
      value: dashboard.activeJobsCount,
      icon: Wrench,
    },
    {
      title: "Bu ay tamamlanan",
      value: dashboard.completedThisMonthCount,
      icon: ClipboardCheck,
    },
    {
      title: "Bekleyen puanlama",
      value: dashboard.pendingScoringCount,
      icon: Clock3,
    },
    {
      title: "Bu ayin lideri",
      value: dashboard.leader ? `${dashboard.leader.score.toFixed(1)} puan` : "-",
      icon: Trophy,
    },
  ] as const;

  return (
    <div className="space-y-6">
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
                Kapanis, ayl?k değerlendirme ve bekleme riski olan basliklar.
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
                Bugün benim islerim
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
                Oluşturulan ve tamamlanan islerin gunluk ritmi.
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
                Aylık toplam puana g?re mini leaderboard.
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
                          <span>İş puanı {entry.jobScore.toFixed(1)}</span>
                          {entry.hasMissingEval ? (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Değerlendirme bekleniyor
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
                  Bu ay icin henüz leaderboard verisi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

