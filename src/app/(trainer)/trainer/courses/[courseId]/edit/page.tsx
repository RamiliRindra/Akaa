import Link from "next/link";
import { CourseStatus } from "@prisma/client";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  createChapterAction,
  createModuleAction,
  deleteChapterAction,
  deleteCourseAction,
  deleteModuleAction,
  moveChapterAction,
  moveModuleAction,
  updateCourseAction,
  updateModuleAction,
} from "@/actions/courses";
import { CourseStatusBadge } from "@/components/course/course-status-badge";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { SuccessConfetti } from "@/components/feedback/success-confetti";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { getCachedSession } from "@/lib/auth-session";
import { courseLevelDescriptions, courseLevelLabels } from "@/lib/course-level";
import { db } from "@/lib/db";

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function EditCoursePage({ params, searchParams }: EditCoursePageProps) {
  const [{ courseId }, feedback, session] = await Promise.all([params, searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      estimatedHours: true,
      thumbnailUrl: true,
      status: true,
      level: true,
      trainerId: true,
      categoryId: true,
      category: {
        select: { name: true },
      },
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          chapters: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              estimatedMinutes: true,
              videoType: true,
              order: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  if (session.user.role !== "ADMIN" && course.trainerId !== session.user.id) {
    redirect("/trainer/courses");
  }

  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <section className="space-y-6">
      <SuccessConfetti
        active={
          feedback.type === "success" &&
          Boolean(
            feedback.message?.toLowerCase().includes("cours créé") ||
              feedback.message?.toLowerCase().includes("cours importé"),
          )
        }
      />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <Link href="/trainer/courses" className="text-sm font-medium text-[var(--color-primary-bright)] hover:underline">
            ← Retour à mes cours
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-[var(--color-text-dark)]">{course.title}</h2>
            <CourseStatusBadge status={course.status} />
          </div>
          <p className="text-sm text-[var(--color-text-dark)]/70">
            Structurez le cours, ajoutez les modules, puis rédigez vos chapitres.
          </p>
        </div>

        <form action={deleteCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <ConfirmSubmitButton
            triggerClassName="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            triggerChildren={
              <>
                <Trash2 className="h-4 w-4" />
                Supprimer le cours
              </>
            }
            title="Supprimer ce cours ?"
            description="Cette action supprimera définitivement le cours et tous ses contenus associés."
            requireText="delete"
            requireTextPlaceholder="delete"
            confirmLabel="Supprimer définitivement"
            pendingLabel="Suppression..."
            confirmClassName="danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
          />
        </form>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <form action={updateCourseAction} className="space-y-5 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-6 shadow-sm">
            <input type="hidden" name="courseId" value={course.id} />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Informations du cours</h3>
                <p className="text-sm text-[var(--color-text-dark)]/60">Le slug public est généré automatiquement depuis le titre.</p>
              </div>
            </div>

            <FormField label="Titre" htmlFor="edit-title" required>
              <Input id="edit-title" name="title" required defaultValue={course.title} className="text-sm" />
            </FormField>

            <FormField label="Description" htmlFor="edit-description">
              <Textarea
                id="edit-description"
                name="description"
                rows={4}
                defaultValue={course.description ?? ""}
                className="text-sm"
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Niveau pédagogique" htmlFor="edit-level">
                <Select id="edit-level" name="level" defaultValue={course.level} className="text-sm">
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

              <FormField label="Catégorie" htmlFor="edit-categoryId">
                <Select id="edit-categoryId" name="categoryId" defaultValue={course.categoryId ?? ""} className="text-sm">
                  <option value="">Sans catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Statut" htmlFor="edit-status">
                <Select id="edit-status" name="status" defaultValue={course.status} className="text-sm">
                  <option value={CourseStatus.DRAFT}>Brouillon</option>
                  <option value={CourseStatus.PUBLISHED}>Publié</option>
                  <option value={CourseStatus.ARCHIVED}>Archivé</option>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="URL de miniature" htmlFor="edit-thumbnailUrl">
                <Input id="edit-thumbnailUrl" name="thumbnailUrl" type="url" defaultValue={course.thumbnailUrl ?? ""} className="text-sm" />
              </FormField>

              <FormField label="Durée estimée (heures)" htmlFor="edit-estimatedHours">
                <Input
                  id="edit-estimatedHours"
                  name="estimatedHours"
                  type="number"
                  min="1"
                  defaultValue={course.estimatedHours ?? ""}
                  className="text-sm"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-dark)]/50">Slug public actuel : /courses/{course.slug}</p>
              <SubmitButton
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-bright)] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[var(--color-primary-bright)]/90"
                pendingLabel="Enregistrement..."
              >
                Enregistrer le cours
              </SubmitButton>
            </div>
          </form>

          <div className="space-y-4 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Modules</h3>
                <p className="text-sm text-[var(--color-text-dark)]/60">Ajoutez les modules puis enrichissez-les avec des chapitres.</p>
              </div>
            </div>

            <form action={createModuleAction} className="grid gap-3 rounded-2xl border border-[var(--color-text-dark)]/10 bg-[var(--color-surface-high)] p-4 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="courseId" value={course.id} />
              <input
                name="title"
                required
                placeholder="Titre du module"
                className="h-11 rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-3 text-sm text-[var(--color-text-dark)] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
              <input
                name="description"
                placeholder="Description du module"
                className="h-11 rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-3 text-sm text-[var(--color-text-dark)] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
              <SubmitButton
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-bright)] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[var(--color-primary-bright)]/90"
                pendingLabel="Ajout..."
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </SubmitButton>
            </form>

            <div className="space-y-4">
              {course.modules.length ? (
                course.modules.map((module) => (
                  <div key={module.id} className="rounded-2xl border border-[var(--color-text-dark)]/10 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <form action={updateModuleAction} className="flex-1 space-y-3">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="moduleId" value={module.id} />
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                          <input
                            name="title"
                            required
                            defaultValue={module.title}
                            className="h-11 rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-3 text-sm text-[var(--color-text-dark)] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                          />
                          <input
                            name="description"
                            defaultValue={module.description ?? ""}
                            className="h-11 rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-3 text-sm text-[var(--color-text-dark)] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                          />
                          <SubmitButton
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-bright)]/5"
                            pendingLabel="Enregistrement..."
                          >
                            Enregistrer
                          </SubmitButton>
                        </div>
                      </form>

                      <div className="flex flex-wrap gap-2">
                        <form action={moveModuleAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="moduleId" value={module.id} />
                          <input type="hidden" name="direction" value="up" />
                          <SubmitButton
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white p-2 text-[var(--color-text-dark)] hover:bg-[var(--color-primary-bright)]/5"
                            showSpinner={false}
                            pendingChildren={<span className="text-xs font-semibold">...</span>}
                            aria-label="Monter le module"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </SubmitButton>
                        </form>
                        <form action={moveModuleAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="moduleId" value={module.id} />
                          <input type="hidden" name="direction" value="down" />
                          <SubmitButton
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white p-2 text-[var(--color-text-dark)] hover:bg-[var(--color-primary-bright)]/5"
                            showSpinner={false}
                            pendingChildren={<span className="text-xs font-semibold">...</span>}
                            aria-label="Descendre le module"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </SubmitButton>
                        </form>
                        <form action={deleteModuleAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="moduleId" value={module.id} />
                          <ConfirmSubmitButton
                            triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                            triggerChildren={<Trash2 className="h-4 w-4" />}
                            title="Supprimer ce module ?"
                            description="Le module et tous ses chapitres seront supprimés."
                            confirmLabel="Supprimer le module"
                            pendingLabel="Suppression..."
                            ariaLabel="Supprimer le module"
                            confirmClassName="danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
                          />
                        </form>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 rounded-2xl bg-[var(--color-surface-high)] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-[var(--color-text-dark)]">Chapitres</h4>
                          <p className="text-xs text-[var(--color-text-dark)]/60">Ordre du module : {module.order}</p>
                        </div>
                        <form action={createChapterAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="moduleId" value={module.id} />
                          <SubmitButton
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-bright)] px-3 py-2 text-sm font-semibold !text-white transition hover:bg-[var(--color-primary-bright)]/90"
                            pendingLabel="Création..."
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Nouveau chapitre
                          </SubmitButton>
                        </form>
                      </div>

                      {module.chapters.length ? (
                        <div className="space-y-2">
                          {module.chapters.map((chapter) => (
                            <div
                              key={chapter.id}
                              className="flex flex-col gap-3 rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-medium text-[var(--color-text-dark)]">{chapter.order}. {chapter.title}</p>
                                <p className="text-xs text-[var(--color-text-dark)]/60">
                                  {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min` : "Durée non renseignée"}
                                  {chapter.videoType !== "NONE" ? " • Vidéo intégrée" : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <form action={moveChapterAction}>
                                  <input type="hidden" name="courseId" value={course.id} />
                                  <input type="hidden" name="moduleId" value={module.id} />
                                  <input type="hidden" name="chapterId" value={chapter.id} />
                                  <input type="hidden" name="direction" value="up" />
                                  <SubmitButton
                                    className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white p-2 text-[var(--color-text-dark)] hover:bg-[var(--color-primary-bright)]/5"
                                    showSpinner={false}
                                    pendingChildren={<span className="text-xs font-semibold">...</span>}
                                    aria-label="Monter le chapitre"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </SubmitButton>
                                </form>
                                <form action={moveChapterAction}>
                                  <input type="hidden" name="courseId" value={course.id} />
                                  <input type="hidden" name="moduleId" value={module.id} />
                                  <input type="hidden" name="chapterId" value={chapter.id} />
                                  <input type="hidden" name="direction" value="down" />
                                  <SubmitButton
                                    className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white p-2 text-[var(--color-text-dark)] hover:bg-[var(--color-primary-bright)]/5"
                                    showSpinner={false}
                                    pendingChildren={<span className="text-xs font-semibold">...</span>}
                                    aria-label="Descendre le chapitre"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </SubmitButton>
                                </form>
                                <Link
                                  href={`/trainer/courses/${course.id}/chapters/${chapter.id}/edit`}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-bright)]/5"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Éditer
                                </Link>
                                <form action={deleteChapterAction}>
                                  <input type="hidden" name="courseId" value={course.id} />
                                  <input type="hidden" name="moduleId" value={module.id} />
                                  <input type="hidden" name="chapterId" value={chapter.id} />
                                  <ConfirmSubmitButton
                                    triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                                    triggerChildren={<Trash2 className="h-4 w-4" />}
                                    title="Supprimer ce chapitre ?"
                                    description="Le chapitre sera supprimé définitivement."
                                    confirmLabel="Supprimer le chapitre"
                                    pendingLabel="Suppression..."
                                    ariaLabel="Supprimer le chapitre"
                                    confirmClassName="danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
                                  />
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--color-text-dark)]/60">Aucun chapitre dans ce module pour le moment.</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-text-dark)]/60">Ajoutez votre premier module pour commencer la structure du cours.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Vue apprenant</h3>
            <p className="mt-2 text-sm text-[var(--color-text-dark)]/70">
              Vérifiez rapidement comment le cours sera présenté côté catalogue.
            </p>
            <div className="mt-4 space-y-2 text-sm text-[var(--color-text-dark)]/70">
              <p><span className="font-semibold text-[var(--color-text-dark)]">Slug public :</span> /courses/{course.slug}</p>
              <p><span className="font-semibold text-[var(--color-text-dark)]">Catégorie :</span> {course.category?.name ?? "Sans catégorie"}</p>
              <p><span className="font-semibold text-[var(--color-text-dark)]">Modules :</span> {course.modules.length}</p>
              <p>
                <span className="font-semibold text-[var(--color-text-dark)]">Chapitres :</span>{" "}
                {course.modules.reduce((total, module) => total + module.chapters.length, 0)}
              </p>
            </div>
            <div className="mt-5">
              <Link
                href={`/courses/${course.slug}`}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-bright)]/5"
              >
                Ouvrir la fiche apprenant
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
