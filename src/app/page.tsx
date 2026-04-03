import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import logoAkaa from "@/img/logo_akaa.png";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }
  if (session?.user?.role === "TRAINER") {
    redirect("/trainer/dashboard");
  }
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-2xl rounded-2xl border border-[#0c0910]/10 bg-white p-8 text-center shadow-sm">
        <Image src={logoAkaa} alt="Logo Akaa" className="mx-auto h-14 w-auto" priority />
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#0c0910]">
          Akaa, votre e-learning gamifié
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#0c0910]/70">
          Connectez-vous pour accéder à votre espace apprenant, formateur ou administrateur.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0F63FF] px-5 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#0c0910]/15 bg-white px-5 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
          >
            Créer un compte
          </Link>
        </div>
      </section>
    </main>
  );
}
