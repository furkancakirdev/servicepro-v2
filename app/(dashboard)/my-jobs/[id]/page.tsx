import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, MessageCircle, Phone, Wrench } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import {
  buildClientNotificationTemplate,
  buildWhatsAppDeepLink,
} from "@/lib/client-notifications";
import { getMyJobDetail } from "@/lib/my-jobs";

type MyJobDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function MyJobDetailPage({ params }: MyJobDetailPageProps) {
  const currentUser = await requireRoles([Role.TECHNICIAN]);
  const data = await getMyJobDetail({
    jobId: params.id,
    currentUserId: currentUser.id,
    currentUserRole: currentUser.role,
  });

  if (!data) {
    notFound();
  }

  const { job, recentVisits } = data;
  const operationalReference = job.startedAt ?? job.createdAt;
  const primaryContact =
    job.boat.contacts.find((contact) => contact.isPrimary && contact.phone) ??
    job.boat.contacts.find((contact) => contact.phone) ??
    null;
  const waTemplate = primaryContact
    ? buildClientNotificationTemplate({
        boatName: job.boat.name,
        categoryName: job.category.name,
        date: operationalReference,
        location: job.location,
        berthDetail: job.location,
        technicianName:
          job.assignments.find((assignment) => assignment.role === "SORUMLU")?.user.name ??
          currentUser.name,
        contactName: primaryContact.name,
        contactLanguage: primaryContact.language,
      })
    : null;
  const waLink =
    primaryContact?.phone && waTemplate
      ? buildWhatsAppDeepLink(primaryContact.phone, waTemplate.text)
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white px-5 py-6 shadow-panel sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
                Mobil İş Detayı
              </p>
              {job.boat.isVip ? (
                <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                  <Crown className="size-3.5" />
                  VIP
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-marine-navy">{job.boat.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {job.category.name} · x{job.multiplier.toFixed(1)} · {job.location ?? "Lokasyon bekleniyor"}
            </p>
          </div>
          <Badge variant="outline">
            {job.assignments.find((assignment) => assignment.userId === currentUser.id)?.role ===
            "SORUMLU"
              ? "Sorumlu"
              : "Destek"}
          </Badge>
        </div>
      </section>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-marine-navy">Operasyon bilgisi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="font-medium text-marine-navy">Açıklama</div>
            <div className="mt-2 leading-7">{job.description}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="font-medium text-marine-navy">Saat</div>
              <div className="mt-2">
                {format(operationalReference, "dd MMM yyyy HH:mm", { locale: tr })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="font-medium text-marine-navy">Lokasyon</div>
              <div className="mt-2">{job.location ?? "Lokasyon bekleniyor"}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="font-medium text-marine-navy">Destek ekibi</div>
            <div className="mt-2">
              {job.assignments
                .filter((assignment) => assignment.role === "DESTEK")
                .map((assignment) => assignment.user.name)
                .join(", ") || "Destek personeli yok"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="text-marine-navy">İrtibat ve servis geçmişi</CardTitle>
          <CardDescription>
            Son 3 ziyaret ve tekne irtibat akışı burada görünür.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {primaryContact ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="font-medium text-marine-navy">{primaryContact.name}</div>
              <div className="mt-1 text-sm text-slate-600">
                {primaryContact.role} · {primaryContact.language}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {primaryContact.phone ? (
                  <a
                    href={waLink ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp ac
                  </a>
                ) : null}
                {primaryContact.phone ? (
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5"
                  >
                    <Phone className="size-4" />
                    Ara
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Kayıtlı telefonlu irtibat bulunmuyor.
            </div>
          )}

          <div className="space-y-3">
            {recentVisits.length > 0 ? (
              recentVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
                >
                  <div className="font-medium text-marine-navy">{visit.category.name}</div>
                  <div className="mt-1">
                    {format(visit.createdAt, "dd MMM yyyy", { locale: tr })}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {visit.assignments.map((assignment) => assignment.user.name).join(", ")}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Bu tekne icin onceki ziyaret kaydi bulunmuyor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Link href={`/jobs/${job.id}?closeout=1`} className="block">
        <Button size="lg" className="h-14 w-full bg-marine-navy text-white hover:bg-marine-ocean">
          <Wrench className="mr-2 size-5" />
          Teslim Raporu Doldur
        </Button>
      </Link>
    </div>
  );
}
