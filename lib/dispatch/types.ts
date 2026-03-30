import type { JobRole, JobStatus } from "@prisma/client";

import type {
  DISPATCH_REGIONS,
  DISPATCH_REGION_LOCATION_VALUES,
} from "./constants";

export type DispatchTab = "YATMARIN" | "NETSEL" | "SAHA";
export type DispatchViewMode = "weekly" | "daily";
export type DispatchRegionId = (typeof DISPATCH_REGIONS)[number]["id"];
export type DispatchPlanLocation = (typeof DISPATCH_REGION_LOCATION_VALUES)[number];

export type DispatchWarning = {
  id: string;
  tone: "amber" | "rose" | "sky";
  title: string;
  description: string;
};

export type DispatchJobCard = {
  id: string;
  boatId: string;
  boatName: string;
  categoryName: string;
  description: string;
  descriptionPreview: string;
  location: string | null;
  locationLabel: string;
  regionId: DispatchRegionId;
  dispatchTab: DispatchTab;
  status: JobStatus;
  multiplier: number;
  isKesif: boolean;
  isVip: boolean;
  contactName: string | null;
  contactPhone: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  assignedTechnician: string | null;
  supportIds: string[];
  supportNames: string[];
  hasMissingContact: boolean;
  hasLocationWarning: boolean;
  continuityHint: string | null;
  priority: string | null;
  createdAtIso: string;
  dispatchDateIso: string | null;
  plannedStartDateIso: string | null;
  plannedStartAtIso: string | null;
  plannedEndAtIso: string | null;
  estimatedDate: number | null;
  timeLabel: string | null;
};

export type DispatchRegionDay = {
  dateIso: string;
  dateValue: string;
  dayLabel: string;
  dateLabel: string;
  jobs: DispatchJobCard[];
};

export type DispatchRegion = {
  id: DispatchRegionId;
  label: string;
  icon: string;
  days: DispatchRegionDay[];
  jobCount: number;
};

export type DispatchTechnicianOption = {
  id: string;
  name: string;
};

export type DispatchTimelineBlock = {
  id: string;
  type: "JOB" | "TRAVEL";
  title: string;
  subtitle: string;
  startMinutes: number;
  durationMinutes: number;
  startLabel: string;
  endLabel: string;
  tone: "blue" | "green" | "amber" | "purple" | "slate";
  hasWarningDot: boolean;
  priority: string | null;
  jobId?: string;
};

export type DispatchScheduledJob = DispatchJobCard & {
  startMinutes: number;
  endMinutes: number;
  startLabel: string;
  endLabel: string;
  departureLabel: string | null;
  returnLabel: string;
  travelMinutes: number | null;
};

export type DispatchTechnicianLane = {
  id: string;
  name: string;
  initials: string;
  jobCount: number;
  locationLabel: string;
  isOverloaded: boolean;
  scheduledJobs: DispatchScheduledJob[];
  blocks: DispatchTimelineBlock[];
};

export type DispatchPublishedPlanLogEntry = {
  location: DispatchPlanLocation;
  locationLabel: string;
  publishedAt: string | null;
  publishedAtLabel: string | null;
  publishedByName: string | null;
  hasTRTemplate: boolean;
  hasENTemplate: boolean;
};

export type DispatchCalendarEvent = {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
  priority: string | null;
  status: JobStatus;
  technicianId: string | null;
  locationLabel: string;
  dispatchTab: DispatchTab;
};

export type DispatchBoardData = {
  viewMode: DispatchViewMode;
  dateIso: string;
  dateValue: string;
  dateLabel: string;
  weekLabel: string;
  regions: DispatchRegion[];
  unassignedJobs: DispatchJobCard[];
  warnings: DispatchWarning[];
  availableTechnicians: DispatchTechnicianOption[];
  templates: {
    dailyTR: string;
    dailyEN: string;
  };
  publishedPlans: DispatchPublishedPlanLogEntry[];
};

export type WeeklyDispatchDay = {
  dateIso: string;
  dateValue: string;
  label: string;
  lanes: Array<{
    userId: string;
    name: string;
    jobCount: number;
    maxCapacity: number;
    jobs: DispatchJobCard[];
  }>;
  unassignedJobs: DispatchJobCard[];
};

export type WeeklyDispatchData = {
  weekLabel: string;
  days: WeeklyDispatchDay[];
  technicianLoads: Array<{
    userId: string;
    name: string;
    totalJobs: number;
    maxCapacity: number;
  }>;
};

export type DispatchSourceJob = {
  id: string;
  description: string;
  location: string | null;
  createdAt: Date;
  dispatchDate: Date | null;
  plannedStartDate: Date | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  estimatedDate: number | null;
  priority: string | null;
  status: JobStatus;
  multiplier: number;
  isKesif: boolean;
  contactName: string | null;
  contactPhone: string | null;
  boat: {
    id: string;
    name: string;
    isVip: boolean;
  };
  category: {
    name: string;
  };
  assignments: Array<{
    role: JobRole;
    userId: string;
    user: {
      id: string;
      name: string;
    };
  }>;
};

export type DispatchPlanningDateSource = {
  dispatchDate?: Date | null;
  plannedStartDate?: Date | null;
  plannedStartAt?: Date | null;
  createdAt: Date;
};

export type DispatchPublishedPlanSource = {
  location: DispatchPlanLocation;
  publishedAt: Date | string | null;
  publishedByName?: string | null;
  waTemplateTR?: string | null;
  waTemplateEN?: string | null;
};
