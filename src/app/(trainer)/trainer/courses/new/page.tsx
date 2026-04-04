import Link from "next/link";
import { CourseStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { createCourseAction } from "@/actions/courses";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type NewCoursePageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function NewCoursePage({ searchParams }: NewCoursePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const feedback = await searchParams;
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/trainer/courses" className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à mes cours
        </Link>
        <h2 className="text-2xl font-bold text-[#0c0910]">Créer un nouveau cours</h2>
        <p className="text-sm text-[#0c0910]/70">
          Posez le cadre pédagogique du cours. Vous ajouterez ensuite modules et chapitres.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <form action={createCourseAction} className="space-y-5 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Titre du cours
          <input
            name="title"
            required
            className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
            placeholder="Ex. Fondamentaux du community management"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Description
          <textarea
            name="description"
            rows={4}
            className="w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 py-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
            placeholder="Décrivez le résultat attendu, le public visé et les compétences couvertes."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Catégorie
            <select
              name="categoryId"
              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              defaultValue=""
            >
              <option value="">Sans catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Statut initial
            <select
              name="status"
              defaultValue={CourseStatus.DRAFT}
              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
            >
              <option value={CourseStatus.DRAFT}>Brouillon</option>
              <option value={CourseStatus.PUBLISHED}>Publié</option>
              <option value={CourseStatus.ARCHIVED}>Archivé</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            URL de miniature
            <input
              name="thumbnailUrl"
              type="url"
              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              placeholder="https://..."
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Durée estimée (heures)
            <input
              name="estimatedHours"
              type="number"
              min="1"
              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              placeholder="6"
            />
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
        >
          Créer le cours
        </button>
      </form>
    </section>
  );
}

