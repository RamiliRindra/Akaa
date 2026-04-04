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

const quizBuilderOptionSchema = z.object({
  id: z.string().trim().optional(),
  optionText: z.string().trim().min(1, "Le texte de chaque réponse est requis."),
  isCorrect: z.boolean(),
});

const quizBuilderQuestionSchema = z
  .object({
    id: z.string().trim().optional(),
    questionText: z.string().trim().min(5, "Chaque question doit contenir au moins 5 caractères."),
    type: z.nativeEnum(QuizQuestionType, {
      error: "Le type de question est invalide.",
    }),
    options: z.array(quizBuilderOptionSchema).min(2, "Chaque question doit contenir au moins deux réponses."),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;

    if (correctCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Chaque question doit avoir au moins une bonne réponse.",
      });
    }

    if (question.type === QuizQuestionType.SINGLE && correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Une question à choix unique doit avoir exactement une bonne réponse.",
      });
    }
  });

export const quizBuilderPayloadSchema = z
  .object({
    enabled: z.boolean(),
    title: z.string().trim().optional(),
    passingScore: z.number().int().min(1).max(100).optional(),
    xpReward: z.number().int().positive().optional(),
    questions: z.array(quizBuilderQuestionSchema).optional(),
  })
  .superRefine((payload, ctx) => {
    if (!payload.enabled) {
      return;
    }

    if (!payload.title || payload.title.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Le titre du quiz doit contenir au moins 3 caractères.",
      });
    }

    if (payload.passingScore === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["passingScore"],
        message: "Le score de réussite est requis.",
      });
    }

    if (payload.xpReward === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["xpReward"],
        message: "La récompense XP est requise.",
      });
    }

    if (!payload.questions?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Ajoutez au moins une question pour enregistrer le quiz.",
      });
    }
  });

export const quizBuilderFormSchema = z.object({
  courseId: requiredUuid("Cours invalide."),
  chapterId: requiredUuid("Chapitre invalide."),
  payload: z
    .string()
    .trim()
    .refine((value) => value.length > 0, "La configuration du quiz est vide.")
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Le format du quiz est invalide.")
    .transform((value, ctx) => {
      const parsedPayload = quizBuilderPayloadSchema.safeParse(JSON.parse(value));

      if (!parsedPayload.success) {
        const [firstIssue] = parsedPayload.error.issues;
        ctx.addIssue({
          code: "custom",
          path: firstIssue?.path,
          message: firstIssue?.message ?? "La configuration du quiz est invalide.",
        });

        return z.NEVER;
      }

      return parsedPayload.data;
    }),
});
