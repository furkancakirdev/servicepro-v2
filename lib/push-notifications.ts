import "server-only";

import { format } from "date-fns";

import { prisma } from "@/lib/prisma";

type NotificationSeed = {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export const PUSH_INFRASTRUCTURE_PLACEHOLDER = {
  implementation: "app-level notification scaffold",
  edgeFunction: "supabase/functions/push-dispatch-placeholder",
  morningSummary: "07:30 Europe/??tanbul",
  channels: ["WEB_PUSH_PLACEHOLDER", "EXPO_PUSH_PLACEHOLDER"],
} as const;

export async function createPushPlaceholderNotifications(
  notifications: NotificationSeed[]
) {
  if (notifications.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: notifications.map((notification) => ({
      ...notification,
      metadata: {
        ...notification.metadata,
        pushPlaceholder: PUSH_INFRASTRUCTURE_PLACEHOLDER,
      },
    })),
  });
}

export async function createPlanPublishedNotifications(params: {
  userIds: string[];
  date: Date;
  location: string;
}) {
  const dateLabel = format(params.date, "dd.MM.yyyy");

  await createPushPlaceholderNotifications(
    params.userIds.map((userId) => ({
      userId,
      type: "PLAN_PUBLISHED",
      title: `${params.location} plani yayınlandi`,
      body: `${dateLabel} tarihli gunluk plan hazir. My Jobs ekranindan detaylari acabilirsiniz.`,
      metadata: {
        location: params.location,
        date: params.date.toISOString(),
      },
    }))
  );
}

export async function createMorningSummaryNotification(params: {
  userId: string;
  jobCount: number;
  summary: string;
}) {
  await createPushPlaceholderNotifications([
    {
      userId: params.userId,
      type: "MORNING_SUMMARY_PLACEHOLDER",
      title: "07:30 sabah ozeti",
      body: `Bugün ${params.jobCount} isiniz var. ${params.summary}`,
      metadata: {
        scheduledFor: PUSH_INFRASTRUCTURE_PLACEHOLDER.morningSummary,
      },
    },
  ]);
}

