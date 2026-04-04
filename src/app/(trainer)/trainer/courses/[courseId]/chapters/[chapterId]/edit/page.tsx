import Link from "next/link";
import { QuizQuestionType } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { updateChapterAction } from "@/actions/courses";
import { ChapterEditorForm } from "@/components/editor/chapter-editor-form";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { QuizManager } from "@/components/quiz/quiz-manager";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

type EditChapterPageProps = {
  params: Promise<{ courseId: string; chapterId: string }>;
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function EditChapterPage({ params, searchParams }: EditChapterPageProps) {
  const [{ courseId, chapterId }, feedback, session] = await Promise.all([params, searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      content: true,
      videoUrl: true,
      estimatedMinutes: true,
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
        },
      },
      module: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              id: true,
              title: true,
              trainerId: true,
            },
          },
        },
      },
    },
  });

  if (!chapter || chapter.module.course.id !== courseId) {
    notFound();
  }

  if (session.user.role !== "ADMIN" && chapter.module.course.trainerId !== session.user.id) {
    redirect("/trainer/courses");
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Link
          href={`/trainer/courses/${courseId}/edit`}
          className="text-sm font-medium text-[#0F63FF] hover:underline"
        >
          ← Retour à l’édition du cours
        </Link>
        <h2 className="text-2xl font-bold text-[#0c0910]">{chapter.title}</h2>
        <p className="text-sm text-[#0c0910]/70">
          Cours : {chapter.module.course.title} • Module : {chapter.module.title}
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <ChapterEditorForm
          action={updateChapterAction}
          courseId={courseId}
          moduleId={chapter.module.id}
          chapterId={chapter.id}
          title={chapter.title}
          content={chapter.content}
          videoUrl={chapter.videoUrl}
          estimatedMinutes={chapter.estimatedMinutes}
        />
      </div>

      <QuizManager
        courseId={courseId}
        chapterId={chapter.id}
        quiz={
          chapter.quiz
            ? {
                id: chapter.quiz.id,
                title: chapter.quiz.title,
                passingScore: chapter.quiz.passingScore,
                xpReward: chapter.quiz.xpReward,
                questions: chapter.quiz.questions.map((question) => ({
                  id: question.id,
                  questionText: question.questionText,
                  type: question.type as QuizQuestionType,
                  order: question.order,
                  options: question.options,
                })),
              }
            : null
        }
      />
    </section>
  );
}
