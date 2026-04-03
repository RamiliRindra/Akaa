import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  ChartNoAxesColumn,
  Compass,
  Gauge,
  GraduationCap,
  ListChecks,
  Shield,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import type { NavIconName } from "@/components/layout/nav-config";

const navIcons: Record<NavIconName, LucideIcon> = {
  award: Award,
  "book-open": BookOpen,
  "chart-no-axes-column": ChartNoAxesColumn,
  compass: Compass,
  gauge: Gauge,
  "graduation-cap": GraduationCap,
  "list-checks": ListChecks,
  shield: Shield,
  trophy: Trophy,
  "user-round": UserRound,
  "users-round": UsersRound,
};

export function getNavIcon(iconName: NavIconName): LucideIcon {
  return navIcons[iconName];
}
