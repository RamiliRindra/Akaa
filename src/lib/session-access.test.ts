import { SessionAccessPolicy, SessionEnrollmentStatus, SessionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildAccessibleCourseWhere, buildAccessibleProgramWhere } from "@/lib/session-access";

describe("session access helpers", () => {
  it("masque les contenus SESSION_ONLY aux visiteurs non authentifiés", () => {
    const where = buildAccessibleCourseWhere();

    expect(where).toEqual({
      sessions: {
        none: {
          accessPolicy: SessionAccessPolicy.SESSION_ONLY,
          status: {
            not: SessionStatus.CANCELLED,
          },
        },
      },
    });
  });

  it("autorise un cours réservé seulement pour un apprenant approuvé", () => {
    const where = buildAccessibleCourseWhere("learner-1");

    expect(where).toEqual({
      OR: [
        {
          sessions: {
            none: {
              accessPolicy: SessionAccessPolicy.SESSION_ONLY,
              status: {
                not: SessionStatus.CANCELLED,
              },
            },
          },
        },
        {
          sessions: {
            some: {
              accessPolicy: SessionAccessPolicy.SESSION_ONLY,
              status: {
                not: SessionStatus.CANCELLED,
              },
              enrollments: {
                some: {
                  userId: "learner-1",
                  status: SessionEnrollmentStatus.APPROVED,
                },
              },
            },
          },
        },
      ],
    });
  });

  it("applique la même règle d'accès aux parcours", () => {
    const where = buildAccessibleProgramWhere("learner-2");

    expect(where).toEqual({
      OR: [
        {
          sessions: {
            none: {
              accessPolicy: SessionAccessPolicy.SESSION_ONLY,
              status: {
                not: SessionStatus.CANCELLED,
              },
            },
          },
        },
        {
          sessions: {
            some: {
              accessPolicy: SessionAccessPolicy.SESSION_ONLY,
              status: {
                not: SessionStatus.CANCELLED,
              },
              enrollments: {
                some: {
                  userId: "learner-2",
                  status: SessionEnrollmentStatus.APPROVED,
                },
              },
            },
          },
        },
      ],
    });
  });
});
