import { FeedbackKind } from "@prisma/client";
import { z } from "zod";

const ratingSchema = z.coerce
  .number({ message: "La note est obligatoire." })
  .int("La note doit être un entier.")
  .min(1, "La note minimale est 1.")
  .max(5, "La note maximale est 5.");

const optionalComment = z
  .string()
  .trim()
  .max(2000, "Le commentaire ne peut pas dépasser 2000 caractères.")
  .transform((value) => (value.length ? value : undefined))
  .optional();

export const learnerCourseFeedbackSchema = z.object({
  courseId: z.string().uuid("Cours invalide."),
  rating: ratingSchema,
  comment: optionalComment,
});

export const learnerPlatformFeedbackSchema = z.object({
  rating: ratingSchema,
  comment: optionalComment,
});

export const trainerAuthoringFeedbackSchema = z.object({
  courseId: z.string().uuid("Cours invalide."),
  rating: ratingSchema,
  comment: optionalComment,
});

export const trainerPlatformFeedbackSchema = z.object({
  rating: ratingSchema,
  comment: optionalComment,
});

export type LearnerCourseFeedbackInput = z.infer<typeof learnerCourseFeedbackSchema>;
export type LearnerPlatformFeedbackInput = z.infer<typeof learnerPlatformFeedbackSchema>;

export const feedbackKindSchema = z.nativeEnum(FeedbackKind);
