import { CourseStatus, ChapterProgressStatus } from "@prisma/client";
import { Clock3, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const [{ slug }, session] = await Promise.all([params, auth()]);

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
  const progressPercent = flatChapters.length
    ? Math.round((completedChapters / flatChapters.length) * 100)
    : 0;
  const firstChapter = flatChapters[0];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {course.category?.name ? (
                <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                  {course.category.name}
                </span>
              ) : null}
              <span className="rounded-full bg-[#119da4]/10 px-2.5 py-1 text-xs font-semibold text-[#119da4]">
                {progressPercent}% terminé
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[#0c0910]">{course.title}</h1>
            <p className="max-w-3xl text-sm text-[#0c0910]/70">
              {course.description?.trim() || "Aucune description n’a encore été rédigée pour ce cours."}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-[#0c0910]/70">
              <span>Formateur : {course.trainer.name}</span>
              {course.estimatedHours ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {course.estimatedHours} h estimées
                </span>
              ) : null}
              <span>{flatChapters.length} chapitre{flatChapters.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          {firstChapter ? (
            <Link
              href={`/courses/${course.slug}/learn/${firstChapter.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Commencer le cours
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {course.modules.map((module) => (
          <article key={module.id} className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#453750]">Module {module.order}</p>
              <h2 className="text-xl font-semibold text-[#0c0910]">{module.title}</h2>
              {module.description ? <p className="text-sm text-[#0c0910]/70">{module.description}</p> : null}
            </div>

            <div className="mt-4 space-y-2">
              {module.chapters.map((chapter, index) => {
                const status = chapter.chapterProgresses?.[0]?.status;

                return (
                  <Link
                    key={chapter.id}
                    href={`/courses/${course.slug}/learn/${chapter.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-[#0c0910]/10 px-4 py-3 transition hover:border-[#0F63FF]/30 hover:bg-[#0F63FF]/5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[#0c0910]">
                        {index + 1}. {chapter.title}
                      </p>
                      <p className="text-xs text-[#0c0910]/60">
                        {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min` : "Durée non renseignée"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0F63FF]">
                      {status === ChapterProgressStatus.COMPLETED ? "Terminé" : "Lire le chapitre"}
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

