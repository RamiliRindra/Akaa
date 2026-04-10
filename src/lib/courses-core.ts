/**
 * courses-core — helpers purs pour manipuler cours / modules / chapitres / quiz.
 *
 * Ce module est la brique commune utilisée par les routes `/api/v1/*` (phase 9)
 * et peut, à terme, être partagé avec les Server Actions de `src/actions/courses.ts`
 * et `src/actions/quiz.ts`. Pour cette livraison initiale, les Server Actions
 * restent inchangées — ce module est additif et ne modifie pas le comportement UI
 * existant du formateur.
 *
 * Principes :
 * - Chaque helper prend un `ActorContext` (userId + rôle) en premier argument.
 * - Aucun appel à `redirect()`, `revalidatePath()` ou `FormData`. Retour pur ou
 *   exception typée `CoursesCoreError`.
 * - Les contrôles d'autorisation sont explicites : un TRAINER ne peut manipuler
 *   que ses propres cours ; un ADMIN a accès à tout.
 * - Les entrées sont validées par des schémas Zod dédiés (distincts des
 *   `*FormSchema` côté UI) pour rester indépendants de FormData.
 */

import {
  CourseStatus,
  Prisma,
  QuizQuestionType,
  UserRole,
  VideoType,
} from "@prisma/client";
import { z } from "zod";

import { courseLevels } from "@/lib/course-level";
import { deriveVideoType, emptyMarkdownDocument, isSupportedVideoUrl } from "@/lib/content";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Types & erreurs
// -----------------------------------------------------------------------------

export type ActorContext = {
  userId: string;
  role: UserRole;
};

export type CoursesCoreErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT";

export class CoursesCoreError extends Error {
  constructor(
    public readonly code: CoursesCoreErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CoursesCoreError";
  }
}

function requireTrainerOrAdmin(actor: ActorContext): void {
  if (actor.role !== UserRole.TRAINER && actor.role !== UserRole.ADMIN) {
    throw new CoursesCoreError(
      "FORBIDDEN",
      "Seuls les formateurs et administrateurs peuvent utiliser cette API.",
    );
  }
}

function isAdmin(actor: ActorContext): boolean {
  return actor.role === UserRole.ADMIN;
}

// -----------------------------------------------------------------------------
// Schémas d'entrée (indépendants de FormData)
// -----------------------------------------------------------------------------

const optionalUuidSchema = z
  .string()
  .trim()
  .uuid("Identifiant invalide.")
  .optional()
  .nullable();

const optionalNonEmptyString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable();

const optionalPositiveInt = z
  .number()
  .int()
  .positive()
  .optional()
  .nullable();

export const courseInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Le titre doit contenir au moins 3 caractères.")
    .max(255, "Le titre est trop long."),
  description: optionalNonEmptyString,
  categoryId: optionalUuidSchema,
  thumbnailUrl: z
    .string()
    .trim()
    .url("L'URL de miniature est invalide.")
    .optional()
    .nullable(),
  estimatedHours: optionalPositiveInt,
  level: z.enum(courseLevels).default("BEGINNER"),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
});

export const courseUpdateInputSchema = courseInputSchema.partial();

export const moduleInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Le titre du module est requis.")
    .max(255, "Le titre du module est trop long."),
  description: optionalNonEmptyString,
  order: z.number().int().positive().optional(),
});

export const moduleUpdateInputSchema = moduleInputSchema.partial();

export const chapterInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Le titre du chapitre est requis.")
    .max(255, "Le titre du chapitre est trop long."),
  content: z.string().optional().nullable(),
  videoUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (value) => !value || isSupportedVideoUrl(value),
      "Seuls YouTube et Google Drive sont autorisés pour les vidéos.",
    ),
  estimatedMinutes: optionalPositiveInt,
  order: z.number().int().positive().optional(),
});

export const chapterUpdateInputSchema = chapterInputSchema.partial();

const quizOptionInputSchema = z.object({
  optionText: z.string().trim().min(1, "Le texte de la réponse est requis."),
  isCorrect: z.boolean(),
});

