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

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const platformNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/courses", label: "Cours", icon: BookOpen },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profil", icon: UserRound },
];

export const trainerNav: NavItem[] = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: ChartNoAxesColumn },
  { href: "/trainer/courses", label: "Mes cours", icon: GraduationCap },
];

export const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Shield },
  { href: "/admin/users", label: "Utilisateurs", icon: UsersRound },
  { href: "/admin/courses", label: "Cours", icon: Compass },
  { href: "/admin/categories", label: "Catégories", icon: ListChecks },
  { href: "/admin/badges", label: "Badges", icon: Award },
  { href: "/admin/xp", label: "Ajustement XP", icon: Trophy },
];
