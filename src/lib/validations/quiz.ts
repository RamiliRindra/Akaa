import { QuizQuestionType } from "@prisma/client";
import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .refine((value) => !value || z.uuid().safeParse(value).success, "Identifiant invalide.")
  .optional();

const requiredUuid = (message: string) => z.uuid(message);

const positiveIntegerString = (message: string) =>
  z
    .string()
    .trim()
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0, message);

export const quizFormSchema = z.object({
  quizId: optionalUuid,
  courseId: requiredUuid("Cours invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
  title: z.string().trim().min(3, "Le titre du quiz est requis.").max(255, "Le titre du quiz est trop long."),
  passingScore: positiveIntegerString("Le score de réussite doit être un entier positif.")
    .refine((value) => value <= 100, "Le score de réussite ne peut pas dépasser 100."),
  xpReward: positiveIntegerString("La récompense XP doit être un entier positif."),
});

export const quizQuestionFormSchema = z.object({
  questionId: optionalUuid,
  quizId: requiredUuid("Quiz invalide."),
  courseId: requiredUuid("Cours invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
  questionText: z.string().trim().min(5, "La question doit contenir au moins 5 caractères."),
  type: z.nativeEnum(QuizQuestionType, {
    error: "Le type de question est invalide.",
  }),
});

export const quizOptionFormSchema = z.object({
  optionId: optionalUuid,
  questionId: requiredUuid("Question invalide."),
  quizId: requiredUuid("Quiz invalide."),
  courseId: requiredUuid("Cours invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
  optionText: z.string().trim().min(1, "Le texte de la réponse est requis."),
  isCorrect: z.boolean(),
});

export const moveQuizQuestionSchema = z.object({
  questionId: requiredUuid("Question invalide."),
  quizId: requiredUuid("Quiz invalide."),
  courseId: requiredUuid("Cours invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
  direction: z.enum(["up", "down"], {
    error: "Direction de déplacement invalide.",
  }),
});

export const deleteQuizEntitySchema = z.object({
  id: requiredUuid("Identifiant invalide."),
  quizId: optionalUuid,
  courseId: requiredUuid("Cours invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
});

export const quizSubmissionSchema = z.object({
  quizId: requiredUuid("Quiz invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
  courseSlug: z.string().trim().min(1, "Cours invalide."),
  answers: z
    .string()
    .trim()
    .refine((value) => value.length > 0, "Aucune réponse n’a été fournie.")
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Le format des réponses est invalide.")
    .transform((value) => {
      const parsed = JSON.parse(value) as Record<string, string[]>;
      return Object.fromEntries(
        Object.entries(parsed).map(([questionId, optionIds]) => [
          questionId,
          Array.isArray(optionIds) ? optionIds : [],
        ]),
      );
    }),
});

export const chapterProgressFormSchema = z.object({
  chapterId: requiredUuid("Chapitre invalide."),
  courseSlug: z.string().trim().min(1, "Cours invalide."),
});
