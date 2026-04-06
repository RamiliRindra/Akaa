import { Prisma, SessionAccessPolicy, SessionEnrollmentStatus, SessionStatus } from "@prisma/client";
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
