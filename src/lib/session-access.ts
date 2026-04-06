import {
  Prisma,
  ProgramStatus,
  SessionAccessPolicy,
  SessionEnrollmentStatus,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { redirect } from "next/navigation";

const restrictedSessionWhere: Prisma.TrainingSessionWhereInput = {
  accessPolicy: SessionAccessPolicy.SESSION_ONLY,
  status: {
    not: SessionStatus.CANCELLED,
  },
};

export function buildAccessibleCourseWhere(userId?: string): Prisma.CourseWhereInput {
  if (!userId) {
    return {
      sessions: {
        none: restrictedSessionWhere,
      },
    };
  }

  return {
    OR: [
      {
        sessions: {
          none: restrictedSessionWhere,
        },
      },
      {
        sessions: {
          some: {
            ...restrictedSessionWhere,
            enrollments: {
              some: {
                userId,
                status: SessionEnrollmentStatus.APPROVED,
              },
            },
          },
        },
      },
    ],
  };
}

export function buildAccessibleProgramWhere(userId?: string): Prisma.TrainingProgramWhereInput {
  if (!userId) {
    return {
      sessions: {
        none: restrictedSessionWhere,
      },
    };
  }

  return {
    OR: [
      {
        sessions: {
          none: restrictedSessionWhere,
        },
      },
      {
        sessions: {
          some: {
            ...restrictedSessionWhere,
            enrollments: {
              some: {
                userId,
                status: SessionEnrollmentStatus.APPROVED,
              },
            },
          },
        },
      },
    ],
  };
}

export async function assertCourseAccessOrRedirect(courseId: string, userId: string) {
  const { db } = await import("@/lib/db");
  const count = await db.course.count({
    where: {
      id: courseId,
      ...buildAccessibleCourseWhere(userId),
    },
  });

  if (!count) {
    redirect(
      "/calendar?type=error&message=Cette+formation+est+r%C3%A9serv%C3%A9e+aux+inscrits+approuv%C3%A9s+sur+une+session.",
    );
  }
}

export async function assertProgramAccessOrRedirect(programId: string, userId: string) {
  const { db } = await import("@/lib/db");
  const count = await db.trainingProgram.count({
    where: {
      id: programId,
      ...buildAccessibleProgramWhere(userId),
    },
  });

  if (!count) {
    redirect(
      "/calendar?type=error&message=Ce+parcours+est+r%C3%A9serv%C3%A9+aux+inscrits+approuv%C3%A9s+sur+une+session.",
    );
  }
}

/**
 * Accès lecture fiche session (apprenant) : politique OPEN + accès au contenu lié, ou SESSION_ONLY + inscription APPROVED.
 */
export async function assertTrainingSessionLearnerViewFromRecord(
  session: {
    id: string;
    accessPolicy: SessionAccessPolicy;
    courseId: string | null;
    programId: string | null;
  },
  userId: string,
) {
  if (session.accessPolicy === SessionAccessPolicy.OPEN) {
    if (session.courseId) {
      await assertCourseAccessOrRedirect(session.courseId, userId);
      return;
    }
    if (session.programId) {
      await assertProgramAccessOrRedirect(session.programId, userId);
      return;
    }
    return;
  }

  const { db } = await import("@/lib/db");
  const approved = await db.sessionEnrollment.findFirst({
    where: {
      sessionId: session.id,
      userId,
      status: SessionEnrollmentStatus.APPROVED,
    },
    select: { id: true },
  });

  if (!approved) {
    redirect(
      "/calendar?type=error&message=Cette+session+est+r%C3%A9serv%C3%A9e+aux+participants+inscrits.",
    );
  }
}

const trainingSessionDetailInclude = {
  trainer: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, title: true, slug: true } },
  program: { select: { id: true, title: true, slug: true } },
  _count: {
    select: {
      enrollments: true,
      attendances: true,
    },
  },
} as const;

export async function getTrainingSessionForViewer(
  sessionId: string,
  userId: string,
  role: UserRole,
) {
  const { db } = await import("@/lib/db");
  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: trainingSessionDetailInclude,
  });

  if (!trainingSession) {
    return null;
  }

  if (role === UserRole.LEARNER) {
    await assertTrainingSessionLearnerViewFromRecord(
      {
        id: trainingSession.id,
        accessPolicy: trainingSession.accessPolicy,
        courseId: trainingSession.courseId,
        programId: trainingSession.programId,
      },
      userId,
    );
  }

  return trainingSession;
}

export async function getTrainingSessionForStaff(sessionId: string) {
  const { db } = await import("@/lib/db");
  return db.trainingSession.findUnique({
    where: { id: sessionId },
    include: trainingSessionDetailInclude,
  });
}

export async function getTrainingProgramDetailForViewer(programId: string, userId: string, role: UserRole) {
  const { db } = await import("@/lib/db");
  const program = await db.trainingProgram.findUnique({
    where: { id: programId },
    include: {
      trainer: { select: { id: true, name: true } },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            select: { id: true, title: true, slug: true, level: true, estimatedHours: true },
          },
        },
      },
      sessions: {
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
        },
      },
    },
  });

  if (!program) {
    return null;
  }

  if (role === UserRole.ADMIN || role === UserRole.TRAINER) {
    return program;
  }

  if (program.status !== ProgramStatus.PUBLISHED) {
    return null;
  }

  const allowed = await db.trainingProgram.count({
    where: {
      id: programId,
      ...buildAccessibleProgramWhere(userId),
    },
  });

  if (!allowed) {
    redirect(
      "/programs?type=error&message=Ce+parcours+n%27est+pas+accessible+avec+votre+profil.",
    );
  }

  return program;
}
