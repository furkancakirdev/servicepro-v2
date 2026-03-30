"use client";

import Link from "next/link";
import { useMemo } from "react";
import { JobRole } from "@prisma/client";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { JobCloseoutResult } from "@/lib/scoring";

type ScoreResultProps = {
  result: JobCloseoutResult;
};

const confettiColors = [
  "#d4af37",
  "#7dd3fc",
  "#34d399",
  "#f97316",
  "#f472b6",
  "#fde047",
];

export default function ScoreResult({ result }: ScoreResultProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${(index * 13) % 100}%`,
        delay: `${(index % 6) * 0.12}s`,
        duration: `${2.2 + (index % 4) * 0.25}s`,
        color: confettiColors[index % confettiColors.length],
        rotation: `${(index % 5) * 18}deg`,
      })),
    []
  );

  const responsible = result.scores.find((score) => score.role === JobRole.SORUMLU) ?? result.scores[0];
  const supportScores = result.scores.filter((score) => score.role === JobRole.DESTEK);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-marine-navy/95 px-4 py-6 backdrop-blur-sm">
      <style>{`
        @keyframes score-confetti-fall {
          0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate3d(8px, 90vh, 0) rotate(540deg); opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-0 block h-4 w-2 rounded-full"
            style={{
              left: piece.left,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation})`,
              animationName: "score-confetti-fall",
              animationDuration: piece.duration,
              animationDelay: piece.delay,
              animationIterationCount: 1,
              animationTimingFunction: "ease-out",
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-4xl space-y-6 rounded-[32px] border border-emerald-200/30 bg-emerald-500/10 p-6 text-white shadow-2xl shadow-black/30">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-200">
            Kapanış Başarılı
          </p>
          <h2 className="flex items-center justify-center gap-3 text-4xl font-semibold">
            <Sparkles className="size-8 text-emerald-200" />
            +{responsible?.finalScore.toFixed(1) ?? result.responsibleScore.toFixed(1)} PUAN KAZANILDI!
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-white/15 bg-white/10 px-5 py-4 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-emerald-100">Baz puan</div>
            <div className="mt-2 text-2xl font-semibold">{result.baseScore.toFixed(1)} / 100</div>
          </div>
          <div className="rounded-[28px] border border-white/15 bg-white/10 px-5 py-4 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-emerald-100">Zorluk ?arpani</div>
            <div className="mt-2 text-2xl font-semibold">x{result.multiplier.toFixed(1)}</div>
          </div>
          <div className="rounded-[28px] border border-white/15 bg-white/10 px-5 py-4 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-emerald-100">Rol</div>
            <div className="mt-2 text-2xl font-semibold">
              {responsible?.role === JobRole.DESTEK ? "Destek" : "Sorumlu"} (
              x{responsible?.roleMultiplier.toFixed(2) ?? "1.00"})
            </div>
          </div>
          <div className="rounded-[28px] border border-white/15 bg-white/10 px-5 py-4 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-emerald-100">Final</div>
            <div className="mt-2 text-2xl font-semibold">
              {responsible?.finalScore.toFixed(1) ?? result.responsibleScore.toFixed(1)}
            </div>
          </div>
        </div>

        {supportScores.length > 0 ? (
          <div className="space-y-3 rounded-[28px] border border-white/15 bg-white/10 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-100">
              Destek teknisyen puanlari
            </div>
            <div className="grid gap-3">
              {supportScores.map((score) => (
                <div
                  key={score.userId}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                >
                  {score.userName} +{score.finalScore.toFixed(1)} puan aldi
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/jobs">
            <Button size="lg" className="h-12 bg-white text-marine-navy hover:bg-slate-100">
              İş Listesine Dön
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-12 border-white/30 bg-transparent text-white hover:bg-white/10">
              Dashboard&apos;a Git
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
