"use server";

import {
  NotificationType,
  ProgramStatus,
  SessionAccessPolicy,
  SessionEnrollmentStatus,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applySessionAttendanceGamification } from "@/lib/gamification";
import { expandRecurrenceOccurrences } from "@/lib/recurrence";
import { formatDateTime } from "@/lib/training";
import { slugify } from "@/lib/utils";
import {
  programDeleteSchema,
  sessionAttendanceSchema,
  sessionDeleteSchema,
  sessionEnrollmentCancelSchema,
  sessionEnrollmentRequestSchema,
  sessionEnrollmentReviewSchema,
  trainingProgramFormSchema,
  trainingSessionFormSchema,
} from "@/lib/validations/training";

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

function getStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getSafeReturnTo(formData: FormData, fallback: string) {
  const value = getString(formData, "returnTo").trim();
  if (!value.startsWith("/")) {
    return fallback;
  }

  return value;
}

async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

async function requireTrainerOrAdmin() {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.TRAINER && user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return user;
}

async function requireAdmin() {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return user;
}

async function createNotification({
  userId,
  type,
  title,
  message,
  relatedUrl,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedUrl?: string;
}) {
  await db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      relatedUrl,
    },
  });
}

function revalidateTrainingSurfaces() {
  revalidatePath("/calendar");
  revalidatePath("/programs");
  revalidatePath("/notifications");
  revalidatePath("/trainer/calendar");
  revalidatePath("/trainer/programs");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/trainer/courses");
  revalidatePath("/trainer/notifications");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/programs");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/notifications");
  revalidatePath("/calendar/sessions");
  revalidatePath("/programs");
}

async function assertSessionOwnership(sessionId: string, actorId: string, role: UserRole) {
  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      trainerId: true,
      title: true,
      startsAt: true,
      xpReward: true,
    },
  });

  if (!session) {
    throw new Error("Session introuvable.");
  }

  if (role !== UserRole.ADMIN && session.trainerId !== actorId) {
    throw new Error("Vous n'avez pas accès à cette session.");
  }

  return session;
}

async function buildUniqueProgramSlug(title: string, programId?: string) {
  const baseSlug = slugify(title) || "parcours";
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.trainingProgram.findFirst({
      where: {
        slug: candidate,
        ...(programId ? { id: { not: programId } } : undefined),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

async function resolveAssignableOwnerId({
  requestedId,
  actorId,
  actorRole,
}: {
  requestedId?: string;
  actorId: string;
  actorRole: UserRole;
}) {
  if (actorRole !== UserRole.ADMIN) {
    return actorId;
  }

  const targetId = requestedId?.trim() || actorId;
  const assignableUser = await db.user.findFirst({
    where: {
      id: targetId,
      isActive: true,
      role: {
        in: [UserRole.TRAINER, UserRole.ADMIN],
      },
    },
    select: { id: true },
  });

  if (!assignableUser) {
    throw new Error("Le responsable sélectionné est invalide.");
  }

  return assignableUser.id;
}

async function assertAccessibleCourseIds({
  actorId,
  actorRole,
  courseIds,
}: {
  actorId: string;
  actorRole: UserRole;
  courseIds: string[];
}) {
  if (!courseIds.length) {
    return;
  }

  const count = await db.course.count({
    where: {
      id: { in: courseIds },
      ...(actorRole === UserRole.ADMIN ? undefined : { trainerId: actorId }),
    },
  });

  if (count !== courseIds.length) {
    throw new Error("La sélection de cours contient des éléments non accessibles.");
  }
}

async function assertAccessibleSessionTargets({
  actorId,
  actorRole,
  courseId,
  programId,
}: {
  actorId: string;
  actorRole: UserRole;
  courseId?: string;
  programId?: string;
}) {
  if (courseId) {
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        ...(actorRole === UserRole.ADMIN ? undefined : { trainerId: actorId }),
      },
      select: { id: true },
    });

    if (!course) {
      throw new Error("Le cours sélectionné est invalide.");
    }
  }

  if (programId) {
    const program = await db.trainingProgram.findFirst({
      where: {
        id: programId,
        ...(actorRole === UserRole.ADMIN ? undefined : { trainerId: actorId }),
      },
      select: { id: true },
    });

    if (!program) {
      throw new Error("Le parcours sélectionné est invalide.");
    }
  }
}

export async function createTrainingProgramAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/programs" : "/trainer/programs");

  const parsed = trainingProgramFormSchema.safeParse({
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    trainerId: getString(formData, "trainerId"),
    courseIds: getStringArray(formData, "courseIds"),
    status: getString(formData, "status") || ProgramStatus.DRAFT,
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Parcours invalide."));
  }

  const slug = await buildUniqueProgramSlug(parsed.data.title);
  let trainerId: string;

  try {
    trainerId = await resolveAssignableOwnerId({
      requestedId: parsed.data.trainerId,
      actorId: user.id,
      actorRole: user.role,
    });
    await assertAccessibleCourseIds({
      actorId: user.id,
      actorRole: user.role,
      courseIds: parsed.data.courseIds,
    });
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Parcours invalide."));
  }

  await db.trainingProgram.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      status: parsed.data.status,
      trainerId,
      courses: {
        create: parsed.data.courseIds.map((courseId, index) => ({
          courseId,
          order: index + 1,
        })),
      },
    },
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "Le parcours a été créé."));
}

