"use server";

import { parse } from "csv-parse/sync";
import JSZip from "jszip";
import { CourseStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { deriveVideoType, emptyMarkdownDocument } from "@/lib/content";
import { db } from "@/lib/db";
import {
  chapterFormSchema,
  courseImportArchiveSchema,
  courseImportManifestSchema,
  courseImportQuizFileSchema,
  courseFormSchema,
  createChapterSchema,
  deleteItemSchema,
  moduleFormSchema,
  moveItemSchema,
} from "@/lib/validations/course";
import { slugify } from "@/lib/utils";

type TrainerSession = {
  userId: string;
  role: UserRole;
};

type CourseImportRow = z.infer<typeof courseImportManifestSchema>[number];
type CourseImportQuizFile = z.infer<typeof courseImportQuizFileSchema>;

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

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

function sanitizeMarkdown(markdown: string) {
  return markdown.replace(/\r\n/g, "\n").trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
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

async function assertCourseManagementAccess(courseId: string, session: TrainerSession) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      slug: true,
      trainerId: true,
    },
  });

  if (!course) {
    throw new Error("Cours introuvable.");
  }

  if (session.role !== "ADMIN" && course.trainerId !== session.userId) {
    throw new Error("Vous n’avez pas accès à ce cours.");
  }

  return course;
}

