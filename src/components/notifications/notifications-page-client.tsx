"use client";

import { CheckCheck, ChevronLeft, ChevronRight, CircleDot } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { NotificationType } from "@prisma/client";

import { markAllNotificationsReadAction, markNotificationReadInlineAction } from "@/actions/training";
import { formatNotificationTimestamp, notificationTypeMeta } from "@/components/notifications/notification-shared";
import { cn } from "@/lib/utils";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsPageClientProps = {
  initialItems: NotificationRow[];
  page: number;
  totalCount: number;
  pageSize: number;
  /** Base path sans query, ex. `/notifications` */
  listBasePath: string;
  calendarHref: string;
};

export function NotificationsPageClient({
  initialItems,
  page,
  totalCount,
  pageSize,
  listBasePath,
  calendarHref,
}: NotificationsPageClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function markAsRead(notificationId: string) {
    const target = items.find((notification) => notification.id === notificationId);
    if (!target || target.isRead) {
      return;
    }

    setItems((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification,
      ),
    );

    startTransition(async () => {
      await markNotificationReadInlineAction(notificationId);
    });
  }

  function markAllRead() {
    if (totalCount === 0) {
      return;
    }

    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function pageHref(nextPage: number) {
    const url = new URL(listBasePath, "https://akaa.local");
    if (nextPage > 1) {
      url.searchParams.set("page", String(nextPage));
    }
    return `${url.pathname}${url.search}`;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0c0910]">Notifications</h1>
          <p className="mt-1 text-sm text-[#0c0910]/62">
            {totalCount === 0
              ? "Aucune notification pour le moment."
              : `${totalCount} notification${totalCount > 1 ? "s" : ""} au total`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={calendarHref}
            className="inline-flex items-center justify-center rounded-full border border-[#dbe2ea] bg-white px-4 py-2 text-sm font-semibold text-[#0c0910]/80 shadow-sm transition hover:bg-[#f8fafc]"
          >
            Calendrier
          </Link>
          <button
            type="button"
            onClick={markAllRead}
            disabled={isPending || totalCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B52D6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[1.25rem] border border-[#e5ebf3] bg-[#f7f9ff] px-6 py-12 text-center">
            <CircleDot className="mx-auto h-6 w-6 text-[#0F63FF]/55" />
            <p className="mt-4 font-medium text-[#0c0910]">Aucune notification sur cette page.</p>
            <p className="mt-2 text-sm text-[#0c0910]/58">
              Les validations de sessions, rappels et alertes apparaîtront ici.
            </p>
          </div>
        ) : (
          items.map((notification) => {
            const meta = notificationTypeMeta[notification.type];
            const Icon = meta.icon;

            return (
              <article
                key={notification.id}
                className={cn(
                  "rounded-[1.15rem] border px-4 py-4 transition",
                  notification.isRead
                    ? "border-[#e7edf5] bg-white"
                    : "border-[#cfe0ff] bg-[linear-gradient(180deg,rgba(15,99,255,0.06),rgba(255,255,255,0.96))]",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full", meta.accent)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold text-[#0c0910]">{notification.title}</p>
                      <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#0c0910]/56">
                        {meta.label}
                      </span>
                      {!notification.isRead ? (
                        <span className="rounded-full bg-[#0F63FF]/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#0050d6]">
                          Nouveau
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#0c0910]/76">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-[#0c0910]/52">{formatNotificationTimestamp(notification.createdAt)}</span>

                      {notification.relatedUrl ? (
                        <Link
                          href={notification.relatedUrl}
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsRead(notification.id);
                            }
                          }}
                          className="text-xs font-semibold text-[#0050d6] hover:text-[#0F63FF]"
                        >
                          Ouvrir
                        </Link>
                      ) : null}

                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0c0910]/68 hover:text-[#0c0910] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Marquer comme lu
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#0c0910]/48">Lue</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-[#e5ebf3] pt-4">
          <p className="text-sm text-[#0c0910]/58">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dbe2ea] bg-white px-3 py-1.5 text-sm font-semibold text-[#0c0910] hover:bg-[#f8fafc]"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-[#0c0910]/38">
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dbe2ea] bg-white px-3 py-1.5 text-sm font-semibold text-[#0c0910] hover:bg-[#f8fafc]"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-[#0c0910]/38">
                Suivant
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
