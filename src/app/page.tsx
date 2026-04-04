import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Award, BookOpen, Sparkles, Trophy } from "lucide-react";

import { getHomePathForRole } from "@/lib/auth-config";
import { getCachedSession } from "@/lib/auth-session";
import logoAkaa from "@/img/logo_akaa.png";

export default async function LandingPage() {
  const session = await getCachedSession();
  if (session?.user) {
    redirect(getHomePathForRole(session.user.role));
  }

  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col justify-between rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.68))] p-6 shadow-[0_28px_90px_-30px_rgba(44,47,49,0.18)] backdrop-blur md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3">
            <Image
              src={logoAkaa}
              alt="Logo Akaa"
              className="h-12 w-auto drop-shadow-[0_14px_26px_rgba(15,99,255,0.18)]"
              priority
            />
            <div>
              <p className="editorial-eyebrow">The Digital Atheneum</p>
              <p className="font-display text-xl font-extrabold text-[#2c2f31]">Akaa</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="ghost-button ambient-ring px-5 py-2.5 text-sm font-semibold transition"
            >
              Se connecter
            </Link>
            <Link href="/register" className="cta-button px-5 py-2.5 text-sm font-semibold transition">
              Rejoindre Akaa
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-14">
          <div className="space-y-8">
            <div className="space-y-5">
              <span className="chip chip-secondary">
                <Sparkles className="h-3.5 w-3.5" />
                Progression immersive, pas simple catalogue
              </span>
              <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-[#2c2f31] sm:text-6xl lg:text-7xl">
                Une plateforme d’apprentissage qui donne envie de{" "}
                <span className="hero-gradient-text">continuer.</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#2c2f31]/72 sm:text-lg">
                Akaa mêle rigueur éditoriale, progression gamifiée et lisibilité premium pour faire
                du e-learning un espace d’élan, de concentration et de récompense.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="cta-button px-6 py-3 text-sm font-semibold transition">
                Créer un compte
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="ghost-button ambient-ring px-6 py-3 text-sm font-semibold transition"
              >
                Accéder à mon espace
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="panel-card p-5">
                <div className="chip chip-primary w-fit">
                  <BookOpen className="h-3.5 w-3.5" />
                  Parcours
                </div>
                <p className="mt-4 font-display text-xl font-bold text-[#2c2f31]">Cours structurés</p>
                <p className="mt-2 text-sm leading-6 text-[#2c2f31]/68">
                  Modules, chapitres, quiz et import massif pour garder la production fluide.
                </p>
              </div>

              <div className="panel-card p-5">
                <div className="chip chip-secondary w-fit">
                  <Trophy className="h-3.5 w-3.5" />
                  Engagement
                </div>
                <p className="mt-4 font-display text-xl font-bold text-[#2c2f31]">Gamification utile</p>
                <p className="mt-2 text-sm leading-6 text-[#2c2f31]/68">
                  XP, niveaux, streaks et badges pour récompenser la progression sans brouiller le fond.
                </p>
              </div>

              <div className="panel-card p-5">
                <div className="chip chip-accent w-fit">
                  <Award className="h-3.5 w-3.5" />
                  Pilotage
                </div>
                <p className="mt-4 font-display text-xl font-bold text-[#2c2f31]">Back-office admin</p>
                <p className="mt-2 text-sm leading-6 text-[#2c2f31]/68">
                  Utilisateurs, catégories, badges et réglages XP centralisés dans un seul espace.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="glass-panel ambient-ring relative overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-x-10 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(15,99,255,0.18),transparent_70%)] blur-2xl" />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="editorial-eyebrow">Momentum Board</p>
                    <h2 className="font-display text-3xl font-extrabold text-[#2c2f31]">
                      Illuminated Focus
                    </h2>
                  </div>
                  <span className="chip chip-success">72% terminé</span>
                </div>

                <div className="rounded-[2rem] bg-[linear-gradient(135deg,#0050d6,#0f63ff)] p-6 text-white shadow-[0_28px_48px_-28px_rgba(0,80,214,0.9)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">Cours actif</p>
                  <h3 className="mt-3 font-display text-3xl font-extrabold">Marketing de contenu avancé</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/78">
                    Un parcours éditorial pensé pour maintenir le rythme, visualiser les progrès et donner
                    à chaque étape un vrai sentiment d’élan.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="panel-card bg-white/92 p-5">
                    <p className="text-sm text-[#2c2f31]/60">XP gagnés cette semaine</p>
                    <p className="mt-2 font-display text-4xl font-extrabold text-[#655670]">+180</p>
                  </div>
                  <div className="panel-card bg-white/92 p-5">
                    <p className="text-sm text-[#2c2f31]/60">Streak actif</p>
                    <p className="mt-2 font-display text-4xl font-extrabold text-[#775600]">12 jours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[#2c2f31]/8 pt-5 text-sm text-[#2c2f31]/58 sm:flex-row sm:items-center sm:justify-between">
          <p>Akaa transforme la progression en expérience lisible, valorisante et durable.</p>
          <p>Apprenants, formateurs, admins : une seule plateforme, des rôles distincts, un même niveau d’exigence.</p>
        </footer>
      </div>
    </main>
  );
}