const quizQuestionInputSchema = z
  .object({
    questionText: z
      .string()
      .trim()
      .min(5, "Chaque question doit contenir au moins 5 caractères."),
    type: z.nativeEnum(QuizQuestionType),
    options: z
      .array(quizOptionInputSchema)
      .min(2, "Chaque question doit contenir au moins deux réponses."),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;

    if (correctCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Chaque question doit avoir au moins une bonne réponse.",
      });
    }

    if (question.type === QuizQuestionType.SINGLE && correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Une question à choix unique doit avoir exactement une bonne réponse.",
      });
    }
  });

export const quizInputSchema = z.object({
  title: z.string().trim().min(3, "Le titre du quiz doit contenir au moins 3 caractères."),
  passingScore: z.number().int().min(1).max(100).default(70),
  xpReward: z.number().int().positive().default(50),
  questions: z
    .array(quizQuestionInputSchema)
    .min(1, "Le quiz doit contenir au moins une question."),
});

export const listQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(CourseStatus).optional(),
});

export type CourseInput = z.infer<typeof courseInputSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateInputSchema>;
export type ModuleInput = z.infer<typeof moduleInputSchema>;
export type ModuleUpdateInput = z.infer<typeof moduleUpdateInputSchema>;
export type ChapterInput = z.infer<typeof chapterInputSchema>;
export type ChapterUpdateInput = z.infer<typeof chapterUpdateInputSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

// -----------------------------------------------------------------------------
// Helpers internes
// -----------------------------------------------------------------------------

async function createUniqueCourseSlug(title: string, excludeCourseId?: string): Promise<string> {
  const base = slugify(title) || "cours";
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await db.course.findFirst({
      where: {
        slug: candidate,
        ...(excludeCourseId ? { id: { not: excludeCourseId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function loadCourseOrThrow(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, slug: true, trainerId: true, title: true },
  });

  if (!course) {
    throw new CoursesCoreError("NOT_FOUND", "Cours introuvable.");
  }

  return course;
}

async function assertCourseOwnership(actor: ActorContext, courseId: string) {
  const course = await loadCourseOrThrow(courseId);

  if (!isAdmin(actor) && course.trainerId !== actor.userId) {
    throw new CoursesCoreError("FORBIDDEN", "Vous n'avez pas accès à ce cours.");
  }

  return course;
}

async function assertModuleOwnership(actor: ActorContext, moduleId: string) {
  const moduleRecord = await db.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      courseId: true,
      course: { select: { trainerId: true } },
    },
  });

  if (!moduleRecord) {
    throw new CoursesCoreError("NOT_FOUND", "Module introuvable.");
  }

  if (!isAdmin(actor) && moduleRecord.course.trainerId !== actor.userId) {
    throw new CoursesCoreError("FORBIDDEN", "Vous n'avez pas accès à ce module.");
  }

  return moduleRecord;
}

async function assertChapterOwnership(actor: ActorContext, chapterId: string) {
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      moduleId: true,
      module: {
        select: {
          courseId: true,
          course: { select: { trainerId: true } },
        },
      },
    },
  });

  if (!chapter) {
    throw new CoursesCoreError("NOT_FOUND", "Chapitre introuvable.");
  }

  if (!isAdmin(actor) && chapter.module.course.trainerId !== actor.userId) {
    throw new CoursesCoreError("FORBIDDEN", "Vous n'avez pas accès à ce chapitre.");
  }

  return chapter;
}

