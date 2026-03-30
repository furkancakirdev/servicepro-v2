type JobDetailAlertsProps = {
  created: boolean;
  updated: boolean;
  cancelled: boolean;
  objectionSubmitted: boolean;
  statusMessage?: string;
  warranty: boolean;
};

export default function JobDetailAlerts({
  created,
  updated,
  cancelled,
  objectionSubmitted,
  statusMessage,
  warranty,
}: JobDetailAlertsProps) {
  return (
    <>
      {created ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Is kaydi basariyla olusturuldu.
        </div>
      ) : null}

      {updated ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Is durumu guncellendi.
        </div>
      ) : null}

      {cancelled ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Is iptal edildi.
        </div>
      ) : null}

      {warranty ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Is garanti kapsaminda kapatildi.
        </div>
      ) : null}

      {objectionSubmitted ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Puan itirazi kaydedildi. Yonetici ekibine bildirim gonderildi.
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
