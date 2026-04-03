"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState, useTransition } from "react";

import { registerWithCredentials } from "@/actions/auth";
import { type RegisterInput, registerSchema } from "@/lib/validations/auth";

const INITIAL_FORM: RegisterInput = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<RegisterInput>(INITIAL_FORM);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    startTransition(async () => {
      const result = await registerWithCredentials(parsed.data);
      if (!result.success) {
        setError(result.error ?? "Impossible de créer le compte.");
        return;
      }

      setSuccess("Compte créé avec succès. Connexion en cours...");

      const loginResult = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        setSuccess("Compte créé. Connectez-vous maintenant.");
        setForm(INITIAL_FORM);
        return;
      }

      const next = loginResult.url ?? "/dashboard";
      window.location.assign(next.startsWith("/") ? next : new URL(next, window.location.origin).href);
    });
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#0c0910]" htmlFor="name">
          Nom complet
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white pl-10 pr-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
            placeholder="Votre nom"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#0c0910]" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
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
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#0c0910]" htmlFor="confirmPassword">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white pl-10 pr-11 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
            placeholder="Retapez votre mot de passe"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0c0910]/60 transition hover:text-[#0c0910]"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-[#119da4]">{success}</p> : null}

      <motion.button
        type="submit"
        whileTap={{ scale: 0.98 }}
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0F63FF] px-4 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Création du compte..." : "Créer mon compte"}
      </motion.button>

      <p className="text-center text-sm text-[#0c0910]/70">
        Déjà inscrit ?{" "}
        <Link className="font-semibold text-[#0F63FF] hover:underline" href="/login">
          Se connecter
        </Link>
      </p>
    </motion.form>
  );
}
