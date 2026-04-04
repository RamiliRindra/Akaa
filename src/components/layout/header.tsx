"use client";

import { motion } from "framer-motion";
import { Flame, Sparkles, Zap } from "lucide-react";

type HeaderProps = {
  title: string;
  userName: string;
  userEmail?: string | null;
  totalXp: number;
  level: number;
  currentStreak: number;
  showGamification: boolean;
};

export function Header({ title, userName, userEmail, totalXp, level, currentStreak, showGamification }: HeaderProps) {
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="glass-panel ambient-ring flex min-h-[4.75rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="editorial-eyebrow hidden sm:block">Illuminated Focus</p>
          <h1 className="font-display truncate text-lg font-extrabold text-[#0c0910] sm:text-2xl">{title}</h1>
          <p className="text-xs text-[#0c0910]/58 sm:text-sm">Plateforme e-learning gamifiée</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showGamification ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden items-center gap-2 rounded-full bg-[#655670]/12 px-4 py-2 text-xs font-semibold text-[#655670] sm:flex"
              >
                <Zap className="h-3.5 w-3.5 text-[#ffc857]" />
                {totalXp} XP
                <span className="text-[#655670]/70">• Niveau {level}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden items-center gap-2 rounded-full bg-[#ffc857]/18 px-4 py-2 text-xs font-semibold text-[#775600] lg:flex"
              >
                <Flame className="h-3.5 w-3.5 text-[#f97316]" />
                Streak {currentStreak} jour{currentStreak > 1 ? "s" : ""}
              </motion.div>
            </>
          ) : null}

          <div className="hidden items-center gap-3 rounded-full bg-white/80 px-2 py-1.5 shadow-[0_12px_24px_-20px_rgba(44,47,49,0.4)] sm:flex">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#0050d6,#0f63ff)] text-xs font-bold text-white">
              {initial}
            </div>
            <div className="max-w-40">
              <p className="truncate text-xs font-semibold text-[#0c0910]">{userName}</p>
              <p className="truncate text-[11px] text-[#0c0910]/60">{userEmail ?? "Compte local"}</p>
            </div>
          </div>

          <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(0,80,214,0.12),rgba(15,99,255,0.18))] sm:hidden">
            <Sparkles className="h-4 w-4 text-[#0F63FF]" />
          </div>
        </div>
      </div>
    </header>
  );
}
