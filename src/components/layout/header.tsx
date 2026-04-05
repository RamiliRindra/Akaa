"use client";

import { motion } from "framer-motion";
import { Flame, Sparkles, Zap } from "lucide-react";

type HeaderProps = {
  title: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  showGamification: boolean;
};

export function Header({ title, totalXp, level, currentStreak, showGamification }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="glass-panel ambient-ring flex min-h-[4.75rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
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

          <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(0,80,214,0.12),rgba(15,99,255,0.18))] sm:hidden">
            <Sparkles className="h-4 w-4 text-[#0F63FF]" />
          </div>
        </div>
      </div>
    </header>
  );
}
