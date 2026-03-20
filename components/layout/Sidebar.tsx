"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Settings2,
  Ship,
  Trophy,
} from "lucide-react";

import type { NavigationItem } from "@/types";
import { cn } from "@/lib/utils";

function getNavigation(role?: Role): NavigationItem[] {
  if (role === "TECHNICIAN") {
    return [
      {
        href: "/my-jobs",
        label: "Bugun",
        description: "Bugunku atamalar ve saha akisi",
        icon: CalendarDays,
      },
      {
        href: "/my-jobs/weekly",
        label: "Haftam",
        description: "Pazartesi - Cumartesi ozeti",
        icon: CalendarRange,
      },
      {
        href: "/jobs",
        label: "Tum Isler",
        description: "Salt okunur genel is listesi",
        icon: BriefcaseBusiness,
      },
    ];
  }

  return [
    {
      href: "/dashboard",
      label: "Dashboard",
      description: "Genel operasyon gorunumu",
      icon: LayoutDashboard,
    },
    {
      href: "/jobs",
      label: "Is Listesi",
      description: "Is emirleri ve durum takibi",
      icon: BriefcaseBusiness,
    },
    {
      href: "/dispatch",
      label: "Dispatch",
      description: "Gunluk ve haftalik planlama",
      icon: CalendarDays,
    },
    {
      href: "/boats",
      label: "Tekneler",
      description: "VIP, irtibat ve servis gecmisi",
      icon: Ship,
    },
    {
      href: "/scoreboard",
      label: "Puan Tablosu",
      description: "Aylik liderlik ve rozetler",
      icon: Trophy,
    },
    {
      href: "/settings",
      label: "Ayarlar",
      description: "Rol, kategori ve sistem alanlari",
      icon: Settings2,
    },
  ];
}

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }

  return pathname.startsWith(href);
}

type SidebarUser = {
  name: string;
  role: Role;
  isPreview: boolean;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Koordinator",
  TECHNICIAN: "Teknisyen",
  WORKSHOP_CHIEF: "Usta",
};

export function SidebarContent({
  compact = false,
  currentUser,
}: {
  compact?: boolean;
  currentUser?: SidebarUser;
}) {
  const pathname = usePathname() ?? "/";
  const navigation = getNavigation(currentUser?.role);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
          Marlin Yachting
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">ServicePRO</h2>
        <p className="mt-2 max-w-[18rem] text-sm leading-6 text-slate-300">
          Marine servis operasyonlarini, kapanis puanlamasini ve liderlik akisini
          tek yerde toplayan kabuk.
        </p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors",
                active
                  ? "bg-white text-marine-navy shadow-lg shadow-black/10"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-marine-ocean/10 text-marine-ocean"
                    : "bg-white/5 text-slate-300 group-hover:bg-white/10"
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className={compact ? "space-y-0.5" : "space-y-1"}>
                <p className="font-medium">{item.label}</p>
                <p
                  className={cn(
                    "text-xs leading-5",
                    active ? "text-slate-600" : "text-slate-400"
                  )}
                >
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-5 text-xs leading-6 text-slate-400">
        {currentUser ? (
          <div className="space-y-1">
            <div className="font-medium text-white">{currentUser.name}</div>
            <div>{roleLabels[currentUser.role]}</div>
            {currentUser.isPreview ? <div>Preview modu aktif</div> : null}
          </div>
        ) : (
          "ServicePRO navigasyon kabugu"
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ currentUser }: { currentUser?: SidebarUser }) {
  return (
    <aside className="hidden min-h-screen border-r border-white/10 bg-marine-navy md:block">
      <SidebarContent currentUser={currentUser} />
    </aside>
  );
}
