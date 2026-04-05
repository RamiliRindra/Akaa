"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo } from "@/components/layout/app-logo";
import { getNavIcon } from "@/components/layout/nav-icons";
import type { NavItem } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";

type SidebarProps = {
  title: string;
  items: NavItem[];
  workspace: "platform" | "trainer" | "admin";
  userName: string;
  userEmail?: string | null;
  userRole: "LEARNER" | "TRAINER" | "ADMIN";
};

export function Sidebar({ title, items, workspace, userName, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[19rem] shrink-0 px-4 py-5 lg:block">
      <div className="glass-panel ambient-ring flex h-full flex-col overflow-hidden px-5 py-6">
        <AppLogo />
        <div className="mt-6 rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(0,80,214,0.08),rgba(101,86,112,0.06))] px-4 py-4">
          <p className="font-display text-lg font-bold text-[#0c0910]">{title}</p>
        </div>
        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = getNavIcon(item.icon);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-interactive="true"
                className={`relative flex items-center gap-3 rounded-[1.35rem] px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(0,80,214,0.14),rgba(15,99,255,0.08))] text-[#0050d6]"
                    : "text-[#0c0910]/80 hover:bg-white/70 hover:text-[#0050d6]"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-[1.35rem] ring-1 ring-[#0050d6]/12"
                  />
                ) : null}
                <span
                  className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full ${
                    isActive ? "bg-white/80" : "bg-[#eef1f3]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-[#0c0910]/8 pt-5">
          <UserMenu
            name={userName}
            email={userEmail}
            role={userRole}
            workspace={workspace}
            className="w-full"
          />
        </div>
      </div>
    </aside>
  );
}
