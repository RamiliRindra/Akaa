import { CourseStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichContentRenderer } from "@/components/course/rich-content-renderer";
import { VideoEmbed } from "@/components/course/video-embed";
import { db } from "@/lib/db";

type LearnChapterPageProps = {
  params: Promise<{ slug: string; chapterId: string }>;
};

export default async function LearnChapterPage({ params }: LearnChapterPageProps) {
  const { slug, chapterId } = await params;

  const course = await db.course.findFirst({
    where: {
      slug,
      status: CourseStatus.PUBLISHED,
    },
    select: {
      title: true,
      slug: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          chapters: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              content: true,
              videoUrl: true,
              estimatedMinutes: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const chapterList = course.modules.flatMap((module) =>
    module.chapters.map((chapter) => ({
      ...chapter,
      moduleTitle: module.title,
    })),
  );

  const currentIndex = chapterList.findIndex((chapter) => chapter.id === chapterId);
  if (currentIndex < 0) {
    notFound();
  }

  const chapter = chapterList[currentIndex];
  const previousChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  return (
    <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-white p-4 shadow-sm">
        <Link href={`/courses/${course.slug}`} className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à la fiche du cours
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-[#0c0910]">{course.title}</h2>
          <p className="text-sm text-[#0c0910]/60">{chapterList.length} chapitres</p>
        </div>

        <div className="space-y-2">
          {chapterList.map((item, index) => {
            const isActive = item.id === chapter.id;

            return (
              <Link
                key={item.id}
                href={`/courses/${course.slug}/learn/${item.id}`}
                className={`block rounded-xl border px-3 py-3 text-sm transition ${
                  isActive
                    ? "border-[#0F63FF]/30 bg-[#0F63FF]/8 text-[#0F63FF]"
                    : "border-[#0c0910]/10 text-[#0c0910]/75 hover:border-[#0F63FF]/20 hover:bg-[#0F63FF]/5"
                }`}
              >
                <p className="font-medium">{index + 1}. {item.title}</p>
                <p className="mt-1 text-xs opacity-75">{item.moduleTitle}</p>
              </Link>
            );
          })}
        </div>
      </aside>

      <article className="space-y-6 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#453750]">{chapter.moduleTitle}</p>
          <h1 className="text-3xl font-bold text-[#0c0910]">{chapter.title}</h1>
          <p className="text-sm text-[#0c0910]/60">
            {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min estimées` : "Durée non renseignée"}
          </p>
        </header>

        <VideoEmbed url={chapter.videoUrl} title={chapter.title} />
        <RichContentRenderer content={chapter.content} />

        <div className="flex flex-col gap-3 border-t border-[#0c0910]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          {previousChapter ? (
            <Link
              href={`/courses/${course.slug}/learn/${previousChapter.id}`}
              className="inline-flex items-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Chapitre précédent
            </Link>
          ) : <span />}

          {nextChapter ? (
            <Link
              href={`/courses/${course.slug}/learn/${nextChapter.id}`}
              className="inline-flex items-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
            >
              Chapitre suivant
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </article>
    </section>
  );
}