async function normalizeModuleOrder(tx: Prisma.TransactionClient, courseId: string) {
  const modules = await tx.module.findMany({
    where: { courseId },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    modules.map((module, index) =>
      tx.module.update({
        where: { id: module.id },
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

async function createUniqueCourseSlug(title: string, excludeCourseId?: string) {
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

function parseManifestCsv(csvContent: string) {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return courseImportManifestSchema.parse(records);
}

function parseQuizFile(content: string) {
  const parsed = JSON.parse(content);
  return courseImportQuizFileSchema.parse(parsed);
}

function assertSingleCourseManifest(rows: CourseImportRow[]) {
  const titleValues = new Set(rows.map((row) => row.course_title));
  const descriptionValues = new Set(rows.map((row) => row.course_description ?? ""));
  const statusValues = new Set(rows.map((row) => row.course_status));
  const hoursValues = new Set(rows.map((row) => row.estimated_hours ?? null));
  const categoryValues = new Set(rows.map((row) => row.category_slug ?? ""));

  if (titleValues.size !== 1 || descriptionValues.size !== 1 || statusValues.size !== 1 || hoursValues.size !== 1 || categoryValues.size !== 1) {
    throw new Error("Le fichier manifest.csv doit décrire un seul cours avec des métadonnées cohérentes.");
  }
}

function assertManifestOrdering(rows: CourseImportRow[]) {
  const moduleMap = new Map<number, { title: string; description?: string; chapterOrders: Set<number> }>();

  for (const row of rows) {
    const existingModule = moduleMap.get(row.module_order);
    if (!existingModule) {
      moduleMap.set(row.module_order, {
        title: row.module_title,
        description: row.module_description,
        chapterOrders: new Set([row.chapter_order]),
      });
      continue;
    }

    if (existingModule.title !== row.module_title || (existingModule.description ?? "") !== (row.module_description ?? "")) {
      throw new Error(`Le module ${row.module_order} a des informations incohérentes dans le manifest.`);
    }

    if (existingModule.chapterOrders.has(row.chapter_order)) {
      throw new Error(`Le chapitre ${row.chapter_order} est dupliqué dans le module ${row.module_order}.`);
    }

    existingModule.chapterOrders.add(row.chapter_order);
  }
}

async function extractImportPayload(file: File) {
  const parsedArchive = courseImportArchiveSchema.parse({ name: file.name });
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestFile = zip.file("manifest.csv");

  if (!manifestFile) {
    throw new Error(`L’archive ${parsedArchive.name} doit contenir un fichier manifest.csv à la racine.`);
  }

  const manifestContent = await manifestFile.async("string");
  const rows = parseManifestCsv(manifestContent);
  assertSingleCourseManifest(rows);
  assertManifestOrdering(rows);

  const chapterFiles = new Map<string, string>();
  const quizFiles = new Map<string, CourseImportQuizFile>();
  for (const row of rows) {
    if (!row.content_file) {
      // no-op
    } else {
      const chapterFile = zip.file(row.content_file);
      if (!chapterFile) {
        throw new Error(`Le fichier de contenu ${row.content_file} est introuvable dans l’archive.`);
      }

      chapterFiles.set(row.content_file, sanitizeMarkdown(await chapterFile.async("string")));
    }

    if (!row.quiz_file || quizFiles.has(row.quiz_file)) {
      continue;
    }

    const quizFile = zip.file(row.quiz_file);
    if (!quizFile) {
      throw new Error(`Le fichier de quiz ${row.quiz_file} est introuvable dans l’archive.`);
    }

    quizFiles.set(row.quiz_file, parseQuizFile(await quizFile.async("string")));
  }

  return {
    rows,
    chapterFiles,
    quizFiles,
  };
}

function revalidateCourseSurfaces(slug?: string) {
  revalidatePath("/trainer/courses");
  revalidatePath("/trainer/courses/import");
  revalidatePath("/courses");

  if (slug) {
    revalidatePath(`/courses/${slug}`);
    revalidatePath(`/courses/${slug}/learn`, "layout");
  }
}

export async function createCourseAction(formData: FormData) {
  const session = await requireTrainerSession();
  const redirectTo = "/trainer/courses/new";

  const parsed = courseFormSchema.safeParse({
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    categoryId: getString(formData, "categoryId"),
    thumbnailUrl: getString(formData, "thumbnailUrl"),
    estimatedHours: getString(formData, "estimatedHours"),
    status: getString(formData, "status") || CourseStatus.DRAFT,
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(redirectTo, "error", parsed.error.issues[0]?.message ?? "Cours invalide."));
  }

  const slug = await createUniqueCourseSlug(parsed.data.title);
  const course = await db.course.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      thumbnailUrl: parsed.data.thumbnailUrl,
      estimatedHours: parsed.data.estimatedHours,
      status: parsed.data.status,
      trainerId: session.userId,
    },
    select: { id: true },
  });

  revalidateCourseSurfaces(slug);
  redirect(buildRedirectUrl(`/trainer/courses/${course.id}/edit`, "success", "Cours créé avec succès."));
}

export async function updateCourseAction(formData: FormData) {
  const session = await requireTrainerSession();

  const parsed = courseFormSchema.safeParse({
    courseId: getString(formData, "courseId"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    categoryId: getString(formData, "categoryId"),
    thumbnailUrl: getString(formData, "thumbnailUrl"),
    estimatedHours: getString(formData, "estimatedHours"),
    status: getString(formData, "status"),
  });

  if (!parsed.success || !parsed.data.courseId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Cours invalide."));
  }

  const currentCourse = await assertCourseManagementAccess(parsed.data.courseId, session);
  const slug = await createUniqueCourseSlug(parsed.data.title, parsed.data.courseId);

  await db.course.update({
    where: { id: parsed.data.courseId },
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      thumbnailUrl: parsed.data.thumbnailUrl,
      estimatedHours: parsed.data.estimatedHours,
      status: parsed.data.status,
    },
  });

  revalidateCourseSurfaces(currentCourse.slug);
  revalidateCourseSurfaces(slug);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/edit`, "success", "Cours mis à jour."));
}

export async function deleteCourseAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = deleteItemSchema.safeParse({
    id: getString(formData, "courseId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Cours invalide."));
  }

  const course = await assertCourseManagementAccess(parsed.data.id, session);
  await db.course.delete({ where: { id: parsed.data.id } });

  revalidateCourseSurfaces(course.slug);
  redirect(buildRedirectUrl("/trainer/courses", "success", "Cours supprimé."));
}

export async function createModuleAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = moduleFormSchema.safeParse({
    courseId: getString(formData, "courseId"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Module invalide."));
  }

  await assertCourseManagementAccess(parsed.data.courseId, session);

  const lastModule = await db.module.findFirst({
    where: { courseId: parsed.data.courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.module.create({
    data: {
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      description: parsed.data.description,
      order: (lastModule?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/trainer/courses/${parsed.data.courseId}/edit`);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/edit`, "success", "Module ajouté."));
}

export async function updateModuleAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = moduleFormSchema.safeParse({
    moduleId: getString(formData, "moduleId"),
    courseId: getString(formData, "courseId"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
  });

  if (!parsed.success || !parsed.data.moduleId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Module invalide."));
  }

  await assertCourseManagementAccess(parsed.data.courseId, session);

  await db.module.update({
    where: { id: parsed.data.moduleId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
    },
  });

  revalidatePath(`/trainer/courses/${parsed.data.courseId}/edit`);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.courseId}/edit`, "success", "Module mis à jour."));
}

export async function moveModuleAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = moveItemSchema.safeParse({
    id: getString(formData, "moduleId"),
    parentId: getString(formData, "courseId"),
    direction: getString(formData, "direction"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Déplacement invalide."));
  }

  await assertCourseManagementAccess(parsed.data.parentId, session);

  await db.$transaction(async (tx) => {
    const modules = await tx.module.findMany({
      where: { courseId: parsed.data.parentId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const index = modules.findIndex((module) => module.id === parsed.data.id);
    const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;

    if (index < 0 || swapIndex < 0 || swapIndex >= modules.length) {
      return;
    }

    const source = modules[index];
    const target = modules[swapIndex];
    const sourceRecord = await tx.module.findUniqueOrThrow({
      where: { id: source.id },
      select: { order: true },
    });
    const targetRecord = await tx.module.findUniqueOrThrow({
      where: { id: target.id },
      select: { order: true },
    });

    await tx.module.update({
      where: { id: source.id },
      data: { order: targetRecord.order },
    });
    await tx.module.update({
      where: { id: target.id },
      data: { order: sourceRecord.order },
    });

    await normalizeModuleOrder(tx, parsed.data.parentId);
  });

  revalidatePath(`/trainer/courses/${parsed.data.parentId}/edit`);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.parentId}/edit`, "success", "Ordre des modules mis à jour."));
}

export async function deleteModuleAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = deleteItemSchema.safeParse({
    id: getString(formData, "moduleId"),
    parentId: getString(formData, "courseId"),
  });

  if (!parsed.success || !parsed.data.parentId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Module invalide."));
  }

  await assertCourseManagementAccess(parsed.data.parentId, session);

  await db.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: parsed.data.id } });
    await normalizeModuleOrder(tx, parsed.data.parentId!);
  });

  revalidatePath(`/trainer/courses/${parsed.data.parentId}/edit`);
  redirect(buildRedirectUrl(`/trainer/courses/${parsed.data.parentId}/edit`, "success", "Module supprimé."));
}

export async function createChapterAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = createChapterSchema.safeParse({
    courseId: getString(formData, "courseId"),
    moduleId: getString(formData, "moduleId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error.issues[0]?.message ?? "Chapitre invalide."));
  }

  await assertCourseManagementAccess(parsed.data.courseId, session);

  const lastChapter = await db.chapter.findFirst({
    where: { moduleId: parsed.data.moduleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const chapter = await db.chapter.create({
    data: {
      moduleId: parsed.data.moduleId,
      title: "Nouveau chapitre",
      content: emptyMarkdownDocument,
      order: (lastChapter?.order ?? 0) + 1,
    },
    select: { id: true },
  });

  revalidatePath(`/trainer/courses/${parsed.data.courseId}/edit`);
  redirect(
    buildRedirectUrl(
      `/trainer/courses/${parsed.data.courseId}/chapters/${chapter.id}/edit`,
      "success",
      "Chapitre créé. Complétez maintenant son contenu.",
    ),
  );
}

export async function updateChapterAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = chapterFormSchema.safeParse({
    chapterId: getString(formData, "chapterId"),
    courseId: getString(formData, "courseId"),
    moduleId: getString(formData, "moduleId"),
    title: getString(formData, "title"),
    content: getString(formData, "content"),
    videoUrl: getString(formData, "videoUrl"),
    estimatedMinutes: getString(formData, "estimatedMinutes"),
  });

  if (!parsed.success || !parsed.data.chapterId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Chapitre invalide."));
  }

  const course = await assertCourseManagementAccess(parsed.data.courseId, session);

  await db.chapter.update({
    where: { id: parsed.data.chapterId },
    data: {
      title: parsed.data.title,
      content: sanitizeMarkdown(parsed.data.content),
      videoUrl: parsed.data.videoUrl,
      videoType: deriveVideoType(parsed.data.videoUrl),
      estimatedMinutes: parsed.data.estimatedMinutes,
    },
  });

  revalidatePath(`/trainer/courses/${parsed.data.courseId}/edit`);
  revalidateCourseSurfaces(course.slug);
  redirect(
    buildRedirectUrl(
      `/trainer/courses/${parsed.data.courseId}/chapters/${parsed.data.chapterId}/edit`,
      "success",
      "Chapitre mis à jour.",
    ),
  );
}

export async function moveChapterAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = moveItemSchema.safeParse({
    id: getString(formData, "chapterId"),
    parentId: getString(formData, "moduleId"),
    direction: getString(formData, "direction"),
  });
  const courseId = getString(formData, "courseId");

  if (!parsed.success || !courseId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Déplacement invalide."));
  }

  await assertCourseManagementAccess(courseId, session);

  await db.$transaction(async (tx) => {
    const chapters = await tx.chapter.findMany({
      where: { moduleId: parsed.data.parentId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const index = chapters.findIndex((chapter) => chapter.id === parsed.data.id);
    const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;

    if (index < 0 || swapIndex < 0 || swapIndex >= chapters.length) {
      return;
    }

    const source = chapters[index];
    const target = chapters[swapIndex];
    const sourceRecord = await tx.chapter.findUniqueOrThrow({
      where: { id: source.id },
      select: { order: true },
    });
    const targetRecord = await tx.chapter.findUniqueOrThrow({
      where: { id: target.id },
      select: { order: true },
    });

    await tx.chapter.update({
      where: { id: source.id },
      data: { order: targetRecord.order },
    });
    await tx.chapter.update({
      where: { id: target.id },
      data: { order: sourceRecord.order },
    });

    await normalizeChapterOrder(tx, parsed.data.parentId);
  });

  revalidatePath(`/trainer/courses/${courseId}/edit`);
  redirect(buildRedirectUrl(`/trainer/courses/${courseId}/edit`, "success", "Ordre des chapitres mis à jour."));
}

export async function deleteChapterAction(formData: FormData) {
  const session = await requireTrainerSession();
  const parsed = deleteItemSchema.safeParse({
    id: getString(formData, "chapterId"),
    parentId: getString(formData, "moduleId"),
  });
  const courseId = getString(formData, "courseId");

  if (!parsed.success || !parsed.data.parentId || !courseId) {
    redirect(buildRedirectUrl("/trainer/courses", "error", parsed.error?.issues[0]?.message ?? "Chapitre invalide."));
  }

  await assertCourseManagementAccess(courseId, session);

  await db.$transaction(async (tx) => {
    await tx.chapter.delete({ where: { id: parsed.data.id } });
    await normalizeChapterOrder(tx, parsed.data.parentId!);
  });

  revalidatePath(`/trainer/courses/${courseId}/edit`);
  redirect(buildRedirectUrl(`/trainer/courses/${courseId}/edit`, "success", "Chapitre supprimé."));
}

export async function importCourseArchiveAction(formData: FormData) {
  const session = await requireTrainerSession();
  const archive = getFile(formData, "archive");

  if (!archive) {
    redirect(buildRedirectUrl("/trainer/courses/import", "error", "Ajoutez une archive .zip avant de lancer l’import."));
  }

  let payload;
  try {
    payload = await extractImportPayload(archive);
  } catch (error) {
    redirect(buildRedirectUrl("/trainer/courses/import", "error", getErrorMessage(error, "Archive d’import invalide.")));
  }

  const [firstRow] = payload.rows;
  const slug = await createUniqueCourseSlug(firstRow.course_title);
  const category = firstRow.category_slug
    ? await db.category.findFirst({
        where: {
          slug: firstRow.category_slug,
          isActive: true,
        },
        select: { id: true, name: true },
      })
    : null;

  const moduleRows = new Map<number, { title: string; description?: string; chapters: CourseImportRow[] }>();
  for (const row of payload.rows) {
    const existing = moduleRows.get(row.module_order);
    if (existing) {
      existing.chapters.push(row);
      continue;
    }

    moduleRows.set(row.module_order, {
      title: row.module_title,
      description: row.module_description,
      chapters: [row],
    });
  }

  const course = await db.$transaction(async (tx) => {
    const createdCourse = await tx.course.create({
      data: {
        title: firstRow.course_title,
        slug,
        description: firstRow.course_description,
        status: firstRow.course_status,
        estimatedHours: firstRow.estimated_hours,
        categoryId: category?.id,
        trainerId: session.userId,
      },
      select: { id: true },
    });

    for (const [moduleOrder, moduleRow] of [...moduleRows.entries()].sort((left, right) => left[0] - right[0])) {
      const createdModule = await tx.module.create({
        data: {
          courseId: createdCourse.id,
          title: moduleRow.title,
          description: moduleRow.description,
          order: moduleOrder,
        },
        select: { id: true },
      });

      for (const chapterRow of [...moduleRow.chapters].sort((left, right) => left.chapter_order - right.chapter_order)) {
        const createdChapter = await tx.chapter.create({
          data: {
            moduleId: createdModule.id,
            title: chapterRow.chapter_title,
            content: chapterRow.content_file
              ? (payload.chapterFiles.get(chapterRow.content_file) ?? emptyMarkdownDocument)
              : emptyMarkdownDocument,
            videoUrl: chapterRow.video_url,
            videoType: deriveVideoType(chapterRow.video_url),
            estimatedMinutes: chapterRow.estimated_minutes,
            order: chapterRow.chapter_order,
          },
          select: { id: true },
        });

        if (chapterRow.quiz_file) {
          const quizFile = payload.quizFiles.get(chapterRow.quiz_file);

          if (!quizFile) {
            throw new Error(`Le fichier de quiz ${chapterRow.quiz_file} est introuvable dans l’archive.`);
          }

          const createdQuiz = await tx.quiz.create({
            data: {
              chapterId: createdChapter.id,
              title: quizFile.title,
              passingScore: quizFile.passing_score,
              xpReward: quizFile.xp_reward,
            },
            select: { id: true },
          });

          for (const [questionIndex, question] of quizFile.questions.entries()) {
            const createdQuestion = await tx.quizQuestion.create({
              data: {
                quizId: createdQuiz.id,
                questionText: question.question_text,
                type: question.type,
                order: questionIndex + 1,
              },
              select: { id: true },
            });

            for (const option of question.options) {
              await tx.quizOption.create({
                data: {
                  questionId: createdQuestion.id,
                  optionText: option.option_text,
                  isCorrect: option.is_correct,
                },
              });
            }
          }
        }
      }
    }

    return createdCourse;
  });

  revalidateCourseSurfaces(slug);

  const importMessage = category || !firstRow.category_slug
    ? "Cours importé avec succès."
    : "Cours importé avec succès. Catégorie ignorée car introuvable.";

  redirect(buildRedirectUrl(`/trainer/courses/${course.id}/edit`, "success", importMessage));
}
