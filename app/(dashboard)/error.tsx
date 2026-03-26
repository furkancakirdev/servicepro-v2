"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard] Render hatası", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-base text-slate-600">Dashboard yüklenirken bir hata oluştu.</p>
      <button
        onClick={() => reset()}
        className="rounded-xl bg-marine-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-marine-ocean"
      >
        Yeniden Dene
      </button>
    </div>
  );
}
