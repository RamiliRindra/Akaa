"use server";

import { ChapterProgressStatus, Prisma, QuizQuestionType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyLearningGamification } from "@/lib/gamification";
import {
  ensureEnrollment,
  markChapterCompleted,
  markChapterInProgress,
  recalculateEnrollmentProgress,
} from "@/lib/progress";
import {
  chapterProgressFormSchema,
  deleteQuizEntitySchema,
  moveQuizQuestionSchema,
  quizBuilderFormSchema,
  quizFormSchema,
  quizOptionFormSchema,
  quizQuestionFormSchema,
  quizSubmissionSchema,
} from "@/lib/validations/quiz";

type TrainerSession = {
  userId: string;
  role: UserRole;
};

export type QuizBuilderActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function buildRedirectUrl(path: string, type: "success" | "error", message: string) {
  const url = new URL(path, "https://akaa.local");
  url.searchParams.set("type", type);
  url.searchParams.set("message", message);
  return `${url.pathname}${url.search}`;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Une erreur est survenue pendant l’enregistrement du quiz.";
}

async function requireTrainerSession(): Promise<TrainerSession> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return {
    userId: session.user.id,
    role: session.user.role,
  };
}

async function requireLearnerSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

async function assertChapterManagementAccess(chapterId: string, courseId: string, session: TrainerSession) {
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      module: {
        select: {
          id: true,
          course: {
            select: {
              id: true,
              slug: true,
              trainerId: true,
            },
          },
        },
      },
      quiz: {
        select: { id: true },
      },
    },
  });

  if (!chapter || chapter.module.course.id !== courseId) {
    throw new Error("Chapitre introuvable.");
  }

  if (session.role !== "ADMIN" && chapter.module.course.trainerId !== session.userId) {
    throw new Error("Vous n’avez pas accès à ce chapitre.");
  }

  return chapter;
}

