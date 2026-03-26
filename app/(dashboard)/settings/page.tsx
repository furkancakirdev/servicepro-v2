import { cookies } from "next/headers";
import { Role } from "@prisma/client";

import SettingsAlerts from "@/components/settings/SettingsAlerts";
import {
  SettingsBoatsTab,
  SettingsCategoriesTab,
  SettingsProfileTab,
  SettingsSystemTab,
  SettingsTeamTab,
} from "@/components/settings/SettingsTabs";
import { parseSettingsTab } from "@/components/settings/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRoles } from "@/lib/auth";
import { type PersonnelActivationFlash, getSettingsPageData } from "@/lib/settings";

const SETTINGS_PERSONNEL_FLASH_COOKIE = "settings-personnel-activation";

type SettingsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseSelectedYear(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2024 && parsed <= 2100 ? parsed : fallback;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const viewer = await requireRoles([Role.ADMIN]);
  const cookieStore = await cookies();
  const now = new Date();
  const selectedYear = parseSelectedYear(
    takeFirstValue(searchParams?.year),
    now.getFullYear()
  );
  const selectedTab = parseSettingsTab(takeFirstValue(searchParams?.tab));

  try {
    const {
      yearlyStandings,
      objectionQueue,
      users,
      boats,
      categories,
      onHoldDefaultDays,
      personnelAuditLogs,
      systemAuditLogs,
    } = await getSettingsPageData(selectedYear);
    const badgeCalculated = takeFirstValue(searchParams?.badge) === "1";
    const reviewedJobId = takeFirstValue(searchParams?.reviewed);
    const errorMessage = takeFirstValue(searchParams?.error);
    const toastKey = takeFirstValue(searchParams?.toast);
    const personnelActivation = (() => {
      const raw = cookieStore.get(SETTINGS_PERSONNEL_FLASH_COOKIE)?.value;

      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw) as PersonnelActivationFlash;
      } catch {
        return null;
      }
    })();

    return (
      <div className="space-y-5">
        <div className="px-1">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Personel, kategori, tekne ve sistem davranislarini tek merkezden yonetin.
            Bu alan, operasyonu bozmayacak sekilde hizli guncelleme ve audit takibi icin
            duzenlendi.
          </p>
        </div>

        <SettingsAlerts
          badgeCalculated={badgeCalculated}
          reviewedJobId={reviewedJobId}
          errorMessage={errorMessage}
          personnelActivation={personnelActivation}
          toastKey={toastKey}
        />

        <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white/80 p-3 shadow-panel backdrop-blur-sm sm:p-5">
          <Tabs defaultValue={selectedTab} className="space-y-5">
            <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 sm:grid-cols-3 xl:grid-cols-5">
              <TabsTrigger
                value="profile"
                className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 data-[active]:bg-white data-[active]:text-marine-navy data-[active]:shadow-sm"
              >
                Profil
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 data-[active]:bg-white data-[active]:text-marine-navy data-[active]:shadow-sm"
              >
                Personel
              </TabsTrigger>
              <TabsTrigger
                value="boats"
                className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 data-[active]:bg-white data-[active]:text-marine-navy data-[active]:shadow-sm"
              >
                Tekneler
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 data-[active]:bg-white data-[active]:text-marine-navy data-[active]:shadow-sm"
              >
                Kategoriler
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 data-[active]:bg-white data-[active]:text-marine-navy data-[active]:shadow-sm"
              >
                Isleyis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="min-w-0">
              <SettingsProfileTab viewer={viewer} />
            </TabsContent>

            <TabsContent value="team" className="min-w-0">
              <SettingsTeamTab users={users} personnelAuditLogs={personnelAuditLogs} />
            </TabsContent>

            <TabsContent value="boats" className="min-w-0">
              <SettingsBoatsTab boats={boats} />
            </TabsContent>

            <TabsContent value="categories" className="min-w-0">
              <SettingsCategoriesTab categories={categories} />
            </TabsContent>

            <TabsContent value="system" className="min-w-0">
              <SettingsSystemTab
                currentDate={now}
                selectedYear={selectedYear}
                onHoldDefaultDays={onHoldDefaultDays}
                yearlyStandings={yearlyStandings}
                objectionQueue={objectionQueue}
                systemAuditLogs={systemAuditLogs}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    );
  } catch (error) {
    console.error("[Settings] Veri yuklenemedi:", error);

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-base text-slate-600">Ayarlar yuklenemedi.</p>
        <a
          href="/settings"
          className="rounded-xl bg-marine-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-marine-ocean"
        >
          Yeniden Dene
        </a>
      </div>
    );
  }
}
