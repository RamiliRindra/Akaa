"use server";

import { FeedbackKind, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildFeedbackTargetKey } from "@/lib/feedback-keys";
import { assertCourseAccessOrRedirect } from "@/lib/session-access";
import {
  learnerCourseFeedbackSchema,
  learnerPlatformFeedbackSchema,
  trainerAuthoringFeedbackSchema,
  trainerPlatformFeedbackSchema,
} from "@/lib/validations/feedback";

function buildRedirect(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({ type, message });
  return path.includes("?") ? `${path}&${params.toString()}` : `${path}?${params.toString()}`;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitLearnerCourseFeedbackAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.LEARNER) {
    redirect(buildRedirect("/courses", "error", "Seuls les apprenants peuvent noter un cours."));
  }

  const parsed = learnerCourseFeedbackSchema.safeParse({
    courseId: getString(formData, "courseId"),
    rating: getString(formData, "rating"),
    comment: getString(formData, "comment"),
  });

  if (!parsed.success) {
    const slug = getString(formData, "courseSlug");
    redirect(buildRedirect(slug ? `/courses/${slug}` : "/courses", "error", parsed.error.issues[0]?.message ?? "Données invalides."));
  }

  await assertCourseAccessOrRedirect(parsed.data.courseId, session.user.id);

  const course = await db.course.findFirst({
    where: { id: parsed.data.courseId },
    select: { slug: true },
  });
  if (!course) {
    redirect(buildRedirect("/courses", "error", "Cours introuvable."));
  }

  const targetKey = buildFeedbackTargetKey(FeedbackKind.LEARNER_COURSE, parsed.data.courseId);

  await db.feedback.upsert({
    where: {
      userId_targetKey: {
        userId: session.user.id,
        targetKey,
      },
    },
    create: {
      userId: session.user.id,
      kind: FeedbackKind.LEARNER_COURSE,
      courseId: parsed.data.courseId,
      targetKey,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/feedback");
  redirect(buildRedirect(`/courses/${course.slug}`, "success", "Merci, votre avis sur le cours a été enregistré."));
}

export async function submitLearnerPlatformFeedbackAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.LEARNER) {
    redirect(buildRedirect("/feedback", "error", "Ce formulaire est réservé aux apprenants."));
  }

  const parsed = learnerPlatformFeedbackSchema.safeParse({
    rating: getString(formData, "rating"),
    comment: getString(formData, "comment"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/feedback", "error", parsed.error.issues[0]?.message ?? "Données invalides."));
  }

  const targetKey = buildFeedbackTargetKey(FeedbackKind.LEARNER_PLATFORM);

  await db.feedback.upsert({
    where: {
      userId_targetKey: {
        userId: session.user.id,
        targetKey,
      },
    },
    create: {
      userId: session.user.id,
      kind: FeedbackKind.LEARNER_PLATFORM,
      courseId: null,
      targetKey,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  revalidatePath("/feedback");
  redirect(buildRedirect("/feedback", "success", "Merci pour votre avis sur la plateforme."));
}

export async function submitTrainerAuthoringFeedbackAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.TRAINER && session.user.role !== UserRole.ADMIN) {
    redirect(buildRedirect("/feedback", "error", "Ce formulaire est réservé aux formateurs."));
  }

  const parsed = trainerAuthoringFeedbackSchema.safeParse({
    courseId: getString(formData, "courseId"),
    rating: getString(formData, "rating"),
    comment: getString(formData, "comment"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/feedback", "error", parsed.error.issues[0]?.message ?? "Données invalides."));
  }

  const course = await db.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { trainerId: true, slug: true },
  });

  if (!course) {
    redirect(buildRedirect("/feedback", "error", "Cours introuvable."));
  }

  if (session.user.role === UserRole.TRAINER && course.trainerId !== session.user.id) {
    redirect(buildRedirect("/feedback", "error", "Vous ne pouvez noter que vos propres cours."));
  }

  const targetKey = buildFeedbackTargetKey(FeedbackKind.TRAINER_AUTHORING, parsed.data.courseId);

  await db.feedback.upsert({
    where: {
      userId_targetKey: {
        userId: session.user.id,
        targetKey,
      },
    },
    create: {
      userId: session.user.id,
      kind: FeedbackKind.TRAINER_AUTHORING,
      courseId: parsed.data.courseId,
      targetKey,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  revalidatePath("/feedback");
  revalidatePath(`/courses/${course.slug}`);
  redirect(buildRedirect("/feedback", "success", "Votre avis sur la création de ce cours a été enregistré."));
}

export async function submitTrainerPlatformFeedbackAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== UserRole.TRAINER && session.user.role !== UserRole.ADMIN) {
    redirect(buildRedirect("/feedback", "error", "Ce formulaire est réservé aux formateurs."));
  }

  const parsed = trainerPlatformFeedbackSchema.safeParse({
    rating: getString(formData, "rating"),
    comment: getString(formData, "comment"),
  });

  if (!parsed.success) {
    redirect(buildRedirect("/feedback", "error", parsed.error.issues[0]?.message ?? "Données invalides."));
  }

  const targetKey = buildFeedbackTargetKey(FeedbackKind.TRAINER_PLATFORM);

  await db.feedback.upsert({
    where: {
      userId_targetKey: {
        userId: session.user.id,
        targetKey,
      },
    },
    create: {
      userId: session.user.id,
      kind: FeedbackKind.TRAINER_PLATFORM,
      courseId: null,
      targetKey,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  revalidatePath("/feedback");
  redirect(buildRedirect("/feedback", "success", "Merci pour votre avis sur l’outil formateur."));
}
