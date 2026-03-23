import Link from "next/link";
import { Crown, Ship, Users2 } from "lucide-react";
import { JobStatus, Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BoatsPage() {
  await requireRoles([Role.ADMIN, Role.COORDINATOR, Role.WORKSHOP_CHIEF]);

  const boats = await prisma.boat.findMany({
    include: {
      contacts: true,
      jobs: {
        where: {
          status: {
            in: [JobStatus.TAMAMLANDI, JobStatus.KAPANDI],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          createdAt: true,
        },
      },
      _count: {
        select: {
          jobs: true,
          contacts: true,
        },
      },
    },
    orderBy: [
      {
        isVip: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white px-5 py-6 shadow-panel sm:px-6">
        <h1 className="mt-2 text-3xl font-semibold text-marine-navy">Tekneler</h1>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {boats.map((boat) => (
          <Link key={boat.id} href={`/boats/${boat.id}`}>
            <Card className="h-full border-white/80 bg-white/95 transition-transform hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardDescription>{boat.type}</CardDescription>
                    <CardTitle className="mt-2 text-xl text-marine-navy">
                      {boat.name}
                    </CardTitle>
                  </div>
                  {boat.isVip ? (
                    <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                      <Crown className="size-3.5" />
                      VIP
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <Ship className="mb-2 size-4 text-marine-ocean" />
                  {boat.homePort ? (
                    <div className="font-medium text-marine-navy">{boat.homePort}</div>
                  ) : null}
                  {boat.flag ? <div className="mt-1">{boat.flag}</div> : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <Users2 className="mb-2 size-4 text-marine-ocean" />
                  <div className="font-medium text-marine-navy">{boat._count.contacts} irtibat</div>
                  <div className="mt-1">{boat.visitCount} ziyaret</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <div className="font-medium text-marine-navy">Son servis</div>
                  <div className="mt-2">
                    {boat.jobs[0]?.createdAt
                      ? new Date(boat.jobs[0].createdAt).toLocaleDateString("tr-TR")
                      : "Kayit yok"}
                  </div>
                  <div className="mt-1">{boat._count.jobs} toplam is</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