export async function updateTrainingProgramAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/programs" : "/trainer/programs");
  const programId = getString(formData, "programId");

  const parsed = trainingProgramFormSchema.safeParse({
    programId,
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    trainerId: getString(formData, "trainerId"),
    courseIds: getStringArray(formData, "courseIds"),
    status: getString(formData, "status"),
  });

  if (!parsed.success || !parsed.data.programId) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error?.issues[0]?.message ?? "Parcours invalide."));
  }

  const existing = await db.trainingProgram.findUnique({
    where: { id: parsed.data.programId },
    select: { id: true, trainerId: true },
  });

  if (!existing) {
    redirect(buildRedirectUrl(returnTo, "error", "Parcours introuvable."));
  }

  if (user.role !== UserRole.ADMIN && existing.trainerId !== user.id) {
    redirect(buildRedirectUrl(returnTo, "error", "Vous ne pouvez modifier que vos propres parcours."));
  }

  const slug = await buildUniqueProgramSlug(parsed.data.title, parsed.data.programId);
  let trainerId: string;

  try {
    trainerId = await resolveAssignableOwnerId({
      requestedId: parsed.data.trainerId,
      actorId: user.id,
      actorRole: user.role,
    });
    await assertAccessibleCourseIds({
      actorId: user.id,
      actorRole: user.role,
      courseIds: parsed.data.courseIds,
    });
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Parcours invalide."));
  }

  await db.trainingProgram.update({
    where: { id: parsed.data.programId },
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      status: parsed.data.status,
      trainerId,
      courses: {
        deleteMany: {},
        create: parsed.data.courseIds.map((courseId, index) => ({
          courseId,
          order: index + 1,
        })),
      },
    },
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "Le parcours a été mis à jour."));
}

export async function deleteTrainingProgramAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/programs" : "/trainer/programs");

  const parsed = programDeleteSchema.safeParse({
    programId: getString(formData, "programId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Parcours invalide."));
  }

  const existing = await db.trainingProgram.findUnique({
    where: { id: parsed.data.programId },
    select: { trainerId: true },
  });

  if (!existing) {
    redirect(buildRedirectUrl(returnTo, "error", "Parcours introuvable."));
  }

  if (user.role !== UserRole.ADMIN && existing.trainerId !== user.id) {
    redirect(buildRedirectUrl(returnTo, "error", "Vous ne pouvez supprimer que vos propres parcours."));
  }

  await db.trainingProgram.delete({
    where: { id: parsed.data.programId },
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "Le parcours a été supprimé."));
}

