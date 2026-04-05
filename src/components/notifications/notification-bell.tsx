"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarMinus2,
  CheckCheck,
  CircleDot,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { NotificationType } from "@prisma/client";

import { markNotificationReadInlineAction } from "@/actions/training";
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
};

const notificationTypeMeta: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; accent: string; label: string }
> = {
  SESSION_REQUEST: {
    icon: CalendarClock,
    accent: "bg-[#0F63FF]/10 text-[#0050d6]",
    label: "Demande",
  },
  SESSION_APPROVED: {
    icon: CalendarCheck2,
    accent: "bg-[#119da4]/12 text-[#0b7d83]",
    label: "Approuvée",
  },
  SESSION_REJECTED: {
    icon: XCircle,
    accent: "bg-red-50 text-red-600",
    label: "Refusée",
  },
  SESSION_CANCELLED: {
    icon: CalendarMinus2,
    accent: "bg-[#453750]/10 text-[#453750]",
    label: "Annulée",
  },
  SESSION_REMINDER: {
    icon: Bell,
    accent: "bg-[#ffc857]/18 text-[#8a6200]",
    label: "Rappel",
  },
  XP_GAINED: {
    icon: Sparkles,
    accent: "bg-[#655670]/10 text-[#655670]",
    label: "XP",
  },
  BADGE_UNLOCKED: {
    icon: Award,
    accent: "bg-[#ffc857]/18 text-[#8a6200]",
    label: "Badge",
  },
};

function formatNotificationTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat("fr-FR", {
    ...(isSameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  }).format(date);
}

export function NotificationBell({ initialNotifications, initialUnreadCount }: NotificationBellProps) {
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
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/82 text-[#0c0910] shadow-[0_16px_28px_-22px_rgba(44,47,49,0.38)] ring-1 ring-[#dbe2ea] backdrop-blur transition hover:bg-white"
      >
        <Bell className="h-4.5 w-4.5" />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#0F63FF] px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
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
                <p className="font-display text-base font-bold text-[#0c0910]">Notifications</p>
                <p className="text-xs text-[#0c0910]/58">
                  {badgeCount > 0 ? `${badgeCount} non lue${badgeCount > 1 ? "s" : ""}` : "Aucune alerte en attente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-[#0c0910]/56 hover:bg-[#f3f6fb] hover:text-[#0c0910]"
              >
                Fermer
              </button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto p-3">
              {notifications.length === 0 ? (
                <div className="rounded-[1.1rem] bg-[#f7f9ff] px-4 py-8 text-center">
                  <CircleDot className="mx-auto h-5 w-5 text-[#0F63FF]/55" />
                  <p className="mt-3 font-medium text-[#0c0910]">Aucune notification pour le moment.</p>
                  <p className="mt-1 text-sm text-[#0c0910]/58">Les validations de sessions et prochains rappels apparaîtront ici.</p>
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
                            <p className="mt-1 text-sm leading-6 text-[#0c0910]/76">{notification.message}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <span className="text-xs text-[#0c0910]/52">{formatNotificationTimestamp(notification.createdAt)}</span>

                              {notification.relatedUrl ? (
                                <Link
                                  href={notification.relatedUrl}
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      markAsRead(notification.id);
                                    }
                                    setOpen(false);
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
                                <span className="text-xs font-medium text-[#0c0910]/48">Déjà lue</span>
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

            {pathname !== "/calendar" ? (
              <div className="border-t border-[#e5ebf3] px-4 py-3">
                <Link
                  href="/calendar"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-[#0050d6] hover:text-[#0F63FF]"
                >
                  Aller au calendrier
                </Link>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
