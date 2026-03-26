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
  createCategoryAction,
  createPersonnelAction,
  saveBoatAction,
  saveCategoryAction,
  saveSystemSettingsAction,
  updatePersonnelRoleAction,
} from "@/app/(dashboard)/settings/actions";
import MonthlyBadgeCalculator from "@/components/settings/MonthlyBadgeCalculator";
import {
  settingsBoatTypeChoices,
  settingsInputClassName,
  settingsRoleLabels,
  settingsTextareaClassName,
  settingsYearCardStyles,
} from "@/components/settings/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SettingsBoat, SettingsCategory, SettingsUser } from "@/lib/settings";
import { MAX_ON_HOLD_DAYS } from "@/lib/system-settings";
import type { AppUser, ScoreObjectionQueueItem, YearlyBadgeStanding } from "@/types";

type ViewerProps = {
  viewer: Pick<AppUser, "name" | "email" | "role">;
};

type TeamTabProps = {
  users: SettingsUser[];
};

type BoatsTabProps = {
  boats: SettingsBoat[];
};

type CategoriesTabProps = {
  categories: SettingsCategory[];
};

type SystemTabProps = {
  currentDate: Date;
  selectedYear: number;
  onHoldDefaultDays: number;
  yearlyStandings: YearlyBadgeStanding[];
  objectionQueue: ScoreObjectionQueueItem[];
};

