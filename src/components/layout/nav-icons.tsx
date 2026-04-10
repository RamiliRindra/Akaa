import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  Compass,
  Gauge,
  GraduationCap,
  KeyRound,
  ListChecks,
  Shield,
  Star,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import type { NavIconName } from "@/components/layout/nav-config";

const navIcons: Record<NavIconName, LucideIcon> = {
  award: Award,
  "book-open": BookOpen,
  "calendar-days": CalendarDays,
  "chart-no-axes-column": ChartNoAxesColumn,
  compass: Compass,
  gauge: Gauge,
  "graduation-cap": GraduationCap,
  "key-round": KeyRound,
  "list-checks": ListChecks,
  shield: Shield,
  star: Star,
  trophy: Trophy,
  "user-round": UserRound,
  "users-round": UsersRound,
};

export function getNavIcon(iconName: NavIconName): LucideIcon {
  return navIcons[iconName];
}
