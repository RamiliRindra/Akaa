import type { NotificationType } from "@prisma/client";
import type { ComponentType } from "react";
import {
  Award,
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarMinus2,
  Sparkles,
  XCircle,
} from "lucide-react";

export const notificationTypeMeta: Record<
  NotificationType,
  { icon: ComponentType<{ className?: string }>; accent: string; label: string }
> = {
  SESSION_REQUEST: {
    icon: CalendarClock,
    accent: "bg-[var(--color-primary-bright)]/10 text-[#0050d6]",
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

export function formatNotificationTimestamp(value: string) {
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
