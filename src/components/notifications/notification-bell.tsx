"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, CircleDot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { NotificationType } from "@prisma/client";

import { markNotificationReadInlineAction } from "@/actions/training";
import { formatNotificationTimestamp, notificationTypeMeta } from "@/components/notifications/notification-shared";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  initialNotifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedUrl: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  initialUnreadCount: number;
  /** Liste complète des notifications (route par espace). */
  notificationsListHref: string;
  /** Calendrier de l’espace courant. */
  calendarHref: string;
};

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
  notificationsListHref,
  calendarHref,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const visibleUnreadCount = useMemo(
    () => notifications.reduce((count, notification) => count + (notification.isRead ? 0 : 1), 0),
    [notifications],
  );

  const badgeCount = Math.max(unreadCount, visibleUnreadCount);

  function markAsRead(notificationId: string) {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.isRead) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    startTransition(async () => {
      await markNotificationReadInlineAction(notificationId);
    });
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        data-interactive="true"
        aria-label="Ouvrir les notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/82 text-[var(--color-text-dark)] shadow-[0_16px_28px_-22px_rgba(44,47,49,0.38)] ring-1 ring-[#dbe2ea] backdrop-blur transition hover:bg-white"
      >
        <Bell className="h-4.5 w-4.5" />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-bright)] px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="ambient-ring absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(92vw,26rem)] overflow-hidden rounded-[1.45rem] bg-white/96 shadow-[0_24px_50px_-28px_rgba(44,47,49,0.42)] backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-[#e5ebf3] px-4 py-3">
              <div>
                <p className="font-display text-base font-bold text-[var(--color-text-dark)]">Notifications</p>
                <p className="text-xs text-[var(--color-text-dark)]/58">
                  {badgeCount > 0 ? `${badgeCount} non lue${badgeCount > 1 ? "s" : ""}` : "Aucune alerte en attente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-[var(--color-text-dark)]/56 hover:bg-[#f3f6fb] hover:text-[var(--color-text-dark)]"
              >
                Fermer
              </button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto p-3">
              {notifications.length === 0 ? (
                <div className="rounded-[1.1rem] bg-[var(--color-surface-high)] px-4 py-8 text-center">
                  <CircleDot className="mx-auto h-5 w-5 text-[var(--color-primary-bright)]/55" />
                  <p className="mt-3 font-medium text-[var(--color-text-dark)]">Aucune notification pour le moment.</p>
                  <p className="mt-1 text-sm text-[var(--color-text-dark)]/58">Les validations de sessions et prochains rappels apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const meta = notificationTypeMeta[notification.type];
                    const Icon = meta.icon;

                    return (
                      <article
                        key={notification.id}
                        className={cn(
                          "rounded-[1.15rem] border px-3 py-3 transition",
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
                              <p className="font-display text-sm font-bold text-[var(--color-text-dark)]">{notification.title}</p>
                              <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-dark)]/56">
                                {meta.label}
                              </span>
                              {!notification.isRead ? (
                                <span className="rounded-full bg-[var(--color-primary-bright)]/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#0050d6]">
                                  Nouveau
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-[var(--color-text-dark)]/76">{notification.message}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <span className="text-xs text-[var(--color-text-dark)]/52">{formatNotificationTimestamp(notification.createdAt)}</span>

                              {notification.relatedUrl ? (
                                <Link
                                  href={notification.relatedUrl}
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      markAsRead(notification.id);
                                    }
                                    setOpen(false);
                                  }}
                                  className="text-xs font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]"
                                >
                                  Ouvrir
                                </Link>
                              ) : null}

                              {!notification.isRead ? (
                                <button
                                  type="button"
                                  onClick={() => markAsRead(notification.id)}
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-dark)]/68 hover:text-[var(--color-text-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <CheckCheck className="h-3.5 w-3.5" />
                                  Marquer comme lu
                                </button>
                              ) : (
                                <span className="text-xs font-medium text-[var(--color-text-dark)]/48">Déjà lue</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-[#e5ebf3] px-4 py-3">
              <Link
                href={notificationsListHref}
                onClick={() => setOpen(false)}
                className="block text-sm font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]"
              >
                Voir toutes les notifications
              </Link>
              {pathname !== calendarHref ? (
                <Link
                  href={calendarHref}
                  onClick={() => setOpen(false)}
                  className="block text-sm font-semibold text-[var(--color-text-dark)]/72 hover:text-[var(--color-text-dark)]"
                >
                  Aller au calendrier
                </Link>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
