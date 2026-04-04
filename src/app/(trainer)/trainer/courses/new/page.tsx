import Link from "next/link";
import { CourseStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { createCourseAction } from "@/actions/courses";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { getCachedSession } from "@/lib/auth-session";
import { courseLevelDescriptions, courseLevelLabels } from "@/lib/course-level";
import { db } from "@/lib/db";

type NewCoursePageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function NewCoursePage({ searchParams }: NewCoursePageProps) {
  const session = await getCachedSession();
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
            className="form-input text-sm"
            placeholder="Ex. Fondamentaux du community management"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Description
          <textarea
            name="description"
            rows={4}
            className="form-textarea text-sm"
            placeholder="Décrivez le résultat attendu, le public visé et les compétences couvertes."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Niveau pédagogique
            <select
              name="level"
              defaultValue="BEGINNER"
              className="form-select text-sm"
            >
              <option value="BEGINNER">
                {courseLevelLabels.BEGINNER} — {courseLevelDescriptions.BEGINNER}
              </option>
              <option value="INTERMEDIATE">
                {courseLevelLabels.INTERMEDIATE} — {courseLevelDescriptions.INTERMEDIATE}
              </option>
              <option value="ADVANCED">
                {courseLevelLabels.ADVANCED} — {courseLevelDescriptions.ADVANCED}
              </option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Catégorie
            <select
              name="categoryId"
              className="form-select text-sm"
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
              className="form-select text-sm"
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
              className="form-input text-sm"
              placeholder="https://..."
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Durée estimée (heures)
            <input
              name="estimatedHours"
              type="number"
              min="1"
              className="form-input text-sm"
              placeholder="6"
            />
          </label>
        </div>

        <button
          type="submit"
          className="primary-button px-4 py-2 text-sm font-semibold"
        >
          Créer le cours
        </button>
      </form>
    </section>
  );
}
