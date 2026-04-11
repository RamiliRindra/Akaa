import Image from "next/image";

import logoAkaa from "@/img/logo_akaa.png";

export default function RootLoading() {
  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel ambient-ring flex w-full max-w-md flex-col items-center gap-5 px-8 py-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(15,99,255,0.18),transparent_70%)] blur-2xl" />
          <Image
            src={logoAkaa}
            alt="Logo Akaa"
            width={132}
            height={58}
            className="relative h-auto w-auto animate-pulse"
            priority
          />
        </div>
        <div className="space-y-2">
          <p className="editorial-eyebrow">Loading Experience</p>
          <h1 className="font-display text-2xl font-black text-[var(--color-text)]">Chargement en cours</h1>
          <p className="text-sm leading-6 text-[var(--color-text)]/68">
            Nous préparons votre espace d’apprentissage et vos données de progression.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:-0.2s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#655670] [animation-delay:-0.1s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#119da4]" />
        </div>
      </div>
    </div>
  );
}
