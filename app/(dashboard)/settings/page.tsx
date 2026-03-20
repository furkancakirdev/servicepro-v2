import Link from "next/link";
import { Role } from "@prisma/client";
import {
  Anchor,
  Award,
  CalendarClock,
  Settings2,
  ShieldCheck,
  Tags,
  Trophy,
  Users2,
} from "lucide-react";

import { reviewScoreObjectionAction } from "@/app/(dashboard)/jobs/actions";
import {
  calculateMonthlyBadgesAction,
  createCategoryAction,
  createPersonnelAction,
  saveBoatAction,
  saveCategoryAction,
  saveSystemSettingsAction,
  updatePersonnelRoleAction,
} from "@/app/(dashboard)/settings/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRoles } from "@/lib/auth";
import { calculateYearlyBadgeStandings } from "@/lib/badges";
import { boatTypeOptions } from "@/lib/jobs";
import { getScoreObjectionQueue } from "@/lib/objections";
import { prisma } from "@/lib/prisma";
import { MAX_ON_HOLD_DAYS, getOnHoldDefaultDays } from "@/lib/system-settings";

type SettingsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const yearCardStyles = [
  "border-amber-300 bg-amber-50",
  "border-slate-300 bg-slate-50",
  "border-orange-300 bg-orange-50",
] as const;
const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Koordinator",
  TECHNICIAN: "Teknisyen",
  WORKSHOP_CHIEF: "Usta",
};
const boatTypeChoices = [...new Set([...boatTypeOptions, "OTHER"])];

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseSelectedYear(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2024 && parsed <= 2100 ? parsed : fallback;
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean";
const textareaClassName =
  "min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean";

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const viewer = await requireRoles([Role.ADMIN]);
  const now = new Date();
  const selectedYear = parseSelectedYear(
    takeFirstValue(searchParams?.year),
    now.getFullYear()
  );
  const [yearlyStandings, objectionQueue, users, boats, categories, onHoldDefaultDays] =
    await Promise.all([
    calculateYearlyBadgeStandings(selectedYear),
    getScoreObjectionQueue(6),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),
    prisma.boat.findMany({
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.serviceCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        subScope: true,
        multiplier: true,
        brandHints: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    getOnHoldDefaultDays(),
  ]);
  const badgeCalculated = takeFirstValue(searchParams?.badge) === "1";
  const reviewedJobId = takeFirstValue(searchParams?.reviewed);
  const errorMessage = takeFirstValue(searchParams?.error);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:px-6">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
          System
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-marine-navy">Ayarlar</h1>
      </div>

      {badgeCalculated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Aylik rozet hesaplamasi tamamlandi. Dashboard, scoreboard ve bildirimler
          yenilendi.
        </div>
      ) : null}

      {reviewedJobId ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {reviewedJobId.slice(0, 8)} numarali is icin puanlama guncellendi ve ekip
          bilgilendirildi.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMessage)}
        </div>
      ) : null}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 gap-2 lg:grid-cols-5">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="team">Personel</TabsTrigger>
          <TabsTrigger value="boats">Tekneler</TabsTrigger>
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="system">Sistem</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Users2 className="size-5 text-marine-ocean" />
                Profil ayarlari
              </CardTitle>
              <CardDescription>
                Giris yapan kullanici: {viewer.name} ({viewer.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Ad Soyad
                </div>
                <div className="mt-2 font-medium text-marine-navy">{viewer.name}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Email
                </div>
                <div className="mt-2 font-medium text-marine-navy">{viewer.email}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Rol
                </div>
                <div className="mt-2 font-medium text-marine-navy">
                  {roleLabels[viewer.role]}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-marine-navy">
                  <ShieldCheck className="size-5 text-marine-ocean" />
                  Yeni personel kaydi
                </CardTitle>
                <CardDescription>
                  Bu form veritabani kullanicisini olusturur. Supabase auth hesabi gerekiyorsa
                  ayrica acilmalidir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createPersonnelAction} className="space-y-4">
                  <div>
                    <label htmlFor="personnel-name" className="mb-2 block text-sm font-medium text-marine-navy">
                      Ad soyad
                    </label>
                    <input id="personnel-name" name="name" required className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="personnel-email" className="mb-2 block text-sm font-medium text-marine-navy">
                      Email
                    </label>
                    <input
                      id="personnel-email"
                      name="email"
                      type="email"
                      required
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="personnel-role" className="mb-2 block text-sm font-medium text-marine-navy">
                      Rol
                    </label>
                    <select id="personnel-role" name="role" defaultValue={Role.TECHNICIAN} className={inputClassName}>
                      {Object.entries(roleLabels).map(([role, label]) => (
                        <option key={role} value={role}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
                  >
                    Personel Kaydet
                  </button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-marine-navy">
                  <Users2 className="size-5 text-marine-ocean" />
                  Personel listesi
                </CardTitle>
                <CardDescription>
                  Rol degisikligi aninda kaydedilir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.map((user) => (
                  <form
                    key={user.id}
                    action={updatePersonnelRoleAction}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <div>
                      <div className="font-medium text-marine-navy">{user.name}</div>
                      <div className="text-sm text-slate-600">{user.email}</div>
                    </div>
                    <select name="role" defaultValue={user.role} className={inputClassName}>
                      {Object.entries(roleLabels).map(([role, label]) => (
                        <option key={role} value={role}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                    >
                      Rolu Kaydet
                    </button>
                  </form>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="boats" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-marine-navy">
                  <Anchor className="size-5 text-marine-ocean" />
                  Yeni tekne
                </CardTitle>
                <CardDescription>
                  Yeni tekne kaydi aktif olarak olusturulur ve daha sonra listeden
                  pasife alinabilir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={saveBoatAction} className="space-y-4">
                  <div>
                    <label htmlFor="boat-name" className="mb-2 block text-sm font-medium text-marine-navy">
                      Tekne adi
                    </label>
                    <input id="boat-name" name="name" required className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="boat-type" className="mb-2 block text-sm font-medium text-marine-navy">
                      Tekne tipi
                    </label>
                    <select id="boat-type" name="type" defaultValue={boatTypeChoices[0]} className={inputClassName}>
                      {boatTypeChoices.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="boat-owner" className="mb-2 block text-sm font-medium text-marine-navy">
                      Owner
                    </label>
                    <input id="boat-owner" name="ownerName" className={inputClassName} />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
                  >
                    Tekne Kaydet
                  </button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-marine-navy">
                  <Anchor className="size-5 text-marine-ocean" />
                  Tekne listesi
                </CardTitle>
                <CardDescription>
                  Is sayisi ile birlikte mevcut tekne kayitlarini duzenleyin ve
                  gerekirse pasife alin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {boats.map((boat) => (
                  <form
                    key={boat.id}
                    action={saveBoatAction}
                    className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <input type="hidden" name="boatId" value={boat.id} />
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-marine-navy">{boat.name}</div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                          boat.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {boat.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input name="name" defaultValue={boat.name} className={inputClassName} />
                      <select name="type" defaultValue={boat.type} className={inputClassName}>
                        {boatTypeChoices.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <input
                        name="ownerName"
                        defaultValue={boat.ownerName ?? ""}
                        placeholder="Owner"
                        className={inputClassName}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={boat.isActive}
                          className="size-4 rounded border-slate-300"
                        />
                        Tekne aktif kayitlarda gorunsun
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Toplam is: {boat._count.jobs}
                        </div>
                        <button
                          type="submit"
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                        >
                          {boat.isActive ? "Kaydet / Pasife Al" : "Kaydet / Aktif Et"}
                        </button>
                      </div>
                    </div>
                  </form>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Tags className="size-5 text-marine-ocean" />
                Yeni kategori
              </CardTitle>
              <CardDescription>
                Zorluk carpani, sira ve marka ipucu ile yeni servis kategorisi ekleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCategoryAction} className="grid gap-3 lg:grid-cols-[1fr_1.2fr_120px_120px_1fr_auto]">
                <input name="name" placeholder="Kategori" className={inputClassName} required />
                <input
                  name="subScope"
                  placeholder="Alt kapsam"
                  className={inputClassName}
                  required
                />
                <input
                  name="multiplier"
                  type="number"
                  min={1}
                  max={3}
                  step={0.5}
                  defaultValue={1}
                  className={inputClassName}
                  required
                />
                <input
                  name="sortOrder"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={categories.length + 1}
                  className={inputClassName}
                  required
                />
                <input name="brandHints" placeholder="Marka ipucu" className={inputClassName} />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-marine-navy px-4 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
                >
                  Ekle
                </button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Tags className="size-5 text-marine-ocean" />
                Kategori tablosu
              </CardTitle>
              <CardDescription>
                Carpan, sira ve aktiflik bilgilerini aninda duzenleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((category) => (
                <form
                  key={category.id}
                  action={saveCategoryAction}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input type="hidden" name="categoryId" value={category.id} />
                  <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_120px_120px_1fr_auto]">
                    <input name="name" defaultValue={category.name} className={inputClassName} />
                    <input
                      name="subScope"
                      defaultValue={category.subScope}
                      className={inputClassName}
                    />
                    <input
                      name="multiplier"
                      type="number"
                      min={1}
                      max={3}
                      step={0.5}
                      defaultValue={category.multiplier}
                      className={inputClassName}
                    />
                    <input
                      name="sortOrder"
                      type="number"
                      min={1}
                      max={999}
                      defaultValue={category.sortOrder}
                      className={inputClassName}
                    />
                    <input
                      name="brandHints"
                      defaultValue={category.brandHints ?? ""}
                      className={inputClassName}
                    />
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                    >
                      Kaydet
                    </button>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={category.isActive}
                      className="size-4 rounded border-slate-300"
                    />
                    Aktif kategori
                  </label>
                </form>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-marine-navy">
                  <Settings2 className="size-5 text-marine-ocean" />
                  Aylik rozet hesaplama
                </CardTitle>
                <CardDescription>
                  Ay sonu cron yerine manuel tetikleme ile rozetleri ve ilgili bildirimleri
                  olustur.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={calculateMonthlyBadgesAction} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="month" className="mb-2 block text-sm font-medium text-marine-navy">
                        Ay
                      </label>
                      <input
                        id="month"
                        name="month"
                        type="number"
                        min={1}
                        max={12}
                        defaultValue={now.getMonth() + 1}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label htmlFor="year" className="mb-2 block text-sm font-medium text-marine-navy">
                        Yil
                      </label>
                      <input
                        id="year"
                        name="year"
                        type="number"
                        min={2024}
                        max={2100}
                        defaultValue={now.getFullYear()}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-marine-navy px-4 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
                  >
                    Rozet Hesaplamasini Calistir
                  </button>
                </form>

                <form action={saveSystemSettingsAction} className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <label
                      htmlFor="onHoldDefaultDays"
                      className="mb-2 block text-sm font-medium text-marine-navy"
                    >
                      Varsayilan ON_HOLD gunu
                    </label>
                    <input
                      id="onHoldDefaultDays"
                      name="onHoldDefaultDays"
                      type="number"
                      min={1}
                      max={MAX_ON_HOLD_DAYS}
                      defaultValue={onHoldDefaultDays}
                      className={inputClassName}
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    Is detayindaki bekletme formu bu degeri ilk onerilen hatirlatma gunu
                    olarak kullanir.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                  >
                    Sistem Ayarini Kaydet
                  </button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-marine-navy">
                  <CalendarClock className="size-5 text-marine-ocean" />
                  Yil sonu puanlari
                </CardTitle>
                <CardDescription>
                  Yil puani = toplam rozet sayisi x 3. Ilk 3 personel altin odul sunumuyla
                  vurgulanir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action="/settings" className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="number"
                    name="year"
                    min={2024}
                    max={2100}
                    defaultValue={selectedYear}
                    className={inputClassName}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                  >
                    Yili Goster
                  </button>
                </form>

                {yearlyStandings.length > 0 ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      {yearlyStandings.slice(0, 3).map((entry, index) => (
                        <div
                          key={entry.user.id}
                          className={`rounded-2xl border px-4 py-4 ${yearCardStyles[index] ?? yearCardStyles[2]}`}
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            #{entry.rank}
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-marine-navy">
                            <Award className="size-4" />
                            <span className="font-semibold">{entry.user.name}</span>
                          </div>
                          <div className="mt-3 text-2xl font-semibold text-marine-navy">
                            {entry.yearScore}
                          </div>
                          <div className="text-sm text-slate-600">
                            {entry.badgeCount} rozet
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {yearlyStandings.map((entry) => (
                        <div
                          key={entry.user.id}
                          className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium text-marine-navy">
                              #{entry.rank} {entry.user.name}
                            </div>
                            <div className="text-slate-500">{entry.badgeCount} rozet</div>
                          </div>
                          <div className="font-semibold text-marine-navy">
                            {entry.yearScore} puan
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                    {selectedYear} icin henuz rozet verisi bulunmuyor.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-marine-navy">
                <Trophy className="size-5 text-marine-ocean" />
                Puan itirazlari ve admin incelemesi
              </CardTitle>
              <CardDescription>
                30 gun icindeki itirazlar burada listelenir. Duzenleme yapildiginda log ve
                personel bildirimi olusturulur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {objectionQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
                  Incelenmeyi bekleyen puan itirazi bulunmuyor.
                </div>
              ) : (
                objectionQueue.map((item) => (
                  <div
                    key={item.logId}
                    className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-marine-ocean">
                          Is #{item.jobId.slice(0, 8)}
                        </div>
                        <h3 className="text-lg font-semibold text-marine-navy">
                          {item.boatName} - {item.categoryName}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Itiraz sahibi: {item.submittedBy.name}
                        </p>
                        <p className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                          {item.reason}
                        </p>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                          Atanan ekip: {item.assignedNames.join(", ") || "Kayit yok"}
                        </p>
                      </div>

                      <Link
                        href={`/jobs/${item.jobId}`}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                      >
                        Is Detayini Ac
                      </Link>
                    </div>

                    <form action={reviewScoreObjectionAction} className="mt-5 space-y-4">
                      <input type="hidden" name="jobId" value={item.jobId} />
                      <input type="hidden" name="objectionLogId" value={item.logId} />

                      <div className="grid gap-3 md:grid-cols-5">
                        {[
                          ["q1_unit", "S1"],
                          ["q2_photos", "S2"],
                          ["q3_parts", "S3"],
                          ["q4_sub", "S4"],
                          ["q5_notify", "S5"],
                        ].map(([fieldName, label], index) => (
                          <div key={`${item.logId}-${fieldName}`}>
                            <label
                              htmlFor={`${item.logId}-${fieldName}`}
                              className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                            >
                              {label}
                            </label>
                            <select
                              id={`${item.logId}-${fieldName}`}
                              name={fieldName}
                              defaultValue={item.answers[index]}
                              className={inputClassName}
                            >
                              {[1, 2, 3, 4, 5].map((score) => (
                                <option key={score} value={score}>
                                  {score}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        Mevcut baz puan:{" "}
                        <span className="font-semibold text-marine-navy">
                          {item.currentBaseScore.toFixed(1)}
                        </span>
                      </div>

                      <div>
                        <label
                          htmlFor={`${item.logId}-reason`}
                          className="mb-2 block text-sm font-medium text-marine-navy"
                        >
                          Admin duzenleme notu
                        </label>
                        <textarea
                          id={`${item.logId}-reason`}
                          name="reason"
                          required
                          minLength={10}
                          placeholder="Hangi puanlar neden guncellendi?"
                          className={textareaClassName}
                        />
                      </div>

                      <button
                        type="submit"
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
                      >
                        Puanlamayi Guncelle ve Bilgilendir
                      </button>
                    </form>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
