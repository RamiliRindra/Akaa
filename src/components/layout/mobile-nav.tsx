"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AppLogo } from "@/components/layout/app-logo";
import { getNavIcon } from "@/components/layout/nav-icons";
import type { NavItem } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";

type MobileNavProps = {
  title: string;
  items: NavItem[];
  workspace: "platform" | "trainer" | "admin";
  userName: string;
  userEmail?: string | null;
  userImage?: string | null;
  userRole: "LEARNER" | "TRAINER" | "ADMIN";
};

export function MobileNav({ title, items, workspace, userName, userEmail, userImage, userRole }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        data-interactive="true"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-white text-[var(--color-text-dark)] shadow-ambient transition hover:shadow-focus-soft"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 bg-(--color-text-dark)/28 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              className="glass-panel ambient-ring fixed bottom-3 left-3 top-3 z-40 flex w-[18rem] flex-col p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <AppLogo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  data-interactive="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-[var(--color-text-dark)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 rounded-comfortable border border-border-soft bg-[linear-gradient(135deg,rgba(0,80,214,0.08),rgba(101,86,112,0.06))] px-4 py-4">
                <p className="font-display text-lg font-bold text-[var(--color-text-dark)]">{title}</p>
              </div>

              <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = getNavIcon(item.icon);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-interactive="true"
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-comfortable px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[linear-gradient(135deg,rgba(0,80,214,0.14),rgba(15,99,255,0.08))] text-[#0050d6]"
                          : "text-[var(--color-text-dark)]/80 hover:bg-white/80 hover:text-[#0050d6]"
                      }`}
                    >
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${isActive ? "bg-white/80" : "bg-[var(--color-surface-low)]"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 shrink-0 border-t border-border-soft pt-5">
                <UserMenu
                  name={userName}
                  email={userEmail}
                  image={userImage}
                  role={userRole}
                  workspace={workspace}
                  onNavigate={() => setOpen(false)}
                  className="w-full"
                />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
