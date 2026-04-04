import { CourseStatus, QuizQuestionType } from "@prisma/client";
import { z } from "zod";

import { isSupportedVideoUrl } from "@/lib/content";
import { courseLevels } from "@/lib/course-level";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional();

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .refine((value) => !value || z.uuid().safeParse(value).success, "Identifiant invalide.")
  .optional();

const optionalNumber = z
  .string()
  .trim()
  .transform((value) => (value.length ? Number(value) : undefined))
  .refine((value) => value === undefined || (Number.isFinite(value) && value > 0), "La valeur doit être positive.")
  .optional();

const requiredCsvText = z.string().trim().min(1, "Champ requis.");

const optionalCsvText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .optional();

const requiredCsvNumber = z
  .string()
  .trim()
  .transform((value) => Number(value))
  .refine((value) => Number.isInteger(value) && value > 0, "La valeur doit être un entier positif.");

const optionalCsvNumber = z
  .string()
  .trim()
  .transform((value) => (value.length ? Number(value) : undefined))
  .refine((value) => value === undefined || (Number.isInteger(value) && value > 0), "La valeur doit être un entier positif.")
  .optional();

export const courseFormSchema = z.object({
  courseId: optionalUuid,
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(255, "Le titre est trop long."),
  description: optionalText,
  categoryId: optionalUuid,
  thumbnailUrl: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .refine((value) => !value || z.url().safeParse(value).success, "L’URL de miniature est invalide.")
    .optional(),
  estimatedHours: optionalNumber,
  level: z.enum(courseLevels, "Le niveau du cours est invalide."),
  status: z.nativeEnum(CourseStatus, {
    error: "Le statut du cours est invalide.",
  }),
});

export const moduleFormSchema = z.object({
  moduleId: optionalUuid,
  courseId: z.uuid("Cours invalide."),
  title: z.string().trim().min(2, "Le titre du module est requis.").max(255, "Le titre du module est trop long."),
  description: optionalText,
});

export const chapterFormSchema = z.object({
  chapterId: optionalUuid,
  courseId: z.uuid("Cours invalide."),
  moduleId: z.uuid("Module invalide."),
  title: z.string().trim().min(2, "Le titre du chapitre est requis.").max(255, "Le titre du chapitre est trop long."),
  content: z.string(),
  videoUrl: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .refine((value) => !value || isSupportedVideoUrl(value), "Seuls YouTube et Google Drive sont autorisés pour les vidéos.")
    .optional(),
  estimatedMinutes: optionalNumber,
});

export const createChapterSchema = z.object({
  courseId: z.uuid("Cours invalide."),
  moduleId: z.uuid("Module invalide."),
});

export const courseImportArchiveSchema = z.object({
  name: z.string().trim().min(1, "Le fichier d’import est requis.").refine((value) => value.toLowerCase().endsWith(".zip"), "Le fichier doit être une archive .zip."),
});

export const courseImportRowSchema = z.object({
  course_title: requiredCsvText,
  course_description: optionalCsvText,
  course_status: z.nativeEnum(CourseStatus, {
    error: "Le statut du cours est invalide.",
  }),
  course_level: z.enum(courseLevels, "Le niveau du cours est invalide.").default("BEGINNER"),
  estimated_hours: optionalCsvNumber,
  category_slug: optionalCsvText,
  module_order: requiredCsvNumber,
  module_title: requiredCsvText,
  module_description: optionalCsvText,
  chapter_order: requiredCsvNumber,
  chapter_title: requiredCsvText,
  estimated_minutes: optionalCsvNumber,
  video_url: optionalCsvText.refine((value) => !value || isSupportedVideoUrl(value), "Seuls YouTube et Google Drive sont autorisés pour les vidéos."),
  content_file: optionalCsvText,
  quiz_file: optionalCsvText,
}).refine(
  (row) => Boolean(row.video_url || row.content_file),
  {
    message: "Chaque chapitre doit renseigner au moins un contenu Markdown ou une URL vidéo.",
    path: ["content_file"],
  },
);

export const courseImportManifestSchema = z.array(courseImportRowSchema).min(1, "Le manifest doit contenir au moins un chapitre.");

const courseImportQuizOptionSchema = z.object({
  option_text: requiredCsvText,
  is_correct: z.boolean(),
});

const courseImportQuizQuestionSchema = z
  .object({
    question_text: requiredCsvText,
    type: z.nativeEnum(QuizQuestionType, {
      error: "Le type de question du quiz est invalide.",
    }),
    options: z.array(courseImportQuizOptionSchema).min(2, "Chaque question importée doit contenir au moins deux réponses."),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.options.filter((option) => option.is_correct).length;

    if (correctCount === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Chaque question importée doit avoir au moins une bonne réponse.",
      });
    }

    if (question.type === QuizQuestionType.SINGLE && correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Une question à choix unique importée doit avoir exactement une bonne réponse.",
      });
    }
  });

export const courseImportQuizFileSchema = z.object({
  title: z.string().trim().min(3, "Le titre du quiz importé doit contenir au moins 3 caractères."),
  passing_score: z.number().int().min(1).max(100).default(70),
  xp_reward: z.number().int().positive().default(50),
  questions: z.array(courseImportQuizQuestionSchema).min(1, "Le quiz importé doit contenir au moins une question."),
});

export const moveItemSchema = z.object({
  id: z.uuid("Identifiant invalide."),
  parentId: z.uuid("Parent invalide."),
  direction: z.enum(["up", "down"], {
    error: "Direction de déplacement invalide.",
  }),
});

export const deleteItemSchema = z.object({
  id: z.uuid("Identifiant invalide."),
  parentId: optionalUuid,
});
