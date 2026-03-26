type JobDetailAlertsProps = {
  created: boolean;
  updated: boolean;
  objectionSubmitted: boolean;
  statusMessage?: string;
};

export default function JobDetailAlerts({
  created,
  updated,
  objectionSubmitted,
  statusMessage,
}: JobDetailAlertsProps) {
  return (
    <>
      {created ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          İş kaydı başarıyla oluşturuldu.
        </div>
      ) : null}

      {updated ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          İş durumu güncellendi.
        </div>
      ) : null}

      {objectionSubmitted ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Puan itirazı kaydedildi. Yönetici ekibine bildirim gönderildi.
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(statusMessage)}
        </div>
      ) : null}
    </>
  );
}
