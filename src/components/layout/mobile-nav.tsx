"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getNavIcon } from "@/components/layout/nav-icons";
import type { NavItem } from "@/components/layout/nav-config";

type MobileNavProps = {
  items: NavItem[];
};

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/78 text-[#0c0910] shadow-[0_12px_28px_-16px_rgba(44,47,49,0.5)] backdrop-blur"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass-panel ambient-ring absolute left-0 right-0 top-16 z-30 mx-3 p-4"
          >
            <nav className="space-y-2">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = getNavIcon(item.icon);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-[linear-gradient(135deg,rgba(0,80,214,0.14),rgba(15,99,255,0.08))] text-[#0050d6]"
                        : "text-[#0c0910]/80 hover:bg-white/80 hover:text-[#0050d6]"
                    }`}
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${isActive ? "bg-white/80" : "bg-[#eef1f3]"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
