import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(17,110,153,0.22),_transparent_45%),_linear-gradient(180deg,_#0e3152_0%,_#0a2238_100%)] px-6 py-16 text-white">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/25 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.26em] text-cyan-200">
          Çevrimdışı Mod
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Bağlantı zayıf, uygulama hazır.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200">
          Daha önce açılan ekranlar ve temel arayüz dosyaları cihazda önbelleğe alındı.
          Bağlantı geri geldiğinde saha raporu kuyruktaki kayıtlar otomatik senkronize edilir.
        </p>

        <div className="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-black/10 p-5 text-sm text-slate-200">
          <p>- İş detayları ve form kabuğu bağlantı olmadan da açık kalabilir.</p>
          <p>- Saha raporları bağlantı yoksa cihaza kuyruklanır.</p>
          <p>- Fotoğraf yükleme için bağlantının geri gelmesi gerekir.</p>
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:bg-slate-100"
          >
            Son görülen ekrana dön
          </Link>
        </div>
      </div>
    </main>
  );
}