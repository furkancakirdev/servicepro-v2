import { JobStatus } from "@prisma/client";

export const MORNING_START_MINUTES = 8 * 60;
export const DAY_END_MINUTES = 17 * 60;
export const DISPATCH_DAY_WINDOW_MINUTES = DAY_END_MINUTES - MORNING_START_MINUTES;
export const MAX_DAILY_LOAD = 2;
export const MAX_WEEKLY_LOAD = MAX_DAILY_LOAD * 6;
export const CONTINUING_STATUSES: JobStatus[] = [JobStatus.DEVAM_EDIYOR, JobStatus.BEKLEMEDE];
export const FIELD_TRAVEL_MINUTES = [
  ["gocek", 90],
  ["bodrum", 120],
  ["bozburun", 150],
  ["didim", 80],
] as const;

export const DISPATCH_REGIONS = [
  { id: "netsel", label: "Netsel Marina", icon: "NM" },
  { id: "yatmarin", label: "Yatmarin Marina", icon: "YM" },
  { id: "marmaris-disi", label: "Marmaris Disi", icon: "MD" },
] as const;

export const DISPATCH_REGION_LOCATION_VALUES = ["NETSEL", "YATMARIN", "SAHA"] as const;

export const DISPATCH_REGION_TO_PLAN_LOCATION = {
  netsel: "NETSEL",
  yatmarin: "YATMARIN",
  "marmaris-disi": "SAHA",
} as const;

export const PLAN_LOCATION_TO_DISPATCH_REGION = {
  NETSEL: "netsel",
  YATMARIN: "yatmarin",
  SAHA: "marmaris-disi",
} as const;