export async function createTrainingSessionAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/calendar" : "/trainer/calendar");

  const parsed = trainingSessionFormSchema.safeParse({
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    status: getString(formData, "status") || SessionStatus.SCHEDULED,
    accessPolicy: getString(formData, "accessPolicy") || SessionAccessPolicy.OPEN,
    startsAt: getString(formData, "startsAt"),
    endsAt: getString(formData, "endsAt"),
    isAllDay: getString(formData, "isAllDay"),
    location: getString(formData, "location"),
    meetingUrl: getString(formData, "meetingUrl"),
    recurrenceRule: getString(formData, "recurrenceRule"),
    reminderMinutes: getString(formData, "reminderMinutes") || "1440",
    xpReward: getString(formData, "xpReward") || "30",
    courseId: getString(formData, "courseId"),
    programId: getString(formData, "programId"),
    trainerId: getString(formData, "trainerId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Session invalide."));
  }

  let trainerId: string;
  try {
    trainerId = await resolveAssignableOwnerId({
      requestedId: parsed.data.trainerId,
      actorId: user.id,
      actorRole: user.role,
    });
    await assertAccessibleSessionTargets({
      actorId: user.id,
      actorRole: user.role,
      courseId: parsed.data.courseId,
      programId: parsed.data.programId,
    });
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Session invalide."));
  }

  let occurrences;
  try {
    occurrences = expandRecurrenceOccurrences(
      parsed.data.startsAt,
      parsed.data.endsAt,
      parsed.data.recurrenceRule,
    );
  } catch (error) {
    redirect(
      buildRedirectUrl(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Règle de récurrence invalide.",
      ),
    );
  }

  const seriesId = occurrences.length > 1 ? randomUUID() : null;

  await db.$transaction(
    occurrences.map((occurrence) =>
      db.trainingSession.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          status: parsed.data.status,
          accessPolicy: parsed.data.accessPolicy,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          isAllDay: parsed.data.isAllDay,
          location: parsed.data.location,
          meetingUrl: parsed.data.meetingUrl,
          recurrenceRule: null,
          recurrenceSeriesId: seriesId,
          reminderMinutes: parsed.data.reminderMinutes,
          xpReward: parsed.data.xpReward,
          courseId: parsed.data.courseId,
          programId: parsed.data.programId,
          trainerId,
        },
      }),
    ),
  );

  revalidateTrainingSurfaces();
  const successMessage =
    occurrences.length > 1
      ? `${occurrences.length} sessions créées à partir de la récurrence.`
      : "La session a été créée.";
  redirect(buildRedirectUrl(returnTo, "success", successMessage));
}

export async function updateTrainingSessionAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/calendar" : "/trainer/calendar");

  const parsed = trainingSessionFormSchema.safeParse({
    sessionId: getString(formData, "sessionId"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    status: getString(formData, "status"),
    accessPolicy: getString(formData, "accessPolicy"),
    startsAt: getString(formData, "startsAt"),
    endsAt: getString(formData, "endsAt"),
    isAllDay: getString(formData, "isAllDay"),
    location: getString(formData, "location"),
    meetingUrl: getString(formData, "meetingUrl"),
    recurrenceRule: getString(formData, "recurrenceRule"),
    reminderMinutes: getString(formData, "reminderMinutes"),
    xpReward: getString(formData, "xpReward"),
    courseId: getString(formData, "courseId"),
    programId: getString(formData, "programId"),
    trainerId: getString(formData, "trainerId"),
  });

  if (!parsed.success || !parsed.data.sessionId) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error?.issues[0]?.message ?? "Session invalide."));
  }

  try {
    await assertSessionOwnership(parsed.data.sessionId, user.id, user.role);
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Session inaccessible."));
  }

  let trainerId: string;
  try {
    trainerId = await resolveAssignableOwnerId({
      requestedId: parsed.data.trainerId,
      actorId: user.id,
      actorRole: user.role,
    });
    await assertAccessibleSessionTargets({
      actorId: user.id,
      actorRole: user.role,
      courseId: parsed.data.courseId,
      programId: parsed.data.programId,
    });
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Session invalide."));
  }

  await db.trainingSession.update({
    where: { id: parsed.data.sessionId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      accessPolicy: parsed.data.accessPolicy,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      isAllDay: parsed.data.isAllDay,
      location: parsed.data.location,
      meetingUrl: parsed.data.meetingUrl,
      recurrenceRule: parsed.data.recurrenceRule,
      reminderMinutes: parsed.data.reminderMinutes,
      xpReward: parsed.data.xpReward,
      courseId: parsed.data.courseId,
      programId: parsed.data.programId,
      trainerId,
    },
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "La session a été mise à jour."));
}

