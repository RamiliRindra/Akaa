"use client";

import { BookOpen, Calendar, Home, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/courses", label: "Apprendre", icon: BookOpen },
  { href: "/calendar", label: "Agenda", icon: Calendar },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/profile", label: "Profil", icon: User },
] as const;

export function PlatformBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-border-soft bg-white/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg md:hidden"
      aria-label="Navigation principale"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-interactive="true"
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 py-1 text-[10px] font-bold transition-transform active:scale-95",
              isActive ? "bg-[var(--color-primary)] text-white" : "text-[#64748b]",
            )}
          >
            <Icon className="mb-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
