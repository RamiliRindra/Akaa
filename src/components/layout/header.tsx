"use client";

import type { NotificationType } from "@prisma/client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Flame, Search, UserRound, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";

type HeaderProps = {
  /** Vide = pas de titre (ex. apprenant sur la plateforme). */
  title: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  showGamification: boolean;
  showGlobalSearch?: boolean;
  userImage?: string | null;
  userName?: string;
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedUrl: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  unreadNotificationCount: number;
  notificationsListHref: string;
  calendarHref: string;
};

export function Header({
  title,
  totalXp,
  level,
  currentStreak,
  showGamification,
  showGlobalSearch = false,
  userImage,
  userName,
  notifications,
  unreadNotificationCount,
  notificationsListHref,
  calendarHref,
}: HeaderProps) {
  const xpIntoLevel = totalXp % 100;
  const levelProgress = xpIntoLevel / 100;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showTitle = title.trim().length > 0;

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="glass-panel ambient-ring flex min-h-[4.75rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {showGlobalSearch ? (
          <div className="relative order-2 hidden min-w-0 flex-1 lg:order-1 lg:block">
            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#64748b]">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            <input
              type="search"
              readOnly
              tabIndex={-1}
              placeholder="Rechercher dans vos formations…"
              title="Fonctionnalité à venir"
              aria-label="Recherche (bientôt disponible)"
              className="w-full max-w-md rounded-full border-0 bg-[var(--color-surface-low)] py-2 pl-12 pr-4 text-sm text-[var(--color-text)] outline-none ring-[#0050d6]/20 transition placeholder:text-[#64748b] focus:ring-2"
            />
          </div>
        ) : null}

        {showTitle ? (
          <div
            className={`order-1 min-w-0 lg:order-2 ${showGlobalSearch ? "flex-1 lg:flex-none" : "flex-1"}`}
          >
            <h1 className="font-display truncate text-lg font-extrabold text-[var(--color-text-dark)] sm:text-2xl">{title}</h1>
          </div>
        ) : null}

        <div
          className={`order-3 flex flex-wrap items-center justify-end gap-2 sm:gap-3 lg:order-3 ${!showTitle ? "ml-auto" : ""}`}
        >
          <NotificationBell
            initialNotifications={notifications}
            initialUnreadCount={unreadNotificationCount}
            notificationsListHref={notificationsListHref}
            calendarHref={calendarHref}
          />

          {showGamification ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-2.5 py-1.5 text-white shadow-sm sm:px-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-white">
                  Niv. {level}
                </span>
                <div
                  className="hidden h-1.5 w-10 overflow-hidden rounded-full bg-white/25 sm:block sm:w-14"
                  title="Progression vers le niveau suivant"
                >
                  <div
                    className="h-full rounded-full bg-white transition-[width]"
                    style={{ width: `${Math.round(levelProgress * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold tabular-nums text-white">{totalXp} XP</span>
                <Zap className="h-3.5 w-3.5 text-[#ffc857] sm:hidden" aria-hidden />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden items-center gap-1.5 rounded-full bg-[#ffc857]/18 px-3 py-1.5 text-xs font-semibold text-[#775600] lg:flex"
              >
                <Flame className="h-3.5 w-3.5 text-[#f97316]" aria-hidden />
                <span>
                  {currentStreak} jour{currentStreak > 1 ? "s" : ""}
                </span>
              </motion.div>
            </>
          ) : null}

          <Link
            href="/profile"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm"
          >
            {userImage && !avatarFailed ? (
              <Image
                src={userImage}
                alt={userName ? `Photo de ${userName}` : "Profil"}
                width={40}
                height={40}
                className="h-full w-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <UserRound className="h-5 w-5 text-slate-500" aria-hidden />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
