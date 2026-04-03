"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo } from "@/components/layout/app-logo";
import type { NavItem } from "@/components/layout/nav-config";

type SidebarProps = {
  title: string;
  items: NavItem[];
};

export function Sidebar({ title, items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-[#0c0910]/10 bg-white lg:block">
      <div className="flex h-full flex-col px-5 py-6">
        <AppLogo />
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#453750]">{title}</p>
        <nav className="mt-4 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#0F63FF]/10 text-[#0F63FF]"
                    : "text-[#0c0910]/80 hover:bg-[#0F63FF]/5 hover:text-[#0F63FF]"
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-xl border border-[#0F63FF]/20"
                  />
                ) : null}
                <item.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
