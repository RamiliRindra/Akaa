import { Clock3, PlayCircle, SquarePen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CourseStatusBadge } from "@/components/course/course-status-badge";
import { auth } from "@/lib/auth";
import { courseLevelBadgeStyles, getCourseLevelLabel } from "@/lib/course-level";
import { db } from "@/lib/db";

type AdminCourseDetailPageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function AdminCourseDetailPage({ params }: AdminCourseDetailPageProps) {
  const [{ courseId }, session] = await Promise.all([params, auth()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
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
      status: true,
      level: true,
      trainer: {
        select: {
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          name: true,
        },
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
              quiz: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const chapterCount = course.modules.reduce((total, module) => total + module.chapters.length, 0);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/courses" className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à la supervision des cours
        </Link>
        <h2 className="text-2xl font-bold text-[#0c0910]">Vue admin du cours</h2>
        <p className="text-sm text-[#0c0910]/70">
          Consultation en lecture depuis l’espace admin. Vous pouvez ensuite ouvrir l’édition formateur si nécessaire.
        </p>
      </div>

      <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {course.category?.name ? (
                <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                  {course.category.name}
                </span>
              ) : null}
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${courseLevelBadgeStyles[course.level]}`}>
                {getCourseLevelLabel(course.level)}
              </span>
              <CourseStatusBadge status={course.status} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-[#0c0910]">{course.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#0c0910]/70">
                {course.description?.trim() || "Aucune description n’a encore été renseignée pour ce cours."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-[#0c0910]/70">
              <span>Formateur : {course.trainer.name}</span>
              <span>{course.trainer.email}</span>
              {course.estimatedHours ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {course.estimatedHours} h estimées
                </span>
              ) : null}
              <span>{course.modules.length} module{course.modules.length > 1 ? "s" : ""}</span>
              <span>{chapterCount} chapitre{chapterCount > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href={`/admin/courses`}
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              Voir tous les cours
            </Link>
            <Link
              href={`/courses/${course.slug}`}
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Prévisualiser côté plateforme
            </Link>
            <Link
              href={`/trainer/courses/${course.id}/edit`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
            >
              <SquarePen className="mr-2 h-4 w-4" />
              Ouvrir l’édition
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <article key={module.id} className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#453750]">Module {module.order}</p>
              <h3 className="text-xl font-semibold text-[#0c0910]">{module.title}</h3>
              {module.description ? <p className="text-sm text-[#0c0910]/70">{module.description}</p> : null}
            </div>

            <div className="mt-4 space-y-2">
              {module.chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#0c0910]/10 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-[#0c0910]">
                      {index + 1}. {chapter.title}
                    </p>
                    <p className="text-xs text-[#0c0910]/60">
                      {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min` : "Durée non renseignée"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-[#0c0910]/5 px-2.5 py-1 text-[#0c0910]/70">
                      {chapter.videoType === "NONE" ? "Sans vidéo" : chapter.videoType}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        chapter.quiz ? "bg-[#453750]/10 text-[#453750]" : "bg-[#119da4]/10 text-[#119da4]"
                      }`}
                    >
                      {chapter.quiz ? "Quiz inclus" : "Lecture seule"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
