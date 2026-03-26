import Link from "next/link";
import { Compass } from "lucide-react";

export default function AppNotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-marine-mist px-6 py-16">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/70 bg-white p-8 shadow-panel">
        <div className="flex size-14 items-center justify-center rounded-3xl bg-marine-ocean/10 text-marine-ocean">
          <Compass className="size-6" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-marine-navy">
          Aradığınız sayfa bulunamadı
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
          Kayıt taşınmış, silinmiş veya hatalı bir bağlantı açılmış olabilir.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
          >
            Dashboard&apos;a Dön
          </Link>
          <Link
            href="/jobs"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:bg-slate-50"
          >
            İş Listesine Git
          </Link>
        </div>
      </div>
    </div>
  );
}