async function normalizeModuleOrder(tx: Prisma.TransactionClient, courseId: string) {
  const modules = await tx.module.findMany({
    where: { courseId },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    modules.map((moduleRecord, index) =>
      tx.module.update({
        where: { id: moduleRecord.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

async function normalizeChapterOrder(tx: Prisma.TransactionClient, moduleId: string) {
  const chapters = await tx.chapter.findMany({
    where: { moduleId },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    chapters.map((chapter, index) =>
      tx.chapter.update({
        where: { id: chapter.id },
        data: { order: index + 1 },
      }),
    ),
  );
}

// -----------------------------------------------------------------------------
// Cours
// -----------------------------------------------------------------------------

export async function listCoursesForActor(actor: ActorContext, query: ListQuery) {
  requireTrainerOrAdmin(actor);

  const where: Prisma.CourseWhereInput = {
    ...(isAdmin(actor) ? {} : { trainerId: actor.userId }),
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnailUrl: true,
        status: true,
        level: true,
        categoryId: true,
        estimatedHours: true,
        trainerId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.course.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getCourseForActor(actor: ActorContext, courseId: string) {
  requireTrainerOrAdmin(actor);
  await assertCourseOwnership(actor, courseId);

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              videoUrl: true,
              videoType: true,
              estimatedMinutes: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new CoursesCoreError("NOT_FOUND", "Cours introuvable.");
  }

  return course;
}

export async function createCourseForActor(actor: ActorContext, rawInput: unknown) {
  requireTrainerOrAdmin(actor);

  const parsed = courseInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Cours invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;
  const slug = await createUniqueCourseSlug(input.title);

  const course = await db.course.create({
    data: {
      title: input.title,
      slug,
      description: input.description ?? undefined,
      categoryId: input.categoryId ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
      estimatedHours: input.estimatedHours ?? undefined,
      level: input.level,
      status: input.status,
      trainerId: actor.userId,
    },
  });

  return course;
}

export async function updateCourseForActor(
  actor: ActorContext,
  courseId: string,
  rawInput: unknown,
) {
  requireTrainerOrAdmin(actor);
  await assertCourseOwnership(actor, courseId);

  const parsed = courseUpdateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Cours invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;

  const data: Prisma.CourseUpdateInput = {};
  if (input.title !== undefined) {
    data.title = input.title;
    data.slug = await createUniqueCourseSlug(input.title, courseId);
  }
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.thumbnailUrl !== undefined) data.thumbnailUrl = input.thumbnailUrl ?? null;
  if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours ?? null;
  if (input.level !== undefined) data.level = input.level;
  if (input.status !== undefined) data.status = input.status;
  if (input.categoryId !== undefined) {
    data.category = input.categoryId
      ? { connect: { id: input.categoryId } }
      : { disconnect: true };
  }

  const course = await db.course.update({
    where: { id: courseId },
    data,
  });

  return course;
}

export async function deleteCourseForActor(actor: ActorContext, courseId: string): Promise<void> {
  requireTrainerOrAdmin(actor);
  await assertCourseOwnership(actor, courseId);

  await db.course.delete({ where: { id: courseId } });
}

// -----------------------------------------------------------------------------
// Modules
// -----------------------------------------------------------------------------

export async function listModulesForActor(actor: ActorContext, courseId: string) {
  requireTrainerOrAdmin(actor);
  await assertCourseOwnership(actor, courseId);

  return db.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      courseId: true,
      title: true,
      description: true,
      order: true,
    },
  });
}

export async function createModuleForActor(
  actor: ActorContext,
  courseId: string,
  rawInput: unknown,
) {
  requireTrainerOrAdmin(actor);
  await assertCourseOwnership(actor, courseId);

  const parsed = moduleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Module invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;
  const lastModule = await db.module.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return db.module.create({
    data: {
      courseId,
      title: input.title,
      description: input.description ?? undefined,
      order: input.order ?? (lastModule?.order ?? 0) + 1,
    },
  });
}

export async function updateModuleForActor(
  actor: ActorContext,
  moduleId: string,
  rawInput: unknown,
) {
  requireTrainerOrAdmin(actor);
  await assertModuleOwnership(actor, moduleId);

  const parsed = moduleUpdateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Module invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;
  const data: Prisma.ModuleUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.order !== undefined) data.order = input.order;

  return db.module.update({
    where: { id: moduleId },
    data,
  });
}

export async function deleteModuleForActor(actor: ActorContext, moduleId: string): Promise<void> {
  requireTrainerOrAdmin(actor);
  const moduleRecord = await assertModuleOwnership(actor, moduleId);

  await db.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } });
    await normalizeModuleOrder(tx, moduleRecord.courseId);
  });
}

// -----------------------------------------------------------------------------
// Chapitres
// -----------------------------------------------------------------------------

export async function listChaptersForActor(actor: ActorContext, moduleId: string) {
  requireTrainerOrAdmin(actor);
  await assertModuleOwnership(actor, moduleId);

  return db.chapter.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      moduleId: true,
      title: true,
      order: true,
      videoUrl: true,
      videoType: true,
      estimatedMinutes: true,
    },
  });
}

