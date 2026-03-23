"use client";

import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import NotificationBell from "@/components/layout/NotificationBell";
import { SidebarContent } from "@/components/layout/Sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NotificationCenterData } from "@/types";

function getHeaderCopy(pathname: string) {
  if (pathname === "/" || pathname === "/dashboard") {
    return { eyebrow: "Operasyon Merkezi", title: "Dashboard" };
  }

  if (pathname.startsWith("/jobs/new")) {
    return { eyebrow: "Planlama", title: "Yeni ??" };
  }

  if (pathname.startsWith("/jobs/")) {
    return { eyebrow: "Operasyon", title: "?? Detayı" };
  }

  if (pathname.startsWith("/jobs")) {
    return { eyebrow: "Gunluk ?? Akisi", title: "?? Listesi" };
  }

  if (pathname.startsWith("/dispatch/weekly")) {
    return { eyebrow: "ERP Planlama", title: "Haftalik Dispatch" };
  }

  if (pathname.startsWith("/dispatch")) {
    return { eyebrow: "ERP Planlama", title: "Dispatch Board" };
  }

  if (pathname.startsWith("/my-jobs/weekly")) {
    return { eyebrow: "Mobil Operasyon", title: "Haftam" };
  }

  if (pathname.startsWith("/my-jobs/")) {
    return { eyebrow: "Mobil Operasyon", title: "?? Detayı" };
  }

  if (pathname.startsWith("/my-jobs")) {
    return { eyebrow: "Mobil Operasyon", title: "Bugünku ??lerim" };
  }

  if (pathname.startsWith("/boats/")) {
    return { eyebrow: "Filo", title: "Tekne Profili" };
  }

  if (pathname.startsWith("/boats")) {
    return { eyebrow: "Filo", title: "Tekneler" };
  }

  if (pathname.startsWith("/scoreboard")) {
    return { eyebrow: "Performans", title: "Puan Tablosu" };
  }

  if (pathname.startsWith("/settings")) {
    return { eyebrow: "Yönetim", title: "Ayarlar" };
  }

  return { eyebrow: "ServicePRO", title: "Panel" };
}

type HeaderUser = {
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  isPreview: boolean;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Koordinatör",
  TECHNICIAN: "Teknisyen",
  WORKSHOP_CHIEF: "Usta",
};

export default function Header({
  currentUser,
  notificationCenter,
}: {
  currentUser: HeaderUser;
  notificationCenter: NotificationCenterData;
}) {
  const pathname = usePathname() ?? "/";
  const current = getHeaderCopy(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="border-marine-ocean/20 bg-white text-marine-navy md:hidden"
                />
              }
            >
              <PanelLeft className="size-4" />
              <span className="sr-only">Navigasyonu ac</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-sm bg-marine-navy p-0 text-white">
              <SheetHeader className="border-b border-white/10">
                <SheetTitle className="text-white">ServicePRO menu</SheetTitle>
              </SheetHeader>
              <SidebarContent compact currentUser={currentUser} />
            </SheetContent>
          </Sheet>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marine-ocean">
              {current.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-marine-navy">
              {current.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right text-sm text-slate-600 lg:block">
            <div className="font-medium text-marine-navy">
              {format(new Date(), "d MMMM yyyy", { locale: tr })}
            </div>
            <div>Sabah operasyon penceresi a??k</div>
          </div>

          <NotificationBell notificationCenter={notificationCenter} />

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <Avatar size="lg" className="bg-marine-navy text-white">
              <AvatarFallback className="bg-marine-navy text-white">
                {currentUser.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-sm sm:block">
              <div className="font-medium text-marine-navy">{currentUser.name}</div>
              <div className="text-slate-500">
                {roleLabels[currentUser.role]} | {currentUser.email}
              </div>
              {currentUser.isPreview ? (
                <div className="text-xs text-amber-600">Preview modu</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

