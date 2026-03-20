import type {
  Badge,
  BadgeType,
  Boat,
  BoatContact,
  ClientNotification,
  DeliveryReport,
  EvaluatorType,
  HoldReason,
  JobAssignment,
  JobEvaluation,
  JobRole,
  JobScore,
  JobStatus,
  MonthlyEvaluation,
  Notification,
  Role,
  ServiceCategory,
  ServiceJob,
  User,
  Prisma,
} from "@prisma/client";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type AppRole = Role;
export type AppJobStatus = JobStatus;
export type AppJobRole = JobRole;
export type AppHoldReason = HoldReason;
export type AppEvaluatorType = EvaluatorType;
export type AppBadgeType = BadgeType;

export type AppUser = User;
export type AppBoat = Boat;
export type AppBoatContact = BoatContact;
export type AppServiceCategory = ServiceCategory;
export type AppServiceJob = ServiceJob;
export type AppJobAssignment = JobAssignment;
export type AppDeliveryReport = DeliveryReport;
export type AppJobEvaluation = JobEvaluation;
export type AppJobScore = JobScore;
export type AppMonthlyEvaluation = MonthlyEvaluation;
export type AppBadge = Badge;
export type AppNotification = Notification;
export type AppClientNotification = ClientNotification;

export type ServiceJobListItem = Prisma.ServiceJobGetPayload<{
  include: {
    boat: true;
    category: true;
    assignments: {
      include: {
        user: true;
      };
    };
  };
}>;

export type ServiceJobDetail = Prisma.ServiceJobGetPayload<{
  include: {
    boat: {
      include: {
        contacts: true;
      };
    };
    category: true;
    assignments: {
      include: {
        user: true;
      };
    };
    deliveryReport: true;
    clientNotifications: {
      include: {
        contact: true;
        sentBy: true;
      };
    };
    evaluation: {
      include: {
        evaluator: true;
      };
    };
    jobScores: {
      include: {
        user: true;
      };
    };
  };
}>;

export type MonthlyScoreboardEntry = {
  user: Pick<User, "id" | "name" | "email" | "role" | "avatarUrl">;
  jobScore: number;
  workshopScore: number | null;
  coordinatorScore: number | null;
  total: number;
  hasMissingEval: boolean;
  badges: Badge[];
};

export type DemoJobStatus = JobStatus;

export type DemoJob = {
  id: string;
  boat: string;
  category: string;
  multiplier: number;
  status: DemoJobStatus;
  team: string;
  location: string;
  schedule: string;
};

export type ScoreboardEntry = {
  technician: string;
  jobScore: number;
  workshopScore: number | null;
  coordinatorScore: number | null;
  total: number;
  badges: string[];
};

export type MonthlyEvaluationSummary = {
  normalizedScore: number;
  notes: string | null;
  questions: number[];
};

export type ScoreboardJobBreakdown = {
  id: string;
  boatName: string;
  categoryName: string;
  date: string;
  role: JobRole;
  baseScore: number;
  multiplier: number;
  roleMultiplier: number;
  finalScore: number;
  isKesif: boolean;
};

export type ScoreboardBadgeSummary = {
  type: BadgeType;
  winners: Array<Pick<User, "id" | "name" | "avatarUrl"> & { score: number }>;
};

export type TechnicianScoreboardEntry = {
  rank: number;
  user: Pick<User, "id" | "name" | "email" | "role" | "avatarUrl">;
  rawJobScore: number;
  jobScore: number;
  workshopScore: number | null;
  coordinatorScore: number | null;
  total: number;
  hasMissingEval: boolean;
  badges: Array<{ id: string; type: BadgeType; score: number }>;
  jobs: ScoreboardJobBreakdown[];
  workshopEvaluation: MonthlyEvaluationSummary | null;
  coordinatorEvaluation: MonthlyEvaluationSummary | null;
};

export type MonthlyEvaluationFormEntry = {
  user: Pick<User, "id" | "name" | "avatarUrl">;
  workshopEvaluation: {
    q1: number | null;
    q2: number | null;
    q3: number | null;
    notes: string;
  } | null;
  coordinatorEvaluation: {
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
    q5: number | null;
  } | null;
};

export type MonthlyScoreboardData = {
  month: number;
  year: number;
  monthLabel: string;
  theoreticalMax: number;
  entries: TechnicianScoreboardEntry[];
  badgeSummary: ScoreboardBadgeSummary[];
  evaluationRoster: MonthlyEvaluationFormEntry[];
};

export type HeaderNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type NotificationCenterData = {
  unreadCount: number;
  items: HeaderNotificationItem[];
};

export type DashboardAssignedJob = {
  id: string;
  boatName: string;
  categoryName: string;
  status: JobStatus;
  location: string;
  timeLabel: string;
  sortDate: string;
};

export type DashboardAssignedJobGroup = {
  location: string;
  jobs: DashboardAssignedJob[];
};

export type DashboardAlert = {
  id: string;
  tone: "amber" | "sky" | "rose";
  title: string;
  description: string;
};

export type DashboardActivityPoint = {
  date: string;
  label: string;
  created: number;
  completed: number;
  closed: number;
};

export type YearlyBadgeStanding = {
  rank: number;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  badgeCount: number;
  yearScore: number;
  badgeTypes: BadgeType[];
};

export type ScoreObjectionQueueItem = {
  logId: string;
  jobId: string;
  boatName: string;
  categoryName: string;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
  submittedBy: Pick<User, "id" | "name">;
  currentBaseScore: number;
  answers: [number, number, number, number, number];
  assignedNames: string[];
};

export type DashboardData = {
  activeJobsCount: number;
  completedThisMonthCount: number;
  pendingScoringCount: number;
  leader: {
    name: string;
    score: number;
  } | null;
  myJobs: DashboardAssignedJobGroup[];
  alerts: DashboardAlert[];
  activity: DashboardActivityPoint[];
  topFive: TechnicianScoreboardEntry[];
  overdueHoldCount: number;
  missingWorkshopCount: number;
  missingCoordinatorCount: number;
};
