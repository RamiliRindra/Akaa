"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTransition } from "react";

export function UserMenu() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await signOut({ callbackUrl: "/login" });
        });
      }}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-[#0c0910]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}
