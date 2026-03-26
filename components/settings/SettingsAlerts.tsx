const toastMessages: Record<string, string> = {
  "personnel-created": "Personel kaydı oluşturuldu.",
  "role-updated": "Personel rolü güncellendi.",
  "boat-saved": "Tekne kaydı güncellendi.",
  "category-created": "Yeni kategori eklendi.",
  "category-saved": "Kategori bilgileri güncellendi.",
  "system-saved": "Sistem ayarları kaydedildi.",
};

type SettingsAlertsProps = {
  badgeCalculated: boolean;
  reviewedJobId?: string;
  errorMessage?: string;
  toastKey?: string;
};

export default function SettingsAlerts({
  badgeCalculated,
  reviewedJobId,
  errorMessage,
  toastKey,
}: SettingsAlertsProps) {
  const successMessage = toastKey ? toastMessages[toastKey] : undefined;

  return (
    <>
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {badgeCalculated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Aylık rozet hesaplaması tamamlandı. Dashboard, scoreboard ve bildirimler
          yenilendi.
        </div>
      ) : null}

      {reviewedJobId ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {reviewedJobId.slice(0, 8)} numaralı iş için puanlama güncellendi ve ekip
          bilgilendirildi.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMessage)}
        </div>
      ) : null}
    </>
  );
}