export async function deleteTrainingSessionAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/calendar" : "/trainer/calendar");

  const parsed = sessionDeleteSchema.safeParse({
    sessionId: getString(formData, "sessionId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Session invalide."));
  }

  try {
    await assertSessionOwnership(parsed.data.sessionId, user.id, user.role);
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Session inaccessible."));
  }

  await db.trainingSession.delete({
    where: { id: parsed.data.sessionId },
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "La session a été supprimée."));
}

export async function requestSessionEnrollmentAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const returnTo = getSafeReturnTo(formData, "/calendar");

  const parsed = sessionEnrollmentRequestSchema.safeParse({
    sessionId: getString(formData, "sessionId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Session invalide."));
  }

  const session = await db.trainingSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      trainerId: true,
    },
  });

  if (!session || session.status !== SessionStatus.SCHEDULED) {
    redirect(buildRedirectUrl(returnTo, "error", "Cette session n'est plus disponible."));
  }

  if (session.startsAt <= new Date()) {
    redirect(buildRedirectUrl(returnTo, "error", "Cette session a déjà commencé."));
  }

  const existing = await db.sessionEnrollment.findUnique({
    where: {
      userId_sessionId: {
        userId: user.id,
        sessionId: parsed.data.sessionId,
      },
    },
  });

  if (existing && (existing.status === SessionEnrollmentStatus.PENDING || existing.status === SessionEnrollmentStatus.APPROVED)) {
    redirect(buildRedirectUrl(returnTo, "error", "Vous êtes déjà inscrit ou en attente sur cette session."));
  }

  if (existing) {
    await db.sessionEnrollment.update({
      where: { id: existing.id },
      data: { status: SessionEnrollmentStatus.PENDING },
    });
  } else {
    await db.sessionEnrollment.create({
      data: {
        userId: user.id,
        sessionId: parsed.data.sessionId,
        status: SessionEnrollmentStatus.PENDING,
      },
    });
  }

  await createNotification({
    userId: session.trainerId,
    type: NotificationType.SESSION_REQUEST,
    title: "Nouvelle demande d'inscription",
    message: `${user.name ?? "Un apprenant"} a demandé une inscription à la session « ${session.title} ».`,
    relatedUrl: "/trainer/calendar",
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "Votre demande d'inscription a été envoyée au formateur."));
}

export async function cancelSessionEnrollmentAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const returnTo = getSafeReturnTo(formData, "/calendar");

  const parsed = sessionEnrollmentCancelSchema.safeParse({
    enrollmentId: getString(formData, "enrollmentId"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Inscription invalide."));
  }

  const enrollment = await db.sessionEnrollment.findUnique({
    where: { id: parsed.data.enrollmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      session: {
        select: {
          title: true,
          startsAt: true,
          trainerId: true,
        },
      },
    },
  });

  if (!enrollment || enrollment.userId !== user.id) {
    redirect(buildRedirectUrl(returnTo, "error", "Inscription introuvable."));
  }

  if (enrollment.session.startsAt <= new Date()) {
    redirect(buildRedirectUrl(returnTo, "error", "Cette session a déjà commencé."));
  }

  await db.sessionEnrollment.update({
    where: { id: enrollment.id },
    data: { status: SessionEnrollmentStatus.CANCELLED },
  });

  await createNotification({
    userId: enrollment.session.trainerId,
    type: NotificationType.SESSION_CANCELLED,
    title: "Inscription annulée",
    message: `${user.name ?? "Un apprenant"} a annulé sa demande pour la session « ${enrollment.session.title} ».`,
    relatedUrl: "/trainer/calendar",
  });

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "Votre inscription a été annulée."));
}

export async function reviewSessionEnrollmentAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/calendar" : "/trainer/calendar");

  const parsed = sessionEnrollmentReviewSchema.safeParse({
    enrollmentId: getString(formData, "enrollmentId"),
    status: getString(formData, "status"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Validation invalide."));
  }

  const enrollment = await db.sessionEnrollment.findUnique({
    where: { id: parsed.data.enrollmentId },
    select: {
      id: true,
      userId: true,
      session: {
        select: {
          id: true,
          title: true,
          trainerId: true,
        },
      },
    },
  });

  if (!enrollment) {
    redirect(buildRedirectUrl(returnTo, "error", "Inscription introuvable."));
  }

  if (user.role !== UserRole.ADMIN && enrollment.session.trainerId !== user.id) {
    redirect(buildRedirectUrl(returnTo, "error", "Vous ne pouvez traiter que vos propres sessions."));
  }

  await db.sessionEnrollment.update({
    where: { id: enrollment.id },
    data: { status: parsed.data.status },
  });

  await createNotification({
    userId: enrollment.userId,
    type:
      parsed.data.status === SessionEnrollmentStatus.APPROVED
        ? NotificationType.SESSION_APPROVED
        : NotificationType.SESSION_REJECTED,
    title:
      parsed.data.status === SessionEnrollmentStatus.APPROVED
        ? "Inscription approuvée"
        : "Inscription refusée",
    message:
      parsed.data.status === SessionEnrollmentStatus.APPROVED
        ? `Votre inscription à la session « ${enrollment.session.title} » a été approuvée.`
        : `Votre inscription à la session « ${enrollment.session.title} » a été refusée.`,
    relatedUrl: "/calendar",
  });

  revalidateTrainingSurfaces();
  redirect(
    buildRedirectUrl(
      returnTo,
      "success",
      parsed.data.status === SessionEnrollmentStatus.APPROVED
        ? "La demande d'inscription a été approuvée."
        : "La demande d'inscription a été refusée.",
    ),
  );
}

export async function markSessionAttendanceAction(formData: FormData) {
  const user = await requireTrainerOrAdmin();
  const returnTo = getSafeReturnTo(formData, user.role === UserRole.ADMIN ? "/admin/calendar" : "/trainer/calendar");

  const parsed = sessionAttendanceSchema.safeParse({
    sessionId: getString(formData, "sessionId"),
    userId: getString(formData, "userId"),
    status: getString(formData, "status"),
  });

  if (!parsed.success) {
    redirect(buildRedirectUrl(returnTo, "error", parsed.error.issues[0]?.message ?? "Pointage invalide."));
  }

  let session;
  try {
    session = await assertSessionOwnership(parsed.data.sessionId, user.id, user.role);
  } catch (error) {
    redirect(buildRedirectUrl(returnTo, "error", error instanceof Error ? error.message : "Session inaccessible."));
  }

  const enrollment = await db.sessionEnrollment.findUnique({
    where: {
      userId_sessionId: {
        userId: parsed.data.userId,
        sessionId: parsed.data.sessionId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  if (!enrollment || enrollment.status !== SessionEnrollmentStatus.APPROVED) {
    redirect(buildRedirectUrl(returnTo, "error", "Seuls les apprenants approuvés peuvent être pointés."));
  }

  await db.sessionAttendance.upsert({
    where: {
      userId_sessionId: {
        userId: parsed.data.userId,
        sessionId: parsed.data.sessionId,
      },
    },
    update: {
      status: parsed.data.status,
      markedBy: user.id,
      markedAt: new Date(),
    },
    create: {
      userId: parsed.data.userId,
      sessionId: parsed.data.sessionId,
      status: parsed.data.status,
      markedBy: user.id,
    },
  });

  if (enrollment.user.role === UserRole.LEARNER) {
    const summary = await db.$transaction((tx) =>
      applySessionAttendanceGamification(tx, {
        userId: parsed.data.userId,
        sessionId: parsed.data.sessionId,
        sessionTitle: session.title,
        xpReward: session.xpReward,
        attendanceStatus: parsed.data.status,
      }),
    );

    if (summary.xpGained > 0) {
      await createNotification({
        userId: parsed.data.userId,
        type: NotificationType.XP_GAINED,
        title: "XP gagnée sur session",
        message: `Vous avez gagné ${summary.xpGained} XP grâce à votre présence à la session « ${session.title} ».`,
        relatedUrl: `/calendar?sessionId=${parsed.data.sessionId}`,
      });
    }

    if (summary.unlockedBadges.length > 0) {
      await createNotification({
        userId: parsed.data.userId,
        type: NotificationType.BADGE_UNLOCKED,
        title: "Nouveau badge débloqué",
        message: `Badge${summary.unlockedBadges.length > 1 ? "s débloqués" : " débloqué"} : ${summary.unlockedBadges.join(", ")}.`,
        relatedUrl: "/profile",
      });
    }
  }

  revalidateTrainingSurfaces();
  redirect(buildRedirectUrl(returnTo, "success", "La présence a été enregistrée."));
}

export async function markNotificationReadAction(notificationId: string, returnTo = "/calendar") {
  await markNotificationReadInlineAction(notificationId);
  redirect(buildRedirectUrl(returnTo, "success", "Notification marquée comme lue."));
}

export async function markNotificationReadInlineAction(notificationId: string) {
  const user = await requireAuthenticatedUser();

  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: {
      isRead: true,
    },
  });

  revalidateTrainingSurfaces();
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/profile");
}

export async function markAllNotificationsReadAction() {
  const user = await requireAuthenticatedUser();

  await db.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  revalidateTrainingSurfaces();
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/profile");
}

export async function triggerPendingSessionRemindersAction() {
  const user = await requireAuthenticatedUser();

  if (user.role !== UserRole.LEARNER) {
    return 0;
  }

  const now = new Date();
  const approvedEnrollments = await db.sessionEnrollment.findMany({
    where: {
      userId: user.id,
      status: SessionEnrollmentStatus.APPROVED,
      session: {
        status: SessionStatus.SCHEDULED,
        startsAt: {
          gt: now,
        },
      },
    },
    select: {
      session: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          reminderMinutes: true,
          course: {
            select: {
              title: true,
            },
          },
          program: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const dueSessions = approvedEnrollments
    .map(({ session }) => session)
    .filter((session) => {
      const reminderAt = new Date(session.startsAt.getTime() - session.reminderMinutes * 60_000);
      return reminderAt <= now;
    });

  if (!dueSessions.length) {
    return 0;
  }

  const reminderUrls = dueSessions.map((session) => `/calendar?sessionId=${session.id}`);
  const existingReminders = await db.notification.findMany({
    where: {
      userId: user.id,
      type: NotificationType.SESSION_REMINDER,
      relatedUrl: {
        in: reminderUrls,
      },
    },
    select: {
      relatedUrl: true,
    },
  });

  const existingReminderUrls = new Set(
    existingReminders.map((notification) => notification.relatedUrl).filter((value): value is string => Boolean(value)),
  );

  const notificationsToCreate = dueSessions
    .filter((session) => !existingReminderUrls.has(`/calendar?sessionId=${session.id}`))
    .map((session) => {
      const targetLabel = session.course?.title ?? session.program?.title;
      const startLabel = formatDateTime(session.startsAt);

      return {
        userId: user.id,
        type: NotificationType.SESSION_REMINDER,
        title: "Rappel de session",
        message: targetLabel
          ? `Votre session « ${session.title} » liée à « ${targetLabel} » démarre le ${startLabel}.`
          : `Votre session « ${session.title} » démarre le ${startLabel}.`,
        relatedUrl: `/calendar?sessionId=${session.id}`,
      };
    });

  if (!notificationsToCreate.length) {
    return 0;
  }

  await db.notification.createMany({
    data: notificationsToCreate,
  });

  revalidateTrainingSurfaces();
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/profile");

  return notificationsToCreate.length;
}

export async function deleteTrainingProgramAsAdminAction(formData: FormData) {
  await requireAdmin();
  return deleteTrainingProgramAction(formData);
}
