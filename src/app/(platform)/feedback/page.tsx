import { FeedbackKind, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { FormFeedback } from "@/components/feedback/form-feedback";
import { PlatformLearnerFeedbackForm } from "@/components/feedback/platform-learner-feedback-form";
import { PlatformTrainerFeedbackForms } from "@/components/feedback/platform-trainer-feedback-forms";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

type FeedbackPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const [feedback, session] = await Promise.all([searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const role = session.user.role;

  const learnerPlatform =
    role === UserRole.LEARNER
      ? await db.feedback.findFirst({
          where: { userId, kind: FeedbackKind.LEARNER_PLATFORM },
          select: { rating: true, comment: true },
        })
      : null;

  let trainerPlatform: { rating: number; comment: string | null } | null = null;
  let trainerCourses: { id: string; title: string }[] = [];
  let authoringInitialByCourseId: Record<string, { rating: number; comment: string | null }> = {};

  if (role === UserRole.TRAINER || role === UserRole.ADMIN) {
    trainerPlatform = await db.feedback.findFirst({
      where: { userId, kind: FeedbackKind.TRAINER_PLATFORM },
      select: { rating: true, comment: true },
    });

    trainerCourses = await db.course.findMany({
      where: role === UserRole.ADMIN ? {} : { trainerId: userId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });

    if (trainerCourses.length > 0) {
      const ids = trainerCourses.map((c) => c.id);
      const authoringRows = await db.feedback.findMany({
        where: {
          userId,
          kind: FeedbackKind.TRAINER_AUTHORING,
          courseId: { in: ids },
        },
        select: { courseId: true, rating: true, comment: true },
      });
      authoringInitialByCourseId = Object.fromEntries(
        authoringRows.map((r) => [r.courseId as string, { rating: r.rating, comment: r.comment }]),
      );
    }
  }

  return (
    <section className="space-y-8">
      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="space-y-2">
        <p className="editorial-eyebrow">Vos retours</p>
        <h1 className="font-display text-3xl font-black tracking-tight text-[var(--color-text)] sm:text-5xl">Avis</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--color-text)]/72 sm:text-base">
          Vos notes aident à améliorer les cours et la plateforme. Les retours sont traités en interne pour faire
          évoluer le produit.
        </p>
      </div>

      {role === UserRole.LEARNER ? (
        <PlatformLearnerFeedbackForm
          initialRating={learnerPlatform?.rating ?? null}
          initialComment={learnerPlatform?.comment ?? null}
        />
      ) : null}

      {role === UserRole.TRAINER || role === UserRole.ADMIN ? (
        <PlatformTrainerFeedbackForms
          courses={trainerCourses}
          authoringInitialByCourseId={authoringInitialByCourseId}
          platformInitialRating={trainerPlatform?.rating ?? null}
          platformInitialComment={trainerPlatform?.comment ?? null}
        />
      ) : null}
    </section>
  );
}