export async function getChapterForActor(actor: ActorContext, chapterId: string) {
  requireTrainerOrAdmin(actor);
  await assertChapterOwnership(actor, chapterId);

  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    throw new CoursesCoreError("NOT_FOUND", "Chapitre introuvable.");
  }

  return chapter;
}

export async function createChapterForActor(
  actor: ActorContext,
  moduleId: string,
  rawInput: unknown,
) {
  requireTrainerOrAdmin(actor);
  await assertModuleOwnership(actor, moduleId);

  const parsed = chapterInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Chapitre invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;
  const lastChapter = await db.chapter.findFirst({
    where: { moduleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const videoType: VideoType = deriveVideoType(input.videoUrl ?? undefined);

  return db.chapter.create({
    data: {
      moduleId,
      title: input.title,
      content: input.content ?? emptyMarkdownDocument,
      videoUrl: input.videoUrl ?? undefined,
      videoType,
      estimatedMinutes: input.estimatedMinutes ?? undefined,
      order: input.order ?? (lastChapter?.order ?? 0) + 1,
    },
  });
}

export async function updateChapterForActor(
  actor: ActorContext,
  chapterId: string,
  rawInput: unknown,
) {
  requireTrainerOrAdmin(actor);
  await assertChapterOwnership(actor, chapterId);

  const parsed = chapterUpdateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Chapitre invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;
  const data: Prisma.ChapterUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) data.content = input.content ?? emptyMarkdownDocument;
  if (input.estimatedMinutes !== undefined) data.estimatedMinutes = input.estimatedMinutes ?? null;
  if (input.order !== undefined) data.order = input.order;
  if (input.videoUrl !== undefined) {
    data.videoUrl = input.videoUrl ?? null;
    data.videoType = deriveVideoType(input.videoUrl ?? undefined);
  }

  return db.chapter.update({
    where: { id: chapterId },
    data,
  });
}

export async function deleteChapterForActor(actor: ActorContext, chapterId: string): Promise<void> {
  requireTrainerOrAdmin(actor);
  const chapter = await assertChapterOwnership(actor, chapterId);

  await db.$transaction(async (tx) => {
    await tx.chapter.delete({ where: { id: chapterId } });
    await normalizeChapterOrder(tx, chapter.moduleId);
  });
}

// -----------------------------------------------------------------------------
// Quiz
// -----------------------------------------------------------------------------

export async function getQuizForActor(actor: ActorContext, chapterId: string) {
  requireTrainerOrAdmin(actor);
  await assertChapterOwnership(actor, chapterId);

  return db.quiz.findUnique({
    where: { chapterId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { id: "asc" } },
        },
      },
    },
  });
}

export async function setQuizForActor(
  actor: ActorContext,
  chapterId: string,
  rawInput: unknown,
) {
  requireTrainerOrAdmin(actor);
  await assertChapterOwnership(actor, chapterId);

  const parsed = quizInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CoursesCoreError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Quiz invalide.",
      parsed.error.issues,
    );
  }

  const input = parsed.data;

  return db.$transaction(async (tx) => {
    const existingQuiz = await tx.quiz.findUnique({
      where: { chapterId },
      select: { id: true },
    });

    if (existingQuiz) {
      await tx.quiz.delete({ where: { id: existingQuiz.id } });
    }

    const quiz = await tx.quiz.create({
      data: {
        chapterId,
        title: input.title,
        passingScore: input.passingScore,
        xpReward: input.xpReward,
      },
    });

    for (const [questionIndex, question] of input.questions.entries()) {
      const createdQuestion = await tx.quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionText: question.questionText,
          type: question.type,
          order: questionIndex + 1,
        },
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

    return tx.quiz.findUniqueOrThrow({
      where: { id: quiz.id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { id: "asc" } } },
        },
      },
    });
  });
}

export async function deleteQuizForActor(actor: ActorContext, chapterId: string): Promise<void> {
  requireTrainerOrAdmin(actor);
  await assertChapterOwnership(actor, chapterId);

  const existing = await db.quiz.findUnique({
    where: { chapterId },
    select: { id: true },
  });

  if (!existing) {
    return;
  }

  await db.quiz.delete({ where: { id: existing.id } });
}
