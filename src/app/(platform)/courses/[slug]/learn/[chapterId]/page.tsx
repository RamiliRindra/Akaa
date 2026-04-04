import { ChapterProgressStatus, CourseStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight, PlayCircle, Sparkles } from "lucide-react";
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
    <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <ChapterProgressTracker chapterId={chapter.id} enabled={chapterStatus !== ChapterProgressStatus.COMPLETED} />

      <aside className="surface-section space-y-4 p-4 sm:p-5">
        <Link href={`/courses/${course.slug}`} className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à la fiche du cours
        </Link>
        <div>
          <p className="editorial-eyebrow">Course Flow</p>
          <h2 className="font-display mt-2 text-2xl font-black text-[#2c2f31]">{course.title}</h2>
          <p className="text-sm text-[#2c2f31]/60">{chapterList.length} chapitres</p>
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
                className={`block rounded-[1.35rem] px-4 py-4 text-sm transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(0,80,214,0.13),rgba(15,99,255,0.08))] text-[#0050d6] ring-1 ring-[#0050d6]/14"
                    : "text-[#2c2f31]/75 ring-1 ring-[#2c2f31]/8 hover:bg-white hover:text-[#0050d6]"
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

      <article className="space-y-6">
        <header className="surface-section space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {chapter.module.title}
            </span>
            <span className="chip chip-success">
              {chapterStatus === ChapterProgressStatus.COMPLETED
                ? "Chapitre terminé"
                : chapterStatus === ChapterProgressStatus.IN_PROGRESS
                  ? "Chapitre en cours"
                  : "Chapitre à commencer"}
            </span>
          </div>

          <div className="space-y-2">
            <p className="editorial-eyebrow">Chapter Focus</p>
            <h1 className="font-display text-3xl font-black tracking-tight text-[#2c2f31] sm:text-5xl">
              {chapter.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#2c2f31]/60">
            <p>
              {chapter.estimatedMinutes ? `${chapter.estimatedMinutes} min estimées` : "Durée non renseignée"}
            </p>
          </div>
        </header>

        <FormFeedback type={feedback.type} message={feedback.message} />

        <VideoEmbed url={chapter.videoUrl} title={chapter.title} />
        <RichContentRenderer content={chapter.content} />

        {chapter.quiz ? (
          <section className="surface-section space-y-4 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Knowledge Check</p>
              <h2 className="font-display text-2xl font-black text-[#2c2f31]">Quiz du chapitre</h2>
              <p className="text-sm text-[#2c2f31]/65">
                La réussite du quiz est nécessaire pour marquer ce chapitre comme terminé.
              </p>
            </div>

            {quizAttempt ? (
              <div
                className={`rounded-[1.4rem] px-4 py-4 text-sm ${
                  quizAttempt.passed
                    ? "bg-[#119da4]/10 text-[#2c2f31] ring-1 ring-[#119da4]/20"
                    : "bg-red-50 text-red-700 ring-1 ring-red-200"
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
              <div className="rounded-[1.4rem] bg-[#f7f9ff] px-4 py-4 text-sm text-[#2c2f31]/65 ring-1 ring-dashed ring-[#2c2f31]/16">
                Ce quiz n’est pas encore entièrement configuré par le formateur.
              </div>
            )}
          </section>
        ) : (
          <section className="surface-section space-y-4 p-5 sm:p-6">
            <div className="space-y-1">
              <p className="editorial-eyebrow">Completion</p>
              <h2 className="font-display text-2xl font-black text-[#2c2f31]">Compléter ce chapitre</h2>
              <p className="text-sm text-[#2c2f31]/65">
                Ce chapitre ne contient pas de quiz. Vous pouvez le marquer comme terminé une fois la lecture terminée.
              </p>
            </div>

            {chapterStatus === ChapterProgressStatus.COMPLETED ? (
              <div className="rounded-[1.4rem] bg-[#119da4]/10 px-4 py-4 text-sm text-[#2c2f31] ring-1 ring-[#119da4]/20">
                Ce chapitre est déjà terminé.
              </div>
            ) : (
              <form action={markChapterCompletedAction}>
                <input type="hidden" name="chapterId" value={chapter.id} />
                <input type="hidden" name="courseSlug" value={course.slug} />
                <button
                  type="submit"
                  className="primary-button bg-[linear-gradient(135deg,#119da4,#0f8d94)] px-4 py-2 text-sm font-semibold"
                >
                  <PlayCircle className="h-4 w-4" />
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
              className="secondary-button px-4 py-2 text-sm font-semibold"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Chapitre précédent
            </Link>
          ) : <span />}

          {nextChapter ? (
            <Link
              href={`/courses/${course.slug}/learn/${nextChapter.id}`}
              className="primary-button px-4 py-2 text-sm font-semibold"
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
