import { FeedbackKind } from "@prisma/client";

/** Clé stable pour contrainte d’unicité (un avis par utilisateur et par cible). */
export function buildFeedbackTargetKey(kind: FeedbackKind, courseId?: string | null): string {
  switch (kind) {
    case FeedbackKind.LEARNER_COURSE:
    case FeedbackKind.TRAINER_AUTHORING:
      if (!courseId) {
        throw new Error("courseId requis pour ce type d’avis.");
      }
      return `${kind}:${courseId}`;
    case FeedbackKind.LEARNER_PLATFORM:
      return "LEARNER_PLATFORM";
    case FeedbackKind.TRAINER_PLATFORM:
      return "TRAINER_PLATFORM";
  }
}
