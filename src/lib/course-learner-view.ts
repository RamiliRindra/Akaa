import { CourseStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Fiche / parcours apprenant : cours publié, ou brouillon/archivé visible uniquement
 * par le formateur propriétaire ou un admin (aperçu depuis l’édition).
 */
export async function findCourseForPublicOrStaffPreview<S extends Prisma.CourseSelect>(
  slug: string,
  sessionUser: { id: string; role: UserRole } | null | undefined,
  select: S,
): Promise<
  | { course: Prisma.CourseGetPayload<{ select: S }>; isStaffPreview: true }
  | { course: Prisma.CourseGetPayload<{ select: S }>; isStaffPreview: false }
  | { course: null; isStaffPreview: false }
> {
  const published = await db.course.findFirst({
    where: { slug, status: CourseStatus.PUBLISHED },
    select,
  });
  if (published) {
    return { course: published, isStaffPreview: false };
  }

  if (!sessionUser) {
    return { course: null, isStaffPreview: false };
  }

  if (sessionUser.role !== UserRole.TRAINER && sessionUser.role !== UserRole.ADMIN) {
    return { course: null, isStaffPreview: false };
  }

  const where: Prisma.CourseWhereInput = {
    slug,
    status: { not: CourseStatus.PUBLISHED },
    ...(sessionUser.role === UserRole.TRAINER ? { trainerId: sessionUser.id } : {}),
  };

  const draft = await db.course.findFirst({ where, select });
  if (!draft) {
    return { course: null, isStaffPreview: false };
  }

  return { course: draft, isStaffPreview: true };
}

export function shouldSkipLearnerAccessRulesForPreview(isStaffPreview: boolean, role: UserRole | undefined): boolean {
  return isStaffPreview && (role === UserRole.TRAINER || role === UserRole.ADMIN);
}
