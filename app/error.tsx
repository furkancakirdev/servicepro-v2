"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

type AppErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppErrorPage({ error, reset }: AppErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-marine-mist px-6 py-16">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/70 bg-white p-8 shadow-panel">
        <div className="flex size-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-marine-navy">
          Beklenmeyen bir hata oluştu
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
          Sayfa yüklenirken bir sey ters gitti. Yeniden deneyebilir veya operasyon
          merkezine donebilirsiniz.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-marine-navy px-5 text-sm font-medium text-white transition-colors hover:bg-marine-ocean"
          >
            <RefreshCcw className="size-4" />
            Yenile
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:bg-slate-50"
          >
            Dashboarda D?n
          </Link>
        </div>
      </div>
    </div>
  );
}

