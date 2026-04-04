"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTransition } from "react";

import { Spinner } from "@/components/ui/spinner";

type UserMenuProps = {
  className?: string;
};

export function UserMenu({ className }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      data-interactive="true"
      onClick={() => {
        startTransition(async () => {
          await signOut({ callbackUrl: "/login" });
        });
      }}
      disabled={isPending}
      className={`ghost-button ambient-ring inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0c0910] transition disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      {isPending ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
      {isPending ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}