async function assertQuizQuestionAccess(questionId: string, courseId: string, session: TrainerSession) {
  const question = await db.quizQuestion.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      quiz: {
        select: {
          id: true,
          chapter: {
            select: {
              id: true,
              module: {
                select: {
                  course: {
                    select: {
                      id: true,
                      slug: true,
                      trainerId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!question || question.quiz.chapter.module.course.id !== courseId) {
    throw new Error("Question introuvable.");
  }

  if (session.role !== "ADMIN" && question.quiz.chapter.module.course.trainerId !== session.userId) {
    throw new Error("Vous n’avez pas accès à cette question.");
  }

  return question;
}

async function assertQuizOptionAccess(optionId: string, courseId: string, session: TrainerSession) {
  const option = await db.quizOption.findUnique({
    where: { id: optionId },
    select: {
      id: true,
      question: {
        select: {
          id: true,
          quiz: {
            select: {
              id: true,
              chapter: {
                select: {
                  id: true,
                  module: {
                    select: {
                      course: {
                        select: {
                          id: true,
                          slug: true,
                          trainerId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!option || option.question.quiz.chapter.module.course.id !== courseId) {
    throw new Error("Réponse introuvable.");
  }

  if (session.role !== "ADMIN" && option.question.quiz.chapter.module.course.trainerId !== session.userId) {
    throw new Error("Vous n’avez pas accès à cette réponse.");
  }

  return option;
}

async function normalizeQuestionOrder(tx: Prisma.TransactionClient, quizId: string) {
  const questions = await tx.quizQuestion.findMany({
    where: { quizId },
    orderBy: [{ order: "asc" }, { questionText: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    questions.map((question, index) =>
      tx.quizQuestion.update({
        where: { id: question.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

async function normalizeSingleChoiceCorrectAnswers(tx: Prisma.TransactionClient, questionId: string, preferredOptionId?: string) {
  const options = await tx.quizOption.findMany({
    where: { questionId },
    orderBy: { optionText: "asc" },
    select: { id: true, isCorrect: true },
  });

  const correctOptionId =
    preferredOptionId && options.some((option) => option.id === preferredOptionId)
      ? preferredOptionId
      : options.find((option) => option.isCorrect)?.id;

  await Promise.all(
    options.map((option) =>
      tx.quizOption.update({
        where: { id: option.id },
        data: { isCorrect: option.id === correctOptionId },
      }),
    ),
  );
}

function revalidateQuizSurfaces(courseId: string, chapterId: string, courseSlug?: string) {
  revalidatePath(`/trainer/courses/${courseId}/chapters/${chapterId}/edit`);
  revalidatePath(`/trainer/courses/${courseId}/edit`);

  if (courseSlug) {
    revalidatePath("/courses");
    revalidatePath(`/courses/${courseSlug}`);
    revalidatePath(`/courses/${courseSlug}/learn/${chapterId}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}

function getQuestionAnswerSet(answers: Record<string, string[]>, questionId: string) {
  return new Set((answers[questionId] ?? []).filter(Boolean));
}

async function getNextChapterPath(courseId: string, currentChapterId: string, courseSlug: string) {
  const modules = await db.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: {
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
        },
      },
    },
  });

  const chapterIds = modules.flatMap((module) => module.chapters.map((chapter) => chapter.id));
  const currentIndex = chapterIds.findIndex((chapterId) => chapterId === currentChapterId);
  const nextChapterId = currentIndex >= 0 ? chapterIds[currentIndex + 1] : undefined;

  return nextChapterId ? `/courses/${courseSlug}/learn/${nextChapterId}` : `/courses/${courseSlug}`;
}

export async function saveQuizBuilderAction(
  _previousState: QuizBuilderActionState,
  formData: FormData,
): Promise<QuizBuilderActionState> {
  try {
    const session = await requireTrainerSession();
    const parsed = quizBuilderFormSchema.safeParse({
      courseId: getString(formData, "courseId"),
      chapterId: getString(formData, "chapterId"),
      payload: getString(formData, "payload"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Quiz invalide.",
      };
    }

    const chapter = await assertChapterManagementAccess(parsed.data.chapterId, parsed.data.courseId, session);
    const payload = parsed.data.payload;

    if (!payload.enabled) {
      if (chapter.quiz?.id) {
        await db.quiz.delete({
          where: { id: chapter.quiz.id },
        });
      }

      revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);
      return {
        status: "success",
        message: chapter.quiz?.id ? "Quiz supprimé." : "Aucun quiz à enregistrer.",
      };
    }

    await db.$transaction(async (tx) => {
      const quiz = chapter.quiz?.id
        ? await tx.quiz.update({
            where: { id: chapter.quiz.id },
            data: {
              title: payload.title!,
              passingScore: payload.passingScore!,
              xpReward: payload.xpReward!,
            },
            select: { id: true },
          })
        : await tx.quiz.create({
            data: {
              chapterId: parsed.data.chapterId,
              title: payload.title!,
              passingScore: payload.passingScore!,
              xpReward: payload.xpReward!,
            },
            select: { id: true },
          });

      await tx.quizOption.deleteMany({
        where: {
          question: {
            quizId: quiz.id,
          },
        },
      });
      await tx.quizQuestion.deleteMany({
        where: {
          quizId: quiz.id,
        },
      });

      for (const [questionIndex, question] of payload.questions!.entries()) {
        const createdQuestion = await tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            questionText: question.questionText,
            type: question.type,
            order: questionIndex + 1,
          },
          select: { id: true },
        });

        for (const option of question.options) {
          await tx.quizOption.create({
            data: {
              questionId: createdQuestion.id,
              optionText: option.optionText,
              isCorrect: option.isCorrect,
            },
          });
        }
      }
    });

    revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);

    return {
      status: "success",
      message: "Quiz enregistré.",
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
    };
  }
}

export async function createQuizAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = quizFormSchema.safeParse({
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    title: getString(formData, "title"),
    passingScore: getString(formData, "passingScore"),
    xpReward: getString(formData, "xpReward"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Quiz invalide."));
  }

  const chapter = await assertChapterManagementAccess(parsed.data.chapterId, parsed.data.courseId, session);
  if (chapter.quiz) {
    redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "error", "Ce chapitre possède déjà un quiz."));
  }

  await db.quiz.create({
    data: {
      chapterId: parsed.data.chapterId,
      title: parsed.data.title,
      passingScore: parsed.data.passingScore,
      xpReward: parsed.data.xpReward,
    },
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Quiz créé."));
}

export async function updateQuizAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = quizFormSchema.safeParse({
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    title: getString(formData, "title"),
    passingScore: getString(formData, "passingScore"),
    xpReward: getString(formData, "xpReward"),
  });

  if (!parsed.success || !parsed.data.quizId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Quiz invalide."));
  }

  const chapter = await assertChapterManagementAccess(parsed.data.chapterId, parsed.data.courseId, session);

  await db.quiz.update({
    where: { id: parsed.data.quizId },
    data: {
      title: parsed.data.title,
      passingScore: parsed.data.passingScore,
      xpReward: parsed.data.xpReward,
    },
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Quiz mis à jour."));
}

export async function deleteQuizAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = deleteQuizEntitySchema.safeParse({
    id: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Quiz invalide."));
  }

  const chapter = await assertChapterManagementAccess(parsed.data.chapterId, parsed.data.courseId, session);
  await db.quiz.delete({ where: { id: parsed.data.id } });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Quiz supprimé."));
}

export async function createQuizQuestionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = quizQuestionFormSchema.safeParse({
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    questionText: getString(formData, "questionText"),
    type: getString(formData, "type"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Question invalide."));
  }

  const chapter = await assertChapterManagementAccess(parsed.data.chapterId, parsed.data.courseId, session);

  const lastQuestion = await db.quizQuestion.findFirst({
    where: { quizId: parsed.data.quizId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.quizQuestion.create({
    data: {
      quizId: parsed.data.quizId,
      questionText: parsed.data.questionText,
      type: parsed.data.type,
      order: (lastQuestion?.order ?? 0) + 1,
    },
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Question ajoutée."));
}

export async function updateQuizQuestionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = quizQuestionFormSchema.safeParse({
    questionId: getString(formData, "questionId"),
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    questionText: getString(formData, "questionText"),
    type: getString(formData, "type"),
  });

  if (!parsed.success || !parsed.data.questionId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Question invalide."));
  }

  const question = await assertQuizQuestionAccess(parsed.data.questionId, parsed.data.courseId, session);

  await db.$transaction(async (tx) => {
    await tx.quizQuestion.update({
      where: { id: parsed.data.questionId! },
      data: {
        questionText: parsed.data.questionText,
        type: parsed.data.type,
      },
    });

    if (parsed.data.type === QuizQuestionType.SINGLE) {
      await normalizeSingleChoiceCorrectAnswers(tx, parsed.data.questionId!);
    }
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, question.quiz.chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Question mise à jour."));
}

export async function moveQuizQuestionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = moveQuizQuestionSchema.safeParse({
    questionId: getString(formData, "questionId"),
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    direction: getString(formData, "direction"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Déplacement invalide."));
  }

  const chapter = await assertChapterManagementAccess(parsed.data.chapterId, parsed.data.courseId, session);

  await db.$transaction(async (tx) => {
    const questions = await tx.quizQuestion.findMany({
      where: { quizId: parsed.data.quizId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const index = questions.findIndex((question) => question.id === parsed.data.questionId);
    const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;

    if (index < 0 || swapIndex < 0 || swapIndex >= questions.length) {
      return;
    }

    const source = questions[index];
    const target = questions[swapIndex];
    const [sourceRecord, targetRecord] = await Promise.all([
      tx.quizQuestion.findUniqueOrThrow({ where: { id: source.id }, select: { order: true } }),
      tx.quizQuestion.findUniqueOrThrow({ where: { id: target.id }, select: { order: true } }),
    ]);

    await tx.quizQuestion.update({ where: { id: source.id }, data: { order: targetRecord.order } });
    await tx.quizQuestion.update({ where: { id: target.id }, data: { order: sourceRecord.order } });
    await normalizeQuestionOrder(tx, parsed.data.quizId);
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Ordre des questions mis à jour."));
}

export async function deleteQuizQuestionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = deleteQuizEntitySchema.safeParse({
    id: getString(formData, "questionId"),
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
  });

  if (!parsed.success || !parsed.data.quizId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Question invalide."));
  }

  const question = await assertQuizQuestionAccess(parsed.data.id, parsed.data.courseId, session);

  await db.$transaction(async (tx) => {
    await tx.quizQuestion.delete({ where: { id: parsed.data.id } });
    await normalizeQuestionOrder(tx, parsed.data.quizId!);
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, question.quiz.chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Question supprimée."));
}

export async function createQuizOptionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = quizOptionFormSchema.safeParse({
    questionId: getString(formData, "questionId"),
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    optionText: getString(formData, "optionText"),
    isCorrect: getBoolean(formData, "isCorrect"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Réponse invalide."));
  }

  const question = await assertQuizQuestionAccess(parsed.data.questionId, parsed.data.courseId, session);
  const questionType = await db.quizQuestion.findUnique({
    where: { id: parsed.data.questionId },
    select: { type: true },
  });

  await db.$transaction(async (tx) => {
    const option = await tx.quizOption.create({
      data: {
        questionId: parsed.data.questionId,
        optionText: parsed.data.optionText,
        isCorrect: parsed.data.isCorrect,
      },
      select: { id: true },
    });

    if (parsed.data.isCorrect && questionType?.type === QuizQuestionType.SINGLE) {
      await normalizeSingleChoiceCorrectAnswers(tx, parsed.data.questionId, option.id);
    }
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, question.quiz.chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Réponse ajoutée."));
}

export async function updateQuizOptionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = quizOptionFormSchema.safeParse({
    optionId: getString(formData, "optionId"),
    questionId: getString(formData, "questionId"),
    quizId: getString(formData, "quizId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
    optionText: getString(formData, "optionText"),
    isCorrect: getBoolean(formData, "isCorrect"),
  });

  if (!parsed.success || !parsed.data.optionId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Réponse invalide."));
  }

  const option = await assertQuizOptionAccess(parsed.data.optionId, parsed.data.courseId, session);

  await db.$transaction(async (tx) => {
    await tx.quizOption.update({
      where: { id: parsed.data.optionId! },
      data: {
        optionText: parsed.data.optionText,
        isCorrect: parsed.data.isCorrect,
      },
    });

    const question = await tx.quizQuestion.findUniqueOrThrow({
      where: { id: parsed.data.questionId },
      select: { type: true },
    });

    if (question.type === QuizQuestionType.SINGLE) {
      await normalizeSingleChoiceCorrectAnswers(tx, parsed.data.questionId, parsed.data.isCorrect ? parsed.data.optionId : undefined);
    }
  });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, option.question.quiz.chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Réponse mise à jour."));
}

export async function deleteQuizOptionAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = deleteQuizEntitySchema.safeParse({
    id: getString(formData, "optionId"),
    courseId: getString(formData, "courseId"),
    chapterId: getString(formData, "chapterId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Réponse invalide."));
  }

  const option = await assertQuizOptionAccess(parsed.data.id, parsed.data.courseId, session);
  await db.quizOption.delete({ where: { id: parsed.data.id } });

  revalidateQuizSurfaces(parsed.data.courseId, parsed.data.chapterId, option.question.quiz.chapter.module.course.slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`, "success", "Réponse supprimée."));
}

export async function startChapterProgressAction(chapterId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      module: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (!chapter) {
    return;
  }

  await db.$transaction(async (tx) => {
    await ensureEnrollment(tx, session.user.id, chapter.module.courseId);

    const existingProgress = await tx.chapterProgress.findUnique({
      where: {
        userId_chapterId: {
          userId: session.user.id,
          chapterId,
        },
      },
      select: {
        status: true,
      },
    });

    if (existingProgress?.status === ChapterProgressStatus.COMPLETED) {
      return;
    }

    await markChapterInProgress(tx, session.user.id, chapterId);
  });
}

export async function markChapterCompletedAction(formData: FormData) {
  const userId = await requireLearnerSession();
  const parsed = chapterProgressFormSchema.safeParse({
    chapterId: getString(formData, "chapterId"),
    courseSlug: getString(formData, "courseSlug"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/dashboard", "error", parsed.error.issues[0]?.message ?? "Chapitre invalide."));
  }

  const chapter = await db.chapter.findUnique({
    where: { id: parsed.data.chapterId },
    select: {
      id: true,
      quiz: { select: { id: true } },
      module: {
        select: {
          courseId: true,
          course: {
            select: { slug: true },
          },
        },
      },
    },
  });

  if (!chapter || chapter.module.course.slug !== parsed.data.courseSlug) {
    redirect(buildRedirectUrl("/dashboard", "error", "Chapitre introuvable."));
  }

  if (chapter.quiz) {
    redirect(buildRedirectUrl(`/courses/${parsed.data.courseSlug}/learn/${parsed.data.chapterId}`, "error", "Ce chapitre nécessite la réussite du quiz pour être terminé."));
  }

  const summary = await db.$transaction(async (tx) => {
    await ensureEnrollment(tx, userId, chapter.module.courseId);
    await markChapterCompleted(tx, userId, chapter.id);
    await recalculateEnrollmentProgress(tx, userId, chapter.module.courseId);
    return applyLearningGamification(tx, {
      userId,
      chapterId: chapter.id,
    });
  });

  revalidateQuizSurfaces(chapter.module.courseId, chapter.id, parsed.data.courseSlug);
  const nextPath = await getNextChapterPath(chapter.module.courseId, chapter.id, parsed.data.courseSlug);
  const parts = ["Chapitre marqué comme terminé."];

  if (summary.xpGained > 0) {
    parts.push(`+${summary.xpGained} XP`);
  }
  if (summary.levelAfter > summary.levelBefore) {
    parts.push(`Niveau ${summary.levelAfter} atteint`);
  }
  if (summary.unlockedBadges.length) {
    parts.push(`Badge débloqué : ${summary.unlockedBadges.join(", ")}`);
  }

  redirect(buildRedirectUrl(nextPath, "success", parts.join(" • ")));
}

export async function submitQuizAttemptAction(formData: FormData) {
  const userId = await requireLearnerSession();
  const parsed = quizSubmissionSchema.safeParse({
    quizId: getString(formData, "quizId"),
    chapterId: getString(formData, "chapterId"),
    courseSlug: getString(formData, "courseSlug"),
    answers: getString(formData, "answers"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/dashboard", "error", parsed.error.issues[0]?.message ?? "Soumission invalide."));
  }

  const quiz = await db.quiz.findUnique({
    where: { id: parsed.data.quizId },
    select: {
      id: true,
      title: true,
      passingScore: true,
      xpReward: true,
      chapter: {
        select: {
          id: true,
          module: {
            select: {
              courseId: true,
              course: {
                select: { slug: true },
              },
            },
          },
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          options: {
            orderBy: { optionText: "asc" },
            select: {
              id: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  });

  if (!quiz || quiz.chapter.id !== parsed.data.chapterId || quiz.chapter.module.course.slug !== parsed.data.courseSlug) {
    redirect(buildRedirectUrl("/dashboard", "error", "Quiz introuvable."));
  }

  if (!quiz.questions.length) {
    redirect(buildRedirectUrl(`/courses/${parsed.data.courseSlug}/learn/${parsed.data.chapterId}`, "error", "Ce quiz ne contient encore aucune question."));
  }

  const hasInvalidQuestion = quiz.questions.some(
    (question) => !question.options.length || !question.options.some((option) => option.isCorrect),
  );
  if (hasInvalidQuestion) {
    redirect(buildRedirectUrl(`/courses/${parsed.data.courseSlug}/learn/${parsed.data.chapterId}`, "error", "Ce quiz n’est pas encore entièrement configuré."));
  }

  let correctCount = 0;

  for (const question of quiz.questions) {
    const selected = getQuestionAnswerSet(parsed.data.answers, question.id);
    const correct = new Set(question.options.filter((option) => option.isCorrect).map((option) => option.id));

    if (selected.size !== correct.size) {
      continue;
    }

    const isCorrect = [...selected].every((optionId) => correct.has(optionId));
    if (isCorrect) {
      correctCount += 1;
    }
  }

  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  try {
    const summary = await db.$transaction(async (tx) => {
      await ensureEnrollment(tx, userId, quiz.chapter.module.courseId);
      await tx.quizAttempt.create({
        data: {
          userId,
          quizId: quiz.id,
          score,
          passed,
          answers: parsed.data.answers as Prisma.InputJsonValue,
        },
      });

      if (passed) {
        await markChapterCompleted(tx, userId, quiz.chapter.id);
        await recalculateEnrollmentProgress(tx, userId, quiz.chapter.module.courseId);
        return applyLearningGamification(tx, {
          userId,
          chapterId: quiz.chapter.id,
          quizId: quiz.id,
          quizXpReward: quiz.xpReward,
          perfectQuiz: score === 100,
        });
      }

      await markChapterInProgress(tx, userId, quiz.chapter.id);
      await recalculateEnrollmentProgress(tx, userId, quiz.chapter.module.courseId);

      return {
        xpGained: 0,
        levelBefore: 0,
        levelAfter: 0,
        unlockedBadges: [],
        currentStreak: 0,
      };
    });

    revalidateQuizSurfaces(quiz.chapter.module.courseId, quiz.chapter.id, parsed.data.courseSlug);
    const redirectPath = passed
      ? await getNextChapterPath(quiz.chapter.module.courseId, quiz.chapter.id, parsed.data.courseSlug)
      : `/courses/${parsed.data.courseSlug}/learn/${parsed.data.chapterId}`;
    const successParts = [`Quiz réussi avec ${score}% de bonnes réponses.`];

    if (summary.xpGained > 0) {
      successParts.push(`+${summary.xpGained} XP`);
    }
    if (summary.levelAfter > summary.levelBefore) {
      successParts.push(`Niveau ${summary.levelAfter} atteint`);
    }
    if (summary.unlockedBadges.length) {
      successParts.push(`Badge débloqué : ${summary.unlockedBadges.join(", ")}`);
    }

    redirect(
      buildRedirectUrl(
        redirectPath,
        passed ? "success" : "error",
        passed
          ? successParts.join(" • ")
          : `Quiz non réussi (${score}%). Vous pouvez réessayer.`,
      ),
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[quiz][submit]", {
      quizId: quiz.id,
      chapterId: parsed.data.chapterId,
      courseSlug: parsed.data.courseSlug,
      userId,
      score,
      passed,
      error,
    });

    redirect(
      buildRedirectUrl(
        `/courses/${parsed.data.courseSlug}/learn/${parsed.data.chapterId}`,
        "error",
        "Une erreur est survenue pendant la validation du quiz.",
      ),
    );
  }
}
