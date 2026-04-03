"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

import { loginWithCredentialsForm, type LoginFormState } from "@/actions/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const urlAuthError = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, isPending] = useActionState<
    LoginFormState,
    FormData
  >(loginWithCredentialsForm, null);

  const displayError =
    state?.error ??
    (urlAuthError === "CredentialsSignin"
      ? "Email ou mot de passe incorrect."
      : urlAuthError
        ? "La connexion a échoué. Réessayez."
        : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <form id="login-form" action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0c0910]" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white pl-10 pr-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              placeholder="vous@akaa.fr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0c0910]" htmlFor="password">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white pl-10 pr-11 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              placeholder="Minimum 8 caractères"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0c0910]/60 transition hover:text-[#0c0910]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={isPending}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0F63FF] px-4 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </motion.button>
      </form>

      <p className="text-center text-sm text-[#0c0910]/70">
        Pas encore de compte ?{" "}
        <Link className="font-semibold text-[#0F63FF] hover:underline" href="/register">
          Créer un compte
        </Link>
      </p>
    </motion.div>
  );
}
