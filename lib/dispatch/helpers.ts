import { format, parseISO } from "date-fns";
import { JobRole } from "@prisma/client";

import { getEstimatedDateAsDate } from "@/lib/jobs";

import {
  DISPATCH_REGION_TO_PLAN_LOCATION,
  DISPATCH_REGIONS,
  FIELD_TRAVEL_MINUTES,
  PLAN_LOCATION_TO_DISPATCH_REGION,
} from "./constants";
import { getJobDurationMinutes } from "./scheduler";
import type {
  DispatchCalendarEvent,
  DispatchJobCard,
  DispatchPlanLocation,
  DispatchPlanningDateSource,
  DispatchRegionId,
  DispatchSourceJob,
  DispatchTab,
} from "./types";

export function normalizeLocationLabel(location: string | null | undefined) {
  return location?.trim() || "Lokasyon bekleniyor";
}

export function normalizeSearchText(value: string | null | undefined) {
  return normalizeLocationLabel(value)
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

export function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trimEnd()}...` : value;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function parseOptionalIso(value: string | null | undefined) {
  return value ? parseISO(value) : null;
}

export function resolveTravelDuration(location: string | null | undefined) {
  const normalized = normalizeSearchText(location);

  for (const [keyword, duration] of FIELD_TRAVEL_MINUTES) {
    if (normalized.includes(keyword)) {
      return duration;
    }
  }

  return null;
}

export function resolveDispatchTab(location: string | null | undefined): DispatchTab {
  const normalized = normalizeSearchText(location);

  if (normalized.includes("netsel")) {
    return "NETSEL";
  }

  if (normalized.includes("yatmarin")) {
    return "YATMARIN";
  }

  return "SAHA";
}

export function resolveRegion(location: string | null | undefined): DispatchRegionId {
  const normalized = normalizeSearchText(location);

  if (normalized.includes("netsel")) {
    return "netsel";
  }

  if (normalized.includes("yatmarin")) {
    return "yatmarin";
  }

  return "marmaris-disi";
}

export function getRegionDefinition(regionId: DispatchRegionId) {
  return DISPATCH_REGIONS.find((region) => region.id === regionId) ?? DISPATCH_REGIONS[2];
}

export function getPlanLocationForRegion(regionId: DispatchRegionId): DispatchPlanLocation {
  return DISPATCH_REGION_TO_PLAN_LOCATION[regionId];
}

export function getRegionIdFromPlanLocation(location: DispatchPlanLocation): DispatchRegionId {
  return PLAN_LOCATION_TO_DISPATCH_REGION[location];
}

export function getRegionLabel(regionId: DispatchRegionId) {
  return getRegionDefinition(regionId).label;
}

export function getRegionIcon(regionId: DispatchRegionId) {
  return getRegionDefinition(regionId).icon;
}

export function getRegionDefaultLocation(regionId: DispatchRegionId) {
  if (regionId === "netsel") {
    return "Netsel Marina";
  }

  if (regionId === "yatmarin") {
    return "Yatmarin Marina";
  }

  return null;
}

export function syncLocationWithRegion(
  currentLocation: string | null | undefined,
  regionId: DispatchRegionId
) {
  const trimmed = currentLocation?.trim() ?? "";

  if (regionId === "marmaris-disi") {
    return trimmed || null;
  }

  const defaultLocation = getRegionDefaultLocation(regionId);
  return trimmed || defaultLocation;
}

export function getLocationColorTone(tab: DispatchTab) {
  switch (tab) {
    case "NETSEL":
      return "green" as const;
    case "SAHA":
      return "amber" as const;
    case "YATMARIN":
    default:
      return "blue" as const;
  }
}

export function getDispatchSortDateTime(source: DispatchPlanningDateSource) {
  return new Date(
    (source.plannedStartDate ?? source.plannedStartAt ?? source.dispatchDate ?? source.createdAt).getTime()
  );
}

export function getDispatchPlanningDate(job: DispatchPlanningDateSource) {
  return new Date(
    (job.plannedStartDate ?? job.plannedStartAt ?? job.dispatchDate ?? job.createdAt).getTime()
  );
}

export function getDispatchBoardDate(job: DispatchPlanningDateSource) {
  return new Date(
    (job.dispatchDate ?? job.plannedStartDate ?? job.plannedStartAt ?? job.createdAt).getTime()
  );
}

export function getDispatchStartDate(job: {
  createdAtIso: string;
  dispatchDateIso: string | null;
  plannedStartDateIso: string | null;
  plannedStartAtIso: string | null;
}) {
  return (
    parseOptionalIso(job.plannedStartAtIso) ??
    parseOptionalIso(job.plannedStartDateIso) ??
    parseOptionalIso(job.dispatchDateIso) ??
    parseISO(job.createdAtIso)
  );
}

export function getDispatchEndDate(job: DispatchJobCard) {
  const startDate = getDispatchStartDate(job);
  const estimatedEnd = getEstimatedDateAsDate(job.estimatedDate);

  if (estimatedEnd && estimatedEnd.getTime() > startDate.getTime()) {
    return estimatedEnd;
  }

  return new Date(
    startDate.getTime() +
      getJobDurationMinutes({
        isKesif: job.isKesif,
        multiplier: job.multiplier,
      }) *
        60 *
        1000
  );
}

function getTimeLabel(plannedStartAt: Date | null, plannedStartDate: Date | null) {
  const timeSource = plannedStartAt ?? plannedStartDate;

  if (!timeSource) {
    return null;
  }

  const hasExplicitTime =
    timeSource.getHours() !== 0 || timeSource.getMinutes() !== 0 || timeSource.getSeconds() !== 0;

  return hasExplicitTime ? format(timeSource, "HH:mm") : null;
}

export function mapDispatchJob(job: DispatchSourceJob, continuityHint?: string | null): DispatchJobCard {
  const responsible =
    job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU) ??
    job.assignments[0] ??
    null;
  const regionId = resolveRegion(job.location);
  const locationLabel = normalizeLocationLabel(job.location);
  const description = job.description.trim();
  const timeLabel = getTimeLabel(job.plannedStartAt, job.plannedStartDate);

  return {
    id: job.id,
    boatId: job.boat.id,
    boatName: job.boat.name,
    categoryName: job.category.name,
    description,
    descriptionPreview: truncateText(description, 80),
    location: job.location,
    locationLabel,
    regionId,
    dispatchTab: resolveDispatchTab(job.location),
    status: job.status,
    multiplier: job.multiplier,
    isKesif: job.isKesif,
    isVip: job.boat.isVip,
    contactName: job.contactName,
    contactPhone: job.contactPhone,
    responsibleId: responsible?.userId ?? null,
    responsibleName: responsible?.user.name ?? null,
    assignedTechnician: responsible?.user.name ?? null,
    supportIds: job.assignments
      .filter((assignment) => assignment.role === JobRole.DESTEK)
      .map((assignment) => assignment.userId),
    supportNames: job.assignments
      .filter((assignment) => assignment.role === JobRole.DESTEK)
      .map((assignment) => assignment.user.name),
    hasMissingContact: !job.contactName || !job.contactPhone,
    hasLocationWarning: regionId === "marmaris-disi" && !job.location?.trim(),
    continuityHint: continuityHint ?? null,
    priority: job.priority,
    createdAtIso: job.createdAt.toISOString(),
    dispatchDateIso: job.dispatchDate?.toISOString() ?? null,
    plannedStartDateIso: job.plannedStartDate?.toISOString() ?? null,
    plannedStartAtIso: job.plannedStartAt?.toISOString() ?? null,
    plannedEndAtIso: job.plannedEndAt?.toISOString() ?? null,
    estimatedDate: job.estimatedDate,
    timeLabel,
  };
}

export function mapDispatchJobToCalendarEvent(job: DispatchJobCard): DispatchCalendarEvent {
  const startDate = getDispatchStartDate(job);
  const endDate = getDispatchEndDate(job);

  return {
    id: job.id,
    title: `${job.boatName} - ${job.categoryName}`,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    priority: job.priority,
    status: job.status,
    technicianId: job.responsibleId,
    locationLabel: job.locationLabel,
    dispatchTab: job.dispatchTab,
  };
}
