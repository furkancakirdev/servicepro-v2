"use client";

import { useEffect, useMemo, useState } from "react";

import type { PersonnelActivationFlash } from "@/lib/settings";

const toastMessages: Record<string, string> = {
  "personnel-created": "Personel kaydi olusturuldu.",
  "role-updated": "Personel rolu guncellendi.",
  "boat-saved": "Tekne kaydi guncellendi.",
  "category-created": "Yeni kategori eklendi.",
  "category-saved": "Kategori bilgileri guncellendi.",
  "system-saved": "Sistem ayarlari kaydedildi.",
  "password-updated": "Parola guncellendi. Yeni parolaniz ile tekrar giris yapin.",
};

type SettingsAlertsProps = {
  badgeCalculated: boolean;
  reviewedJobId?: string;
  errorMessage?: string;
  personnelActivation?: PersonnelActivationFlash | null;
  toastKey?: string;
};

export default function SettingsAlerts({
  badgeCalculated,
  reviewedJobId,
  errorMessage,
  personnelActivation,
  toastKey,
}: SettingsAlertsProps) {
  const successMessage = toastKey ? toastMessages[toastKey] : undefined;
  const activationSignature = useMemo(() => {
    if (!personnelActivation) {
      return null;
    }

    return `${personnelActivation.email}:${personnelActivation.temporaryPassword}`;
  }, [personnelActivation]);
  const normalizedErrorMessage = (() => {
    if (!errorMessage) {
      return undefined;
    }

    const decoded = decodeURIComponent(errorMessage);
    return decoded === "NEXT_REDIRECT" ? undefined : decoded;
  })();
  const [showActivation, setShowActivation] = useState(false);

  useEffect(() => {
    if (!activationSignature) {
      setShowActivation(false);
      return;
    }

    const storageKey = `settings-activation:${activationSignature}`;
    const seen = window.sessionStorage.getItem(storageKey) === "1";

    if (seen) {
      setShowActivation(false);
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    setShowActivation(true);
  }, [activationSignature]);

  return (
    <div className="space-y-3">
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          {successMessage}
        </div>
      ) : null}

      {personnelActivation && showActivation ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm">
          <div className="font-semibold">Gecici parola uretildi</div>
          <div className="mt-2 leading-6">
            <span className="font-medium">{personnelActivation.name}</span> icin guvenli
            aktivasyon akisı baslatildi. Kullanici:
            <span className="ml-1 font-medium">{personnelActivation.email}</span>
          </div>
          <div className="mt-3 rounded-xl border border-amber-300/70 bg-white px-3 py-3 font-mono text-sm text-slate-900">
            {personnelActivation.temporaryPassword}
          </div>
          <div className="mt-2 text-xs uppercase tracking-[0.12em] text-amber-900/80">
            Bu parola yalnizca ilk giris icin kullanilmali; kullanici giriste yeni parola
            olusturmaya zorlanir.
          </div>
        </div>
      ) : null}

      {badgeCalculated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          Aylik rozet hesaplamasi tamamlandi. Dashboard, scoreboard ve bildirimler
          yenilendi.
        </div>
      ) : null}

      {reviewedJobId ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm">
          {reviewedJobId.slice(0, 8)} numarali is icin puanlama guncellendi ve ekip
          bilgilendirildi.
        </div>
      ) : null}

      {normalizedErrorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {normalizedErrorMessage}
        </div>
      ) : null}
    </div>
  );
}
