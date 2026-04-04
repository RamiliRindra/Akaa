"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

type GoogleButtonProps = {
  callbackUrl?: string;
  enabled?: boolean;
};

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.48a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.56-5.17 3.56-8.69Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3.02c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.26A7.2 7.2 0 0 1 4.89 12c0-.78.13-1.53.38-2.26V6.63H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.37l4.01-3.11Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.76 0 3.35.61 4.59 1.8l3.44-3.44C17.95 1.13 15.23 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.11c.95-2.85 3.6-4.97 6.73-4.97Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({ callbackUrl = "/dashboard", enabled = false }: GoogleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        data-interactive="true"
        onClick={() => {
          setError(null);
          if (!enabled) {
            setError("Connexion Google indisponible: configuration OAuth absente.");
            return;
          }
          startTransition(async () => {
            await signIn("google", { callbackUrl });
          });
        }}
        disabled={isPending}
        className="secondary-button w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {isPending ? "Connexion Google..." : "Continuer avec Google"}
      </motion.button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
