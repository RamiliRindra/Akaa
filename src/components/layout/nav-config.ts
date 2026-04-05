export type NavIconName =
  | "award"
  | "book-open"
  | "calendar-days"
  | "chart-no-axes-column"
  | "compass"
  | "gauge"
  | "graduation-cap"
  | "list-checks"
  | "shield"
  | "trophy"
  | "user-round"
  | "users-round";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

export const platformNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "gauge" },
  { href: "/courses", label: "Cours", icon: "book-open" },
  { href: "/calendar", label: "Calendrier", icon: "calendar-days" },
  { href: "/programs", label: "Parcours", icon: "list-checks" },
  { href: "/leaderboard", label: "Leaderboard", icon: "trophy" },
  { href: "/profile", label: "Profil", icon: "user-round" },
];

export const platformViewerNav: NavItem[] = [
  { href: "/courses", label: "Cours", icon: "book-open" },
  { href: "/calendar", label: "Calendrier", icon: "calendar-days" },
  { href: "/programs", label: "Parcours", icon: "list-checks" },
];

export const trainerNav: NavItem[] = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: "chart-no-axes-column" },
  { href: "/trainer/courses", label: "Mes cours", icon: "graduation-cap" },
  { href: "/trainer/calendar", label: "Sessions", icon: "calendar-days" },
  { href: "/trainer/programs", label: "Parcours", icon: "list-checks" },
];

export const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "shield" },
  { href: "/admin/users", label: "Utilisateurs", icon: "users-round" },
  { href: "/admin/courses", label: "Cours", icon: "compass" },
  { href: "/admin/calendar", label: "Sessions", icon: "calendar-days" },
  { href: "/admin/programs", label: "Parcours", icon: "list-checks" },
  { href: "/admin/categories", label: "Catégories", icon: "list-checks" },
  { href: "/admin/badges", label: "Badges", icon: "award" },
  { href: "/admin/xp", label: "Ajustement XP", icon: "trophy" },
];
