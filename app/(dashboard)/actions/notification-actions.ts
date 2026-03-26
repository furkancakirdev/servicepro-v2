"use server";

import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/auth";

export async function markNotificationAsReadAction(notificationId: string) {
  const user = await requireAppUser();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

export async function markAllNotificationsAsReadAction() {
  const user = await requireAppUser();

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}
