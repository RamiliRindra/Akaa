"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";

import { registerWithCredentials } from "@/actions/auth";
import { Spinner } from "@/components/ui/spinner";
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

      // Connexion automatique + redirect : géré côté serveur dans registerWithCredentials.
      // Si la navigation n’a pas lieu, on affiche un message de secours.
      setSuccess("Compte créé. Si la page ne change pas, connectez-vous manuellement.");
      setForm(INITIAL_FORM);
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
          <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="form-input pl-12 pr-4 text-sm"
            placeholder="Votre nom"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#0c0910]" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="form-input pl-12 pr-4 text-sm"
            placeholder="vous@akaa.fr"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#0c0910]" htmlFor="password">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="form-input pl-12 pr-12 text-sm"
            placeholder="Minimum 8 caractères"
          />
          <button
            type="button"
            data-interactive="true"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#0c0910]/60 transition hover:text-[#0c0910]"
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
          <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#0c0910]/50" />
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            className="form-input pl-12 pr-12 text-sm"
            placeholder="Retapez votre mot de passe"
          />
          <button
            type="button"
            data-interactive="true"
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#0c0910]/60 transition hover:text-[#0c0910]"
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
        className="primary-button inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Spinner /> : null}
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
