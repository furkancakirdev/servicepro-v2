import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import type { NotificationCenterData } from "@/types";

export async function getNotificationCenterData(
  userId: string
): Promise<NotificationCenterData> {
  if (!isDatabaseConfigured()) {
    return {
      unreadCount: 0,
      items: [],
    };
  }

  const [unreadCount, items] = await Promise.all([
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
    prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  return {
    unreadCount,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
      metadata:
        item.metadata && typeof item.metadata === "object"
          ? (item.metadata as Record<string, unknown>)
          : null,
    })),
  };
}
