import { ChapterProgressStatus, CourseStatus } from "@prisma/client";
import { ArrowRight, BookOpenCheck, Clock3, Layers3, PlayCircle, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressBar } from "@/components/course/progress-bar";
import { getCachedSession } from "@/lib/auth-session";
import { courseLevelBadgeStyles, getCourseLevelLabel } from "@/lib/course-level";
import { db } from "@/lib/db";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const [{ slug }, session] = await Promise.all([params, getCachedSession()]);

  const course = await db.course.findFirst({
    where: {
      slug,
      status: CourseStatus.PUBLISHED,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      estimatedHours: true,
      level: true,
      trainer: {
        select: {
          name: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      enrollments: session?.user?.id
        ? {
            where: { userId: session.user.id },
            select: {
              progressPercent: true,
            },
          }
        : false,
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
              quiz: {
                select: { id: true },
              },
              chapterProgresses: session?.user?.id
                ? {
                    where: { userId: session.user.id },
                    select: { status: true },
                  }
                : false,
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const flatChapters = course.modules.flatMap((module) => module.chapters);
  const completedChapters = flatChapters.filter(
    (chapter) => chapter.chapterProgresses?.[0]?.status === ChapterProgressStatus.COMPLETED,
  ).length;
  const progressPercent =
    course.enrollments[0]?.progressPercent ??
    (flatChapters.length ? Math.round((completedChapters / flatChapters.length) * 100) : 0);
  const firstChapter = flatChapters[0];
  const nextChapter =
    flatChapters.find((chapter) => chapter.chapterProgresses?.[0]?.status !== ChapterProgressStatus.COMPLETED) ??
    firstChapter;
  const moduleCount = course.modules.length;

  return (
    <section className="space-y-8">
      <div className="surface-section overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_340px] xl:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Formation publiée
              </span>
              {course.category?.name ? <span className="chip chip-primary">{course.category.name}</span> : null}
              <span className={`chip ${courseLevelBadgeStyles[course.level]}`}>
                {getCourseLevelLabel(course.level)}
              </span>
              <span className="chip chip-success">{progressPercent}% terminé</span>
            </div>

            <div className="space-y-3">
              <p className="editorial-eyebrow">Course Overview</p>
              <h1 className="font-display text-3xl font-black tracking-tight text-[#2c2f31] sm:text-5xl">
                {course.title}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[#2c2f31]/72 sm:text-base">
                {course.description?.trim() || "Aucune description n’a encore été rédigée pour ce cours."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-[#2c2f31]/70">
              <span>Formateur : {course.trainer.name}</span>
              {course.estimatedHours ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {course.estimatedHours} h estimées
                </span>
              ) : null}
              <span>{moduleCount} module{moduleCount > 1 ? "s" : ""}</span>
              <span>{flatChapters.length} chapitre{flatChapters.length > 1 ? "s" : ""}</span>
            </div>

            <ProgressBar value={progressPercent} label="Progression du cours" />
          </div>

          <aside className="glass-panel ambient-ring space-y-4 p-6">
            <div>
              <p className="editorial-eyebrow">Course Snapshot</p>
              <h2 className="font-display mt-2 text-2xl font-black text-[#2c2f31]">Prêt à reprendre ?</h2>
            </div>

            <div className="grid gap-3">
              <div className="panel-card flex items-center gap-3 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#119da4]/12 text-[#119da4]">
                  <BookOpenCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2c2f31]">
                    {completedChapters}/{flatChapters.length} chapitres
                  </p>
                  <p className="text-xs text-[#2c2f31]/62">Validés sur ce parcours.</p>
                </div>
              </div>

              <div className="panel-card flex items-center gap-3 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#655670]/12 text-[#655670]">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2c2f31]">
                    {moduleCount} module{moduleCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[#2c2f31]/62">Structure complète du cours.</p>
                </div>
              </div>

              <div className="panel-card flex items-center gap-3 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ffc857]/24 text-[#775600]">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2c2f31]">
                    {nextChapter ? "Chapitre suivant prêt" : "Cours complété"}
                  </p>
                  <p className="text-xs text-[#2c2f31]/62">
                    {nextChapter ? "Votre prochain effort est déjà identifié." : "Tous les chapitres sont validés."}
                  </p>
                </div>
              </div>
            </div>

            {nextChapter ? (
              <Link
                href={`/courses/${course.slug}/learn/${nextChapter.id}`}
                className="cta-button w-full px-5 py-3 text-sm font-semibold"
              >
                <PlayCircle className="h-4 w-4" />
                {progressPercent > 0 ? "Reprendre le cours" : "Commencer le cours"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </aside>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="editorial-eyebrow">Learning Path</p>
          <h2 className="font-display text-2xl font-black text-[#2c2f31]">Parcours détaillé</h2>
        </div>

        {course.modules.map((module) => (
          <article key={module.id} className="panel-card p-5 sm:p-6">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Module {module.order}</p>
              <h2 className="font-display text-2xl font-black text-[#2c2f31]">{module.title}</h2>
              {module.description ? (
                <p className="text-sm leading-7 text-[#2c2f31]/70">{module.description}</p>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {module.chapters.map((chapter, index) => {
                const status = chapter.chapterProgresses?.[0]?.status;

                return (
                  <Link
                    key={chapter.id}
                    href={`/courses/${course.slug}/learn/${chapter.id}`}
                    className="flex flex-col gap-3 rounded-[1.6rem] bg-[var(--color-surface-high)] px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#2c2f31]">
                        {index + 1}. {chapter.title}
                      </p>
                      <p className="text-xs text-[#2c2f31]/60">
                        {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min` : "Durée non renseignée"}
                      </p>
                    </div>
                    <span className="chip chip-primary">
                      {status === ChapterProgressStatus.COMPLETED
                        ? "Terminé"
                        : status === ChapterProgressStatus.IN_PROGRESS
                          ? "Continuer"
                          : chapter.quiz
                            ? "Lire + quiz"
                            : "Lire le chapitre"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
