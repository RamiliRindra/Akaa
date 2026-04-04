"use server";

import { CourseStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { deriveVideoType, emptyRichTextDocument } from "@/lib/content";
import { db } from "@/lib/db";
import {
  chapterFormSchema,
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

function revalidateCourseSurfaces(slug?: string) {
  revalidatePath("/trainer/courses");
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
      content: emptyRichTextDocument as Prisma.InputJsonValue,
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
      content: JSON.parse(parsed.data.content) as Prisma.InputJsonValue,
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
