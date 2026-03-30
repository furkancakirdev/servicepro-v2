"use client";

import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import LogoutButton from "@/components/layout/LogoutButton";
import NotificationBell from "@/components/layout/NotificationBell";
import { SidebarContent } from "@/components/layout/Sidebar";
import ThemeToggle from "@/components/layout/ThemeToggle";
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
    return { eyebrow: "Planlama", title: "Yeni İş" };
  }

  if (pathname.startsWith("/jobs/")) {
    return { eyebrow: "Operasyon", title: "İş Detayı" };
  }

  if (pathname.startsWith("/jobs")) {
    return { eyebrow: "Günlük İş Akışı", title: "İş Listesi" };
  }

  if (pathname.startsWith("/dispatch/weekly")) {
    return { eyebrow: "ERP Planlama", title: "Haftalık Dispatch" };
  }

  if (pathname.startsWith("/dispatch")) {
    return { eyebrow: "ERP Planlama", title: "Dispatch Board" };
  }

  if (pathname.startsWith("/my-jobs/weekly")) {
    return { eyebrow: "Mobil Operasyon", title: "Haftam" };
  }

  if (pathname.startsWith("/my-jobs/")) {
    return { eyebrow: "Mobil Operasyon", title: "İş Detayı" };
  }

  if (pathname.startsWith("/my-jobs")) {
    return { eyebrow: "Mobil Operasyon", title: "Bugünkü İşlerim" };
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
  todayLabel,
  operationsStatus,
}: {
  currentUser: HeaderUser;
  notificationCenter: NotificationCenterData;
  todayLabel: string;
  operationsStatus: string;
}) {
  const pathname = usePathname() ?? "/";
  const current = getHeaderCopy(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-card/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="border-border/70 bg-card/80 text-foreground shadow-sm backdrop-blur md:hidden"
                />
              }
            >
              <PanelLeft className="size-4" />
              <span className="sr-only">Navigasyonu aç</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[86vw] max-w-sm bg-marine-navy p-0 text-white motion-safe:animate-slide-in-right"
            >
              <SheetHeader className="border-b border-white/10">
                <SheetTitle className="text-white">ServicePRO menü</SheetTitle>
              </SheetHeader>
              <SidebarContent compact currentUser={currentUser} />
            </SheetContent>
          </Sheet>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marine-ocean">
              {current.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">{current.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-border/70 bg-card/80 px-4 py-2 text-right text-sm text-muted-foreground backdrop-blur lg:block">
            <div className="font-medium text-foreground">{todayLabel}</div>
            <div>{operationsStatus}</div>
          </div>

          <ThemeToggle />
          <NotificationBell notificationCenter={notificationCenter} />
          <LogoutButton compact className="hidden sm:inline-flex" />

          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 px-3 py-2 backdrop-blur">
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
              <div className="font-medium text-foreground">{currentUser.name}</div>
              <div className="text-muted-foreground">
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
