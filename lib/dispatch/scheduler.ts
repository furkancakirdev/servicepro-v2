import { parseISO } from "date-fns";

import { getEstimatedDateAsDate } from "@/lib/jobs";

import {
  DAY_END_MINUTES,
  DISPATCH_DAY_WINDOW_MINUTES,
  MORNING_START_MINUTES,
} from "./constants";
import {
  getDispatchSortDateTime,
  getDispatchStartDate,
  getLocationColorTone,
  parseOptionalIso,
  resolveTravelDuration,
} from "./helpers";
import type {
  DispatchJobCard,
  DispatchScheduledJob,
  DispatchSourceJob,
  DispatchTimelineBlock,
} from "./types";

export function getTimelineLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function clampTimelineMinutes(value: number) {
  return Math.max(MORNING_START_MINUTES, Math.min(value, DAY_END_MINUTES));
}

export function getMinutesFromDate(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

export function getJobDurationMinutes(job: Pick<DispatchSourceJob, "isKesif" | "multiplier">) {
  if (job.isKesif) {
    return 45;
  }

  return Math.min(150, Math.max(60, Math.round(40 + job.multiplier * 30)));
}

export function sortDispatchJobsForLane(jobs: DispatchJobCard[]) {
  return [...jobs].sort((left, right) => {
    const leftSortDate = getDispatchSortDateTime({
      dispatchDate: parseOptionalIso(left.dispatchDateIso),
      plannedStartDate: parseOptionalIso(left.plannedStartDateIso),
      plannedStartAt: parseOptionalIso(left.plannedStartAtIso),
      createdAt: parseISO(left.createdAtIso),
    });
    const rightSortDate = getDispatchSortDateTime({
      dispatchDate: parseOptionalIso(right.dispatchDateIso),
      plannedStartDate: parseOptionalIso(right.plannedStartDateIso),
      plannedStartAt: parseOptionalIso(right.plannedStartAtIso),
      createdAt: parseISO(right.createdAtIso),
    });

    if (leftSortDate.getTime() !== rightSortDate.getTime()) {
      return leftSortDate.getTime() - rightSortDate.getTime();
    }

    return left.boatName.localeCompare(right.boatName, "tr");
  });
}

export function scheduleJobs(jobs: DispatchJobCard[]) {
  const scheduledJobs: DispatchScheduledJob[] = [];
  const blocks: DispatchTimelineBlock[] = [];
  let cursor = MORNING_START_MINUTES;

  for (const job of sortDispatchJobsForLane(jobs)) {
    const travelMinutes =
      job.dispatchTab === "SAHA" ? resolveTravelDuration(job.locationLabel) : null;
    const startDate = getDispatchStartDate(job);
    const desiredJobStart = clampTimelineMinutes(getMinutesFromDate(startDate));
    let jobStart = Math.max(cursor, desiredJobStart);

    if (travelMinutes) {
      const desiredTravelStart = clampTimelineMinutes(jobStart - travelMinutes);
      const travelStart =
        desiredTravelStart >= cursor ? desiredTravelStart : clampTimelineMinutes(cursor);
      const travelEnd = clampTimelineMinutes(travelStart + travelMinutes);

      blocks.push({
        id: `travel-${job.id}`,
        type: "TRAVEL",
        title: "Seyahat",
        subtitle: `${job.locationLabel} ~${travelMinutes} dk`,
        startMinutes: travelStart - MORNING_START_MINUTES,
        durationMinutes: Math.max(travelEnd - travelStart, 30),
        startLabel: getTimelineLabel(travelStart),
        endLabel: getTimelineLabel(travelEnd),
        tone: "slate",
        hasWarningDot: false,
        priority: null,
      });

      jobStart = Math.max(jobStart, travelEnd);
      cursor = travelEnd;
    }

    const estimatedEndDate = getEstimatedDateAsDate(job.estimatedDate);
    const durationMinutes =
      estimatedEndDate && estimatedEndDate.getTime() > startDate.getTime()
        ? Math.min(
            DISPATCH_DAY_WINDOW_MINUTES,
            Math.max(
              30,
              Math.round((estimatedEndDate.getTime() - startDate.getTime()) / (60 * 1000))
            )
          )
        : getJobDurationMinutes({
            isKesif: job.isKesif,
            multiplier: job.multiplier,
          });
    const start = clampTimelineMinutes(jobStart);
    const end = clampTimelineMinutes(start + durationMinutes);
    const startLabel = getTimelineLabel(start);
    const endLabel = getTimelineLabel(end);

    scheduledJobs.push({
      ...job,
      startMinutes: start - MORNING_START_MINUTES,
      endMinutes: end - MORNING_START_MINUTES,
      startLabel,
      endLabel,
      departureLabel: travelMinutes ? getTimelineLabel(start - travelMinutes) : null,
      returnLabel: endLabel,
      travelMinutes,
    });

    blocks.push({
      id: `job-${job.id}`,
      type: "JOB",
      title: job.boatName,
      subtitle: `${job.categoryName} | ${job.locationLabel}`,
      startMinutes: start - MORNING_START_MINUTES,
      durationMinutes: Math.max(end - start, 30),
      startLabel,
      endLabel,
      tone: getLocationColorTone(job.dispatchTab),
      hasWarningDot: job.hasMissingContact,
      priority: job.priority,
      jobId: job.id,
    });

    cursor = end + 15;
  }

  return { scheduledJobs, blocks };
}
