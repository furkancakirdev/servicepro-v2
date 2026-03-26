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
import {
  type PersonnelActivationFlash,
  getSettingsPageData,
} from "@/lib/settings";

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
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:px-6">
          <h1 className="mt-2 text-2xl font-semibold text-marine-navy">Ayarlar</h1>
        </div>

        <SettingsAlerts
          badgeCalculated={badgeCalculated}
          reviewedJobId={reviewedJobId}
          errorMessage={errorMessage}
          personnelActivation={personnelActivation}
          toastKey={toastKey}
        />

        <Tabs defaultValue={selectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="team">Personel</TabsTrigger>
            <TabsTrigger value="boats">Tekneler</TabsTrigger>
            <TabsTrigger value="categories">Kategoriler</TabsTrigger>
            <TabsTrigger value="system">İşleyiş</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <SettingsProfileTab viewer={viewer} />
          </TabsContent>

          <TabsContent value="team">
            <SettingsTeamTab users={users} personnelAuditLogs={personnelAuditLogs} />
          </TabsContent>

          <TabsContent value="boats">
            <SettingsBoatsTab boats={boats} />
          </TabsContent>

          <TabsContent value="categories">
            <SettingsCategoriesTab categories={categories} />
          </TabsContent>

          <TabsContent value="system">
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
      </div>
    );
  } catch (error) {
    console.error("[Settings] Veri yüklenemedi:", error);

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-base text-slate-600">Ayarlar yüklenemedi.</p>
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
