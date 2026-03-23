"use client";

import { useMemo, useState } from "react";
import { Award, ShieldCheck, Star } from "lucide-react";
import { BadgeType } from "@prisma/client";

import PersonnelDetailSheet from "@/components/scoreboard/PersonnelDetailSheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TechnicianScoreboardEntry } from "@/types";
import { cn } from "@/lib/utils";

type LeaderboardTableProps = {
  entries: TechnicianScoreboardEntry[];
  monthLabel: string;
};

const badgeMeta: Record<BadgeType, { icon: typeof Star; label: string; tone: string }> = {
  SERVIS_YILDIZI: {
    icon: Star,
    label: "Servis Y?ld?z?",
    tone: "text-amber-600",
  },
  KALITE_USTASI: {
    icon: ShieldCheck,
    label: "Kalite Ustas?",
    tone: "text-emerald-600",
  },
  EKIP_OYUNCUSU: {
    icon: Award,
    label: "Ekip Oyuncusu",
    tone: "text-sky-600",
  },
};

function PendingBadge() {
  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
      DE?ERLEND?RME BEKLEN?YOR
    </span>
  );
}

export default function LeaderboardTable({
  entries,
  monthLabel,
}: LeaderboardTableProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.user.id === selectedUserId) ?? null,
    [entries, selectedUserId]
  );

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-panel">
        <div className="border-b border-slate-200/80 px-6 py-5">
          <h2 className="text-xl font-semibold text-marine-navy">Aylık Sıralama</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Personel</TableHead>
              <TableHead>İş Puanı</TableHead>
              <TableHead>Usta Puanı</TableHead>
              <TableHead>Koordinatör</TableHead>
              <TableHead>Toplam</TableHead>
              <TableHead>Rozetler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                key={entry.user.id}
                className="cursor-pointer"
                onClick={() => setSelectedUserId(entry.user.id)}
              >
                <TableCell className="font-semibold text-marine-navy">{entry.rank}</TableCell>
                <TableCell>
                  <div className="font-medium text-marine-navy">{entry.user.name}</div>
                </TableCell>
                <TableCell>{entry.jobScore.toFixed(1)}</TableCell>
                <TableCell>
                  {entry.workshopScore === null ? (
                    <PendingBadge />
                  ) : (
                    entry.workshopScore.toFixed(1)
                  )}
                </TableCell>
                <TableCell>
                  {entry.coordinatorScore === null ? (
                    <PendingBadge />
                  ) : (
                    entry.coordinatorScore.toFixed(1)
                  )}
                </TableCell>
                <TableCell className="font-semibold text-marine-navy">
                  <div>{entry.total.toFixed(1)}</div>
                  {entry.hasMissingEval ? (
                    <div className="mt-2">
                      <PendingBadge />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.badges.length > 0 ? (
                      entry.badges.map((badge) => {
                        const meta = badgeMeta[badge.type];
                        const Icon = meta.icon;

                        return (
                          <span
                            key={badge.id}
                            title={meta.label}
                            className={cn(
                              "inline-flex rounded-full border border-slate-200 bg-slate-50 p-2",
                              meta.tone
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PersonnelDetailSheet
        entry={selectedEntry}
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
          }
        }}
        monthLabel={monthLabel}
      />
    </>
  );
}
