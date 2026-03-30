import { format } from "date-fns";
import { enUS } from "date-fns/locale";

import { getRegionIdFromPlanLocation, getRegionLabel } from "./helpers";
import { sortDispatchJobsForLane } from "./scheduler";
import type {
  DispatchJobCard,
  DispatchPublishedPlanLogEntry,
  DispatchPublishedPlanSource,
  DispatchRegion,
} from "./types";

function formatJobLineTR(job: DispatchJobCard) {
  const parts = [
    job.timeLabel ?? "--:--",
    job.boatName,
    job.categoryName,
    job.responsibleName ?? "Atama bekliyor",
  ];

  if (job.regionId === "marmaris-disi") {
    parts.push(job.location?.trim() || "Lokasyon girilmeli");
  }

  return `- ${parts.join(" | ")}`;
}

function formatJobLineEN(job: DispatchJobCard) {
  const parts = [
    job.timeLabel ?? "--:--",
    job.boatName,
    job.categoryName,
    job.responsibleName ?? "Assignment pending",
  ];

  if (job.regionId === "marmaris-disi") {
    parts.push(job.location?.trim() || "Location required");
  }

  return `- ${parts.join(" | ")}`;
}

function buildRegionSection(region: DispatchRegion, dateValue: string, language: "tr" | "en") {
  const day = region.days.find((item) => item.dateValue === dateValue);
  const jobs = sortDispatchJobsForLane(day?.jobs ?? []);

  if (jobs.length === 0) {
    return language === "tr"
      ? `${region.label}\n- Planlanan is yok.`
      : `${region.label}\n- No scheduled jobs.`;
  }

  const lines = jobs.map((job) =>
    language === "tr" ? formatJobLineTR(job) : formatJobLineEN(job)
  );

  return `${region.label}\n${lines.join("\n")}`;
}

export function buildDailyPlanTemplate(params: {
  date: Date;
  dateValue: string;
  regions: DispatchRegion[];
}) {
  const headerTr = `Gunluk Plan - ${format(params.date, "dd.MM.yyyy")}`;
  const headerEn = `Daily Plan - ${format(params.date, "MMM d, yyyy", { locale: enUS })}`;

  const regionSectionsTr = params.regions
    .map((region) => buildRegionSection(region, params.dateValue, "tr"))
    .join("\n\n");
  const regionSectionsEn = params.regions
    .map((region) => buildRegionSection(region, params.dateValue, "en"))
    .join("\n\n");

  return {
    dailyTR: `${headerTr}\n\n${regionSectionsTr}\n\nMarlin Technical Service`,
    dailyEN: `${headerEn}\n\n${regionSectionsEn}\n\nMarlin Technical Service`,
  };
}

export function buildDispatchPublishLogEntries(
  plans: DispatchPublishedPlanSource[]
): DispatchPublishedPlanLogEntry[] {
  return [...plans]
    .sort((left, right) => {
      const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
      const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;

      return rightTime - leftTime;
    })
    .map((plan) => {
      const publishedAt = plan.publishedAt ? new Date(plan.publishedAt) : null;
      const regionId = getRegionIdFromPlanLocation(plan.location);

      return {
        location: plan.location,
        locationLabel: getRegionLabel(regionId),
        publishedAt: publishedAt?.toISOString() ?? null,
        publishedAtLabel: publishedAt
          ? publishedAt.toLocaleString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        publishedByName: plan.publishedByName ?? null,
        hasTRTemplate: Boolean(plan.waTemplateTR?.trim()),
        hasENTemplate: Boolean(plan.waTemplateEN?.trim()),
      };
    });
}
