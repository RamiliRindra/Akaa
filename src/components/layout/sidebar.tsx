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
  userImage?: string | null;
  userRole: "LEARNER" | "TRAINER" | "ADMIN";
};

export function Sidebar({ title, items, workspace, userName, userEmail, userImage, userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-10 hidden h-screen w-64 shrink-0 px-3 py-6 lg:block">
      <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden border border-white/50 bg-slate-50/80 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="shrink-0 px-4 pb-8 pt-2">
          <AppLogo />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Vision guidée</p>
          <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,rgba(0,80,214,0.06),rgba(101,86,112,0.05))] px-3 py-3">
            <p className="font-display text-base font-bold leading-tight text-[#0c0910]">{title}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pr-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = getNavIcon(item.icon);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-interactive="true"
                className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  isActive
                    ? "border-r-4 border-[#0050d6] bg-[#0050d6]/8 text-[#0050d6]"
                    : "text-slate-500 hover:bg-[#0050d6]/5 hover:text-[#0050d6]"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-xl ring-1 ring-[#0050d6]/10"
                  />
                ) : null}
                <span
                  className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full ${
                    isActive ? "bg-white shadow-sm" : "bg-[#eef1f3]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {workspace === "platform" ? (
          <div className="shrink-0 px-4 pb-4">
            <Link
              href="/courses"
              className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#0050d6] to-indigo-500 py-3.5 text-sm font-bold !text-white shadow-lg shadow-[#0050d6]/20 transition-opacity hover:opacity-90 hover:!text-white"
            >
              Explorer les formations
            </Link>
          </div>
        ) : null}
        <div className="shrink-0 border-t border-[#0c0910]/8 px-2 pb-4 pt-4">
          <UserMenu
            name={userName}
            email={userEmail}
            image={userImage}
            role={userRole}
            workspace={workspace}
            className="w-full"
          />
        </div>
      </div>
    </aside>
  );
}