export function SettingsProfileTab({ viewer }: ViewerProps) {
  return (
    <Card className="border-white/80 bg-white/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-marine-navy">
          <Users2 className="size-5 text-marine-ocean" />
          Profil ayarları
        </CardTitle>
        <CardDescription>
          Giriş yapan kullanıcı: {viewer.name} ({viewer.email})
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Ad soyad
          </div>
          <div className="mt-2 font-medium text-marine-navy">{viewer.name}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            E-posta
          </div>
          <div className="mt-2 font-medium text-marine-navy">{viewer.email}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Rol
          </div>
          <div className="mt-2 font-medium text-marine-navy">
            {settingsRoleLabels[viewer.role]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsTeamTab({ users }: TeamTabProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-marine-navy">
            <ShieldCheck className="size-5 text-marine-ocean" />
            Yeni personel kaydı
          </CardTitle>
          <CardDescription>
            Bu form uygulama kullanıcısını oluşturur. Gerekirse auth hesabı ayrıca
            açılmalıdır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPersonnelAction} className="space-y-4">
            <input type="hidden" name="tab" value="team" />
            <div>
              <label
                htmlFor="personnel-name"
                className="mb-2 block text-sm font-medium text-marine-navy"
              >
                Ad soyad
              </label>
              <input id="personnel-name" name="name" required className={settingsInputClassName} />
            </div>
            <div>
              <label
                htmlFor="personnel-email"
                className="mb-2 block text-sm font-medium text-marine-navy"
              >
                E-posta
              </label>
              <input
                id="personnel-email"
                name="email"
                type="email"
                required
                className={settingsInputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="personnel-role"
                className="mb-2 block text-sm font-medium text-marine-navy"
              >
                Rol
              </label>
              <select
                id="personnel-role"
                name="role"
                defaultValue={Role.TECHNICIAN}
                className={settingsInputClassName}
              >
                {Object.entries(settingsRoleLabels).map(([role, label]) => (
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
              Personeli Kaydet
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
          <CardDescription>Rol değişikliği anında kaydedilir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <form
              key={user.id}
              action={updatePersonnelRoleAction}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
            >
              <input type="hidden" name="tab" value="team" />
              <input type="hidden" name="userId" value={user.id} />
              <div>
                <div className="font-medium text-marine-navy">{user.name}</div>
                <div className="text-sm text-slate-600">{user.email}</div>
              </div>
              <select name="role" defaultValue={user.role} className={settingsInputClassName}>
                {Object.entries(settingsRoleLabels).map(([role, label]) => (
                  <option key={role} value={role}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
              >
                Rolü Kaydet
              </button>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsBoatsTab({ boats }: BoatsTabProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-marine-navy">
            <Anchor className="size-5 text-marine-ocean" />
            Yeni tekne
          </CardTitle>
          <CardDescription>
            Yeni tekne aktif olarak oluşturulur, gerekirse daha sonra pasife alınabilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveBoatAction} className="space-y-4">
            <input type="hidden" name="tab" value="boats" />
            <div>
              <label
                htmlFor="boat-name"
                className="mb-2 block text-sm font-medium text-marine-navy"
              >
                Tekne adı
              </label>
              <input id="boat-name" name="name" required className={settingsInputClassName} />
            </div>
            <div>
              <label
                htmlFor="boat-type"
                className="mb-2 block text-sm font-medium text-marine-navy"
              >
                Tekne tipi
              </label>
              <select
                id="boat-type"
                name="type"
                defaultValue={settingsBoatTypeChoices[0]}
                className={settingsInputClassName}
              >
                {settingsBoatTypeChoices.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="boat-owner"
                className="mb-2 block text-sm font-medium text-marine-navy"
              >
                Tekne sahibi
              </label>
              <input id="boat-owner" name="ownerName" className={settingsInputClassName} />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
            >
              Tekneyi Kaydet
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
            Mevcut kayıtları düzenleyin, iş sayılarını görün ve gerektiğinde pasife alın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {boats.map((boat) => (
            <form
              key={boat.id}
              action={saveBoatAction}
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <input type="hidden" name="tab" value="boats" />
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
                <input name="name" defaultValue={boat.name} className={settingsInputClassName} />
                <select name="type" defaultValue={boat.type} className={settingsInputClassName}>
                  {settingsBoatTypeChoices.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  name="ownerName"
                  defaultValue={boat.ownerName ?? ""}
                  placeholder="Tekne sahibi"
                  className={settingsInputClassName}
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
                  Tekne aktif listelerde görünsün
                </label>
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                    Toplam iş: {boat._count.jobs}
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                  >
                    Güncelle
                  </button>
                </div>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsCategoriesTab({ categories }: CategoriesTabProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-marine-navy">
            <Tags className="size-5 text-marine-ocean" />
            Yeni kategori
          </CardTitle>
          <CardDescription>
            Servis işleri için görünür kategori ve alt kapsam tanımı ekleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCategoryAction} className="space-y-4">
            <input type="hidden" name="tab" value="categories" />
            <div>
              <label
                className="mb-2 block text-sm font-medium text-marine-navy"
                htmlFor="category-name"
              >
                Kategori adı
              </label>
              <input id="category-name" name="name" required className={settingsInputClassName} />
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-marine-navy"
                htmlFor="category-subscope"
              >
                Alt kapsam
              </label>
              <input
                id="category-subscope"
                name="subScope"
                required
                className={settingsInputClassName}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-marine-navy"
                  htmlFor="category-multiplier"
                >
                  Zorluk çarpanı
                </label>
                <input
                  id="category-multiplier"
                  name="multiplier"
                  type="number"
                  min={1}
                  max={3}
                  step="0.5"
                  defaultValue={1}
                  className={settingsInputClassName}
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-marine-navy"
                  htmlFor="category-sort-order"
                >
                  Sıra
                </label>
                <input
                  id="category-sort-order"
                  name="sortOrder"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={categories.length + 1}
                  className={settingsInputClassName}
                />
              </div>
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-marine-navy"
                htmlFor="category-brand-hints"
              >
                Marka ipuçları
              </label>
              <textarea
                id="category-brand-hints"
                name="brandHints"
                placeholder="Volvo Penta, Yanmar, Cummins..."
                className={settingsTextareaClassName}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
            >
              Kategoriyi Kaydet
            </button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-marine-navy">
            <Tags className="size-5 text-marine-ocean" />
            Kategori listesi
          </CardTitle>
          <CardDescription>
            Görünen kategori, alt kapsam, çarpan ve marka ipuçlarını yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((category) => (
            <form
              key={category.id}
              action={saveCategoryAction}
              className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <input type="hidden" name="tab" value="categories" />
              <input type="hidden" name="categoryId" value={category.id} />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
                <input
                  name="name"
                  defaultValue={category.name}
                  className={settingsInputClassName}
                />
                <input
                  name="subScope"
                  defaultValue={category.subScope}
                  className={settingsInputClassName}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[120px_120px_minmax(0,1fr)]">
                <input
                  name="multiplier"
                  type="number"
                  min={1}
                  max={3}
                  step="0.5"
                  defaultValue={category.multiplier}
                  className={settingsInputClassName}
                />
                <input
                  name="sortOrder"
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={category.sortOrder}
                  className={settingsInputClassName}
                />
                <input
                  name="brandHints"
                  defaultValue={category.brandHints ?? ""}
                  placeholder="Marka ipuçları"
                  className={settingsInputClassName}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={category.isActive}
                    className="size-4 rounded border-slate-300"
                  />
                  Kategori aktif olarak gösterilsin
                </label>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                >
                  Güncelle
                </button>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsSystemTab({
  currentDate,
  selectedYear,
  onHoldDefaultDays,
  yearlyStandings,
  objectionQueue,
}: SystemTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-marine-navy">
              <Settings2 className="size-5 text-marine-ocean" />
              Aylık rozet hesaplama
            </CardTitle>
            <CardDescription>
              Ay sonu cronunu beklemeden rozetleri ve ilgili bildirimleri manuel tetikleyin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyBadgeCalculator
              defaultMonth={currentDate.getMonth() + 1}
              defaultYear={currentDate.getFullYear()}
            />
            <form
              action={saveSystemSettingsAction}
              className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <input type="hidden" name="tab" value="system" />
              <input type="hidden" name="year" value={selectedYear} />
              <div>
                <label
                  htmlFor="onHoldDefaultDays"
                  className="mb-2 block text-sm font-medium text-marine-navy"
                >
                  Varsayılan bekletme günü
                </label>
                <input
                  id="onHoldDefaultDays"
                  name="onHoldDefaultDays"
                  type="number"
                  min={1}
                  max={MAX_ON_HOLD_DAYS}
                  defaultValue={onHoldDefaultDays}
                  className={settingsInputClassName}
                />
              </div>
              <p className="text-sm text-slate-600">
                İş detayındaki bekletme formu bu değeri ilk önerilen hatırlatma günü
                olarak kullanır.
              </p>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
              >
                Sistem Ayarını Kaydet
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-marine-navy">
              <CalendarClock className="size-5 text-marine-ocean" />
              Yıl sonu puanları
            </CardTitle>
            <CardDescription>
              Yıl puanı toplam rozet sayısına göre hesaplanır. İlk üç personel özel
              olarak vurgulanır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/settings" className="flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="tab" value="system" />
              <input
                type="number"
                name="year"
                min={2024}
                max={2100}
                defaultValue={selectedYear}
                className={settingsInputClassName}
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
              >
                Yılı Göster
              </button>
            </form>

            {yearlyStandings.length > 0 ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  {yearlyStandings.slice(0, 3).map((entry, index) => (
                    <div
                      key={entry.user.id}
                      className={`rounded-2xl border px-4 py-4 ${
                        settingsYearCardStyles[index] ?? settingsYearCardStyles[2]
                      }`}
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
                      <div className="text-sm text-slate-600">{entry.badgeCount} rozet</div>
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
                      <div className="font-semibold text-marine-navy">{entry.yearScore} puan</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                {selectedYear} için henüz rozet verisi bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/80 bg-white/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-marine-navy">
            <Trophy className="size-5 text-marine-ocean" />
            Puan itirazları ve yönetici incelemesi
          </CardTitle>
          <CardDescription>
            Son 30 gündeki itirazlar burada listelenir. Düzenleme yapıldığında log ve
            personel bildirimi oluşturulur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {objectionQueue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              İncelenmeyi bekleyen puan itirazı bulunmuyor.
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
                      İş #{item.jobId.slice(0, 8)}
                    </div>
                    <h3 className="text-lg font-semibold text-marine-navy">
                      {item.boatName} - {item.categoryName}
                    </h3>
                    <p className="text-sm text-slate-600">
                      İtiraz sahibi: {item.submittedBy.name}
                    </p>
                    <p className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      {item.reason}
                    </p>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      Atanan ekip: {item.assignedNames.join(", ") || "Kayıt yok"}
                    </p>
                  </div>

                  <Link
                    href={`/jobs/${item.jobId}`}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:bg-marine-ocean/5"
                  >
                    İş Detayını Aç
                  </Link>
                </div>

                <form action={reviewScoreObjectionAction} className="mt-5 space-y-4">
                  <input type="hidden" name="jobId" value={item.jobId} />
                  <input type="hidden" name="objectionLogId" value={item.logId} />
                  <input type="hidden" name="tab" value="system" />
                  <input type="hidden" name="year" value={selectedYear} />
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
                          className={settingsInputClassName}
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
                    Mevcut baz puan:
                    <span className="ml-1 font-semibold text-marine-navy">
                      {item.currentBaseScore.toFixed(1)}
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor={`${item.logId}-reason`}
                      className="mb-2 block text-sm font-medium text-marine-navy"
                    >
                      Düzenleme notu
                    </label>
                    <textarea
                      id={`${item.logId}-reason`}
                      name="reason"
                      required
                      minLength={10}
                      placeholder="Puan neden güncellendi?"
                      className={settingsTextareaClassName}
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
                  >
                    İncelemeyi Tamamla
                  </button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
