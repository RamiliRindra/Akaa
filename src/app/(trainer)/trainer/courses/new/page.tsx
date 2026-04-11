import Link from "next/link";
import { CourseStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { createCourseAction } from "@/actions/courses";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
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
        <Link href="/trainer/courses" className="text-sm font-medium text-[var(--color-primary-bright)] hover:underline">
          ← Retour à mes cours
        </Link>
        <h2 className="text-2xl font-bold text-[var(--color-text-dark)]">Créer un nouveau cours</h2>
        <p className="text-sm text-[var(--color-text-dark)]/70">
          Posez le cadre pédagogique du cours. Vous ajouterez ensuite modules et chapitres.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <form action={createCourseAction} className="space-y-5 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-6 shadow-sm">
        <FormField label="Titre du cours" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            required
            className="text-sm"
            placeholder="Ex. Fondamentaux du community management"
          />
        </FormField>

        <FormField label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={4}
            className="text-sm"
            placeholder="Décrivez le résultat attendu, le public visé et les compétences couvertes."
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Niveau pédagogique" htmlFor="level">
            <Select id="level" name="level" defaultValue="BEGINNER" className="text-sm">
              <option value="BEGINNER">
                {courseLevelLabels.BEGINNER} — {courseLevelDescriptions.BEGINNER}
              </option>
              <option value="INTERMEDIATE">
                {courseLevelLabels.INTERMEDIATE} — {courseLevelDescriptions.INTERMEDIATE}
              </option>
              <option value="ADVANCED">
                {courseLevelLabels.ADVANCED} — {courseLevelDescriptions.ADVANCED}
              </option>
            </Select>
          </FormField>

          <FormField label="Catégorie" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue="" className="text-sm">
              <option value="">Sans catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Statut initial" htmlFor="status">
            <Select id="status" name="status" defaultValue={CourseStatus.DRAFT} className="text-sm">
              <option value={CourseStatus.DRAFT}>Brouillon</option>
              <option value={CourseStatus.PUBLISHED}>Publié</option>
              <option value={CourseStatus.ARCHIVED}>Archivé</option>
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="URL de miniature" htmlFor="thumbnailUrl">
            <Input id="thumbnailUrl" name="thumbnailUrl" type="url" className="text-sm" placeholder="https://..." />
          </FormField>

          <FormField label="Durée estimée (heures)" htmlFor="estimatedHours">
            <Input id="estimatedHours" name="estimatedHours" type="number" min="1" className="text-sm" placeholder="6" />
          </FormField>
        </div>

        <SubmitButton
          className="primary-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
          pendingLabel="Création..."
        >
          Créer le cours
        </SubmitButton>
      </form>
    </section>
  );
}
