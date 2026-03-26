"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Bell } from "lucide-react";

import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/app/(dashboard)/actions/notification-actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { HeaderNotificationItem, NotificationCenterData } from "@/types";

type NotificationBellProps = {
  notificationCenter: NotificationCenterData;
};

function getNotificationHref(item: HeaderNotificationItem) {
  const jobId =
    item.metadata && typeof item.metadata.jobId === "string"
      ? item.metadata.jobId
      : null;

  if (jobId) {
    return `/jobs/${jobId}`;
  }

  if (
    item.type === "MISSING_WORKSHOP_EVAL" ||
    item.type === "MISSING_COORDINATOR_EVAL"
  ) {
    return "/scoreboard";
  }

  return null;
}

export default function NotificationBell({
  notificationCenter,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [itemPendingId, setItemPendingId] = useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  function handleMarkAllAsRead() {
    startBulkTransition(async () => {
      await markAllNotificationsAsReadAction();
      router.refresh();
    });
  }

  async function handleMarkAsRead(notificationId: string) {
    setItemPendingId(notificationId);

    try {
      await markNotificationAsReadAction(notificationId);
      router.refresh();
    } finally {
      setItemPendingId(null);
    }
  }

  async function handleOpenNotification(item: HeaderNotificationItem) {
    const href = getNotificationHref(item);

    if (!href) {
      return;
    }

    if (!item.isRead) {
      await handleMarkAsRead(item.id);
    }

    setOpen(false);
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="relative border-marine-ocean/20 bg-white text-marine-navy"
          />
        }
      >
        <Bell className="size-4" />
        {notificationCenter.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {notificationCenter.unreadCount > 9 ? "9+" : notificationCenter.unreadCount}
          </span>
        ) : null}
        <span className="sr-only">Bildirimler</span>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-md bg-white p-0">
        <SheetHeader className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-marine-navy">Bildirimler</SheetTitle>
            {notificationCenter.unreadCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBulkPending}
                onClick={handleMarkAllAsRead}
                className="border-marine-ocean/20 bg-white text-marine-navy hover:bg-marine-ocean/5"
              >
                {isBulkPending ? "Güncelleniyor..." : "Tümünü Okundu Yap"}
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="max-h-[calc(100vh-88px)] overflow-y-auto px-4 py-4">
          {notificationCenter.items.length > 0 ? (
            <div className="space-y-3">
              {notificationCenter.items.map((item) => {
                const href = getNotificationHref(item);
                const isPending = itemPendingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      item.isRead
                        ? "border-slate-200 bg-slate-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-marine-navy">{item.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                      </div>
                      {!item.isRead ? (
                        <span className="mt-1 inline-flex size-2 rounded-full bg-amber-500" />
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        {href ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => void handleOpenNotification(item)}
                            className="border-marine-ocean/20 bg-white text-marine-navy hover:bg-marine-ocean/5"
                          >
                            İlgili Sayfaya Git
                          </Button>
                        ) : null}

                        {!item.isRead ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => void handleMarkAsRead(item.id)}
                            className="border-marine-ocean/20 bg-white text-marine-navy hover:bg-marine-ocean/5"
                          >
                            {isPending ? "Kaydediliyor..." : "Okundu"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
              Henüz bir bildirim yok.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
