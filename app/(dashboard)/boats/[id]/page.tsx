import { notFound } from "next/navigation";
import { Crown, MessageCircle, Ship, Users2 } from "lucide-react";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { createBoatContactAction, updateBoatProfileAction } from "@/app/(dashboard)/boats/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

type BoatDetailPageProps = {
  params: {
    id: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BoatDetailPage({
  params,
  searchParams,
}: BoatDetailPageProps) {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);

  const boat = await prisma.boat.findUnique({
    where: {
      id: params.id,
    },
    include: {
      contacts: {
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            name: "asc",
          },
        ],
      },
      jobs: {
        include: {
          category: true,
          assignments: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
    },
  });

  if (!boat) {
    notFound();
  }

  const updated = takeFirstValue(searchParams?.updated) === "1";
  const contactCreated = takeFirstValue(searchParams?.contact) === "1";

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white px-5 py-6 shadow-panel sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
                Tekne Profili
              </p>
              {boat.isVip ? (
                <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                  <Crown className="size-3.5" />
                  VIP
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-marine-navy">{boat.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {boat.type} · {boat.homePort ?? "Ana marina bekleniyor"} · {boat.visitCount} ziyaret
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <div className="font-medium text-marine-navy">Birincil irtibat</div>
            <div className="mt-2">
              {boat.contacts.find((contact) => contact.isPrimary)?.name ?? "Secilmedi"}
            </div>
          </div>
        </div>
      </section>

      {updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Tekne profili guncellendi.
        </div>
      ) : null}

      {contactCreated ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Yeni irtibat kaydi olusturuldu.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-marine-navy">Tekne bilgileri</CardTitle>
              <CardDescription>
                Ana marina, bayrak, sahip ve operasyon notlarini guncelleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateBoatProfileAction} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="boatId" value={boat.id} />
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Sahip / owner</Label>
                  <Input id="ownerName" name="ownerName" defaultValue={boat.ownerName ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homePort">Ana marina</Label>
                  <Input id="homePort" name="homePort" defaultValue={boat.homePort ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flag">Bayrak</Label>
                  <Input id="flag" name="flag" defaultValue={boat.flag ?? ""} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="internalNotes">Ic notlar</Label>
                  <Textarea
                    id="internalNotes"
                    name="internalNotes"
                    defaultValue={boat.internalNotes ?? ""}
                    className="min-h-[140px]"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="h-12 bg-marine-navy text-white hover:bg-marine-ocean">
                    Tekne profilini kaydet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-marine-navy">Servis gecmisi</CardTitle>
              <CardDescription>
                Son 12 is kaydi, kategori ve gorevli ekip listesi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {boat.jobs.length > 0 ? (
                boat.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-marine-navy">{job.category.name}</div>
                        <div className="mt-1">
                          {format(job.createdAt, "dd MMM yyyy", { locale: tr })}
                        </div>
                      </div>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                      {job.assignments.map((assignment) => assignment.user.name).join(", ") || "Atama yok"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  Bu tekne icin servis kaydi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Users2 className="size-5 text-marine-ocean" />
                Irtibat kisileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {boat.contacts.length > 0 ? (
                boat.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-marine-navy">{contact.name}</div>
                        <div className="mt-1">
                          {contact.role} · {contact.language}
                        </div>
                      </div>
                      {contact.isPrimary ? (
                        <Badge className="bg-marine-navy text-white hover:bg-marine-navy">
                          Primary
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-1">
                      <div>{contact.phone ?? "Telefon yok"}</div>
                      <div>{contact.email ?? "E-posta yok"}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                      <MessageCircle className="size-3.5" />
                      {contact.whatsappOptIn ? "WhatsApp izinli" : "WhatsApp kapali"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Henuz irtibat eklenmedi.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Ship className="size-5 text-marine-ocean" />
                Yeni irtibat ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createBoatContactAction} className="space-y-4">
                <input type="hidden" name="boatId" value={boat.id} />
                <div className="space-y-2">
                  <Label htmlFor="name">Ad soyad</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Input id="role" name="role" placeholder="Kaptan / Sahip / Marina" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Dil</Label>
                  <Input id="language" name="language" defaultValue="TR" />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" name="isPrimary" className="size-4 rounded border-slate-300" />
                  Birincil iletisim yap
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" name="whatsappOptIn" defaultChecked className="size-4 rounded border-slate-300" />
                  WhatsApp iletisimi acik
                </label>
                <Button type="submit" className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean">
                  Irtibat kaydini ekle
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
