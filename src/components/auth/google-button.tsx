"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

type GoogleButtonProps = {
  callbackUrl?: string;
  enabled?: boolean;
};

export function GoogleButton({ callbackUrl = "/dashboard", enabled = false }: GoogleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setError(null);
          if (!enabled) {
            setError("Connexion Google indisponible: variables OAuth non configurées.");
            return;
          }
          startTransition(async () => {
            await signIn("google", { callbackUrl });
          });
        }}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0c0910]/15 bg-white px-4 py-3 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Globe className="h-4 w-4" />
        {isPending ? "Connexion Google..." : "Continuer avec Google"}
      </motion.button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
