import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfMonth, format, startOfMonth } from "date-fns";
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
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const statCards = [
    {
      title: "Aktif operasyon",
      value: dashboard.activeJobsCount,
      icon: Wrench,
      href: "/jobs?statusGroup=ACTIVE",
    },
    {
      title: "Bu ay tamamlanan",
      value: dashboard.completedThisMonthCount,
      icon: ClipboardCheck,
      href: `/jobs?status=TAMAMLANDI&dateField=completedAt&startDate=${monthStart}&endDate=${monthEnd}`,
    },
    {
      title: "Bekleyen puanlama",
      value: dashboard.pendingScoringCount,
      icon: Clock3,
      href: "/jobs?status=TAMAMLANDI&pendingScoring=1",
    },
    {
      title: "Bu ayın lideri",
      value: dashboard.leader ? `${dashboard.leader.score.toFixed(1)} puan` : "-",
      icon: Trophy,
      href: "/scoreboard",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <Link key={card.title} href={card.href} className="block">
              <Card
                className="border-border/80 bg-card/95 motion-safe:animate-fade-in transition-transform hover:-translate-y-1 hover:border-marine-ocean/30"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-marine-ocean/10 text-marine-ocean">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle className="mt-1 text-2xl text-foreground">{card.value}</CardTitle>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="size-5 text-marine-ocean" />
                Uyarılar
              </CardTitle>
              <CardDescription>
                Kapanış, aylık değerlendirme ve bekleme riski olan başlıklar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.alerts.length > 0 ? (
                dashboard.alerts.map((alert) => {
                  const content = (
                    <>
                      <div className="font-medium">{alert.title}</div>
                      <div className="mt-1 text-sm opacity-90">{alert.description}</div>
                      {alert.href ? (
                        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] opacity-90">
                          Detayları gör
                        </div>
                      ) : null}
                    </>
                  );

                  return alert.href ? (
                    <Link
                      key={alert.id}
                      href={alert.href}
                      className={`block rounded-2xl border px-4 py-4 transition-transform hover:-translate-y-0.5 ${alertToneStyles[alert.tone]}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={alert.id}
                      className={`rounded-2xl border px-4 py-4 ${alertToneStyles[alert.tone]}`}
                    >
                      {content}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-8 text-sm text-muted-foreground">
                  Şu anda kritik bir operasyon uyarısı bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MapPin className="size-5 text-marine-ocean" />
                Lokasyon bazlı dağılım
              </CardTitle>
              <CardDescription>
                Aktif iş emirleri lokasyona göre gruplanmıştır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.myJobs.length > 0 ? (
                dashboard.myJobs.map((group) => (
                  <div
                    key={group.location}
                    className="rounded-[24px] border border-border bg-muted/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{group.location}</div>
                        <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {group.jobs.length} aktif iş
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.jobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:border-marine-ocean/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-foreground">{job.boatName}</div>
                              <div className="text-sm text-muted-foreground">{job.categoryName}</div>
                            </div>
                            <StatusBadge status={job.status} />
                          </div>
                          <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {job.timeLabel} operasyon referansı
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-8 text-sm text-muted-foreground">
                  Bu kullanıcı için aktif iş ataması bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="size-5 text-marine-ocean" />
                Son 30 gün aktivite
              </CardTitle>
              <CardDescription>
                Kayıt, tamamlama ve kapanış hareketlerinin günlük ritmi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityChart data={dashboard.activity} />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Trophy className="size-5 text-marine-ocean" />
                Bu ay top 5
              </CardTitle>
              <CardDescription>Aylık toplam puana göre mini sıralama.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.topFive.length > 0 ? (
                dashboard.topFive.map((entry) => (
                  <Link
                    key={entry.user.id}
                    href="/scoreboard"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-4 transition-colors hover:border-marine-ocean/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-marine-navy text-sm font-semibold text-white">
                        {entry.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{entry.user.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Is puani {entry.jobScore.toFixed(1)}</span>
                          {entry.hasMissingEval ? (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-amber-700"
                            >
                              Değerlendirme bekleniyor
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">{entry.total.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">{entry.badges.length} rozet</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-8 text-sm text-muted-foreground">
                  Bu ay için henüz leaderboard verisi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
