import { ChapterProgressStatus, CourseStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { markChapterCompletedAction } from "@/actions/quiz";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { ChapterProgressTracker } from "@/components/course/chapter-progress-tracker";
import { ProgressBar } from "@/components/course/progress-bar";
import { RichContentRenderer } from "@/components/course/rich-content-renderer";
import { VideoEmbed } from "@/components/course/video-embed";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type LearnChapterPageProps = {
  params: Promise<{ slug: string; chapterId: string }>;
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function LearnChapterPage({ params, searchParams }: LearnChapterPageProps) {
  const [{ slug, chapterId }, feedback, session] = await Promise.all([params, searchParams, auth()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const course = await db.course.findFirst({
    where: {
      slug,
      status: CourseStatus.PUBLISHED,
    },
    select: {
      title: true,
      slug: true,
      enrollments: {
        where: { userId: session.user.id },
        select: {
          progressPercent: true,
        },
      },
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
              estimatedMinutes: true,
              quiz: {
                select: { id: true },
              },
              chapterProgresses: {
                where: { userId: session.user.id },
                select: {
                  status: true,
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

  const previousChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;
  const completedChapters = chapterList.filter(
    (chapter) => chapter.chapterProgresses?.[0]?.status === ChapterProgressStatus.COMPLETED,
  ).length;
  const progressPercent = course.enrollments[0]?.progressPercent ?? (chapterList.length ? Math.round((completedChapters / chapterList.length) * 100) : 0);

  const chapter = await db.chapter.findFirst({
    where: {
      id: chapterId,
      module: {
        course: {
          slug,
          status: CourseStatus.PUBLISHED,
        },
      },
    },
    select: {
      id: true,
      title: true,
      content: true,
      videoUrl: true,
      estimatedMinutes: true,
      module: {
        select: {
          title: true,
        },
      },
      chapterProgresses: {
        where: { userId: session.user.id },
        select: {
          status: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          xpReward: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              questionText: true,
              type: true,
              order: true,
              options: {
                orderBy: { optionText: "asc" },
                select: {
                  id: true,
                  optionText: true,
                  isCorrect: true,
                },
              },
            },
          },
          attempts: {
            where: { userId: session.user.id },
            orderBy: { attemptedAt: "desc" },
            take: 1,
            select: {
              score: true,
              passed: true,
              attemptedAt: true,
            },
          },
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const chapterStatus = chapter.chapterProgresses[0]?.status ?? ChapterProgressStatus.NOT_STARTED;
  const quizAttempt = chapter.quiz?.attempts[0] ?? null;
  const quizPlayable = Boolean(
    chapter.quiz &&
      chapter.quiz.questions.length &&
      chapter.quiz.questions.every(
        (question) => question.options.length && question.options.some((option) => option.isCorrect),
      ),
  );
  const quizForPlayer = chapter.quiz
    ? {
        ...chapter.quiz,
        questions: chapter.quiz.questions.map((question) => ({
          ...question,
          options: question.options.map(({ id, optionText }) => ({
            id,
            optionText,
          })),
        })),
      }
    : null;

  return (
    <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <ChapterProgressTracker chapterId={chapter.id} enabled={chapterStatus !== ChapterProgressStatus.COMPLETED} />

      <aside className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-white p-4 shadow-sm">
        <Link href={`/courses/${course.slug}`} className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à la fiche du cours
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-[#0c0910]">{course.title}</h2>
          <p className="text-sm text-[#0c0910]/60">{chapterList.length} chapitres</p>
        </div>

        <ProgressBar value={progressPercent} label="Progression du cours" />

        <div className="space-y-2">
          {chapterList.map((item, index) => {
            const isActive = item.id === chapter.id;
            const itemStatus = item.chapterProgresses?.[0]?.status ?? ChapterProgressStatus.NOT_STARTED;

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
                <p className="mt-1 text-[11px] font-semibold opacity-80">
                  {itemStatus === ChapterProgressStatus.COMPLETED
                    ? "Terminé"
                    : itemStatus === ChapterProgressStatus.IN_PROGRESS
                      ? "En cours"
                      : item.quiz
                        ? "À lire + quiz"
                        : "À lire"}
                </p>
              </Link>
            );
          })}
        </div>
      </aside>

      <article className="space-y-6 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#453750]">{chapter.module.title}</p>
          <h1 className="text-3xl font-bold text-[#0c0910]">{chapter.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#0c0910]/60">
            <p>
            {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min estimées` : "Durée non renseignée"}
            </p>
            <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
              {chapterStatus === ChapterProgressStatus.COMPLETED
                ? "Chapitre terminé"
                : chapterStatus === ChapterProgressStatus.IN_PROGRESS
                  ? "Chapitre en cours"
                  : "Chapitre à commencer"}
            </span>
          </div>
        </header>

        <FormFeedback type={feedback.type} message={feedback.message} />

        <VideoEmbed url={chapter.videoUrl} title={chapter.title} />
        <RichContentRenderer content={chapter.content} />

        {chapter.quiz ? (
          <section className="space-y-4 rounded-2xl border border-[#0c0910]/10 bg-white p-5">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[#0c0910]">Quiz du chapitre</h2>
              <p className="text-sm text-[#0c0910]/65">
                La réussite du quiz est nécessaire pour marquer ce chapitre comme terminé.
              </p>
            </div>

            {quizAttempt ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  quizAttempt.passed
                    ? "border-[#119da4]/20 bg-[#119da4]/10 text-[#0c0910]"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                Dernière tentative : {quizAttempt.score}% {quizAttempt.passed ? "• Quiz réussi" : "• Quiz non réussi"}
              </div>
            ) : null}

            {quizPlayable ? (
              <QuizPlayer
                quiz={quizForPlayer!}
                chapterId={chapter.id}
                courseSlug={course.slug}
                hasAttempt={Boolean(quizAttempt)}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] px-4 py-4 text-sm text-[#0c0910]/65">
                Ce quiz n’est pas encore entièrement configuré par le formateur.
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-white p-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[#0c0910]">Compléter ce chapitre</h2>
              <p className="text-sm text-[#0c0910]/65">
                Ce chapitre ne contient pas de quiz. Vous pouvez le marquer comme terminé une fois la lecture terminée.
              </p>
            </div>

            {chapterStatus === ChapterProgressStatus.COMPLETED ? (
              <div className="rounded-2xl border border-[#119da4]/20 bg-[#119da4]/10 px-4 py-3 text-sm text-[#0c0910]">
                Ce chapitre est déjà terminé.
              </div>
            ) : (
              <form action={markChapterCompletedAction}>
                <input type="hidden" name="chapterId" value={chapter.id} />
                <input type="hidden" name="courseSlug" value={course.slug} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[#119da4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#119da4]/90"
                >
                  Marquer comme terminé
                </button>
              </form>
            )}
          </section>
        )}

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
