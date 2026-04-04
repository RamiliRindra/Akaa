"use client";

import { motion } from "framer-motion";
import { Flame, Sparkles, Zap } from "lucide-react";

import { UserMenu } from "@/components/layout/user-menu";

type HeaderProps = {
  title: string;
  userName: string;
  userEmail?: string | null;
  totalXp: number;
  level: number;
  currentStreak: number;
};

export function Header({ title, userName, userEmail, totalXp, level, currentStreak }: HeaderProps) {
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[#0c0910]/10 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div>
          <h1 className="text-base font-bold text-[#0c0910] sm:text-lg">{title}</h1>
          <p className="text-xs text-[#0c0910]/60">Plateforme e-learning gamifiée</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden items-center gap-2 rounded-full border border-[#453750]/20 bg-[#453750]/10 px-3 py-1 text-xs font-semibold text-[#453750] sm:flex"
          >
            <Zap className="h-3.5 w-3.5 text-[#ffc857]" />
            {totalXp} XP
            <span className="text-[#453750]/70">• Niveau {level}</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden items-center gap-2 rounded-full border border-[#ffc857]/30 bg-[#ffc857]/15 px-3 py-1 text-xs font-semibold text-[#8a6110] lg:flex"
          >
            <Flame className="h-3.5 w-3.5 text-[#f97316]" />
            Streak {currentStreak} jour{currentStreak > 1 ? "s" : ""}
          </motion.div>

          <div className="hidden items-center gap-2 rounded-xl border border-[#0c0910]/10 bg-white px-2 py-1 sm:flex">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0F63FF] text-xs font-bold text-white">
              {initial}
            </div>
            <div className="max-w-40">
              <p className="truncate text-xs font-semibold text-[#0c0910]">{userName}</p>
              <p className="truncate text-[11px] text-[#0c0910]/60">{userEmail ?? "Compte local"}</p>
            </div>
          </div>

          <motion.div whileHover={{ y: -1 }} className="hidden sm:block">
            <UserMenu />
          </motion.div>

          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#0F63FF]/10 sm:hidden">
            <Sparkles className="h-4 w-4 text-[#0F63FF]" />
          </div>
        </div>
      </div>
    </header>
  );
}
