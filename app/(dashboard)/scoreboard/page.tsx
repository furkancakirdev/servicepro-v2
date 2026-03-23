import { Role } from "@prisma/client";

import BadgeDisplay from "@/components/scoreboard/BadgeDisplay";
import LeaderboardTable from "@/components/scoreboard/LeaderboardTable";
import MonthlyEvaluationSheet from "@/components/scoreboard/MonthlyEvaluationSheet";
import PodiumDisplay from "@/components/scoreboard/PodiumDisplay";
import ScoreBreakdown from "@/components/scoreboard/ScoreBreakdown";
import ScoreboardPeriodPicker from "@/components/scoreboard/ScoreboardPeriodPicker";
import ScoreboardRealtime from "@/components/scoreboard/ScoreboardRealtime";
import { requireAppUser } from "@/lib/auth";
import {
  getMonthlyScoreboard,
  getScoreboardMonthOptions,
  resolveScoreboardPeriod,
} from "@/lib/scoreboard";

type ScoreboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function takeFirstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ScoreboardPage({
  searchParams,
}: ScoreboardPageProps) {
  const currentUser = await requireAppUser();
  const selectedPeriod = resolveScoreboardPeriod({
    month: takeFirstValue(searchParams?.month),
    year: takeFirstValue(searchParams?.year),
  });
  const scoreboard = await getMonthlyScoreboard(
    selectedPeriod.month,
    selectedPeriod.year
  );
  const monthOptions = getScoreboardMonthOptions();
  const missingWorkshopCount = scoreboard.entries.filter(
    (entry) => entry.workshopScore === null
  ).length;
  const missingCoordinatorCount = scoreboard.entries.filter(
    (entry) => entry.coordinatorScore === null
  ).length;

  return (
    <div className="space-y-6">
      <ScoreboardRealtime />

      <div className="rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="mt-2 text-2xl font-semibold text-marine-navy">
              Puan Tablosu
            </h1>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <ScoreboardPeriodPicker
              currentValue={`${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, "0")}`}
              options={monthOptions}
            />

            <div className="flex flex-wrap gap-3">
              {currentUser.role === Role.WORKSHOP_CHIEF ||
              currentUser.role === Role.ADMIN ? (
                <MonthlyEvaluationSheet
                  mode="workshop"
                  month={scoreboard.month}
                  year={scoreboard.year}
                  monthLabel={scoreboard.monthLabel}
                  roster={scoreboard.evaluationRoster}
                />
              ) : null}

              {currentUser.role === Role.COORDINATOR ||
              currentUser.role === Role.ADMIN ? (
                <MonthlyEvaluationSheet
                  mode="coordinator"
                  month={scoreboard.month}
                  year={scoreboard.year}
                  monthLabel={scoreboard.monthLabel}
                  roster={scoreboard.evaluationRoster}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <PodiumDisplay entries={scoreboard.entries.slice(0, 3)} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <LeaderboardTable
          entries={scoreboard.entries}
          monthLabel={scoreboard.monthLabel}
        />
        <div className="space-y-6">
          <ScoreBreakdown
            monthLabel={scoreboard.monthLabel}
            missingWorkshopCount={missingWorkshopCount}
            missingCoordinatorCount={missingCoordinatorCount}
            theoreticalMax={scoreboard.theoreticalMax}
          />
          <BadgeDisplay badgeSummary={scoreboard.badgeSummary} />
        </div>
      </div>
    </div>
  );
}

