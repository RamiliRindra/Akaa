import { CourseStatus } from "@prisma/client";
import { z } from "zod";

import { isSupportedVideoUrl } from "@/lib/content";

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
  content: z
    .string()
    .trim()
    .min(2, "Le contenu du chapitre est requis.")
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Le contenu riche est invalide."),
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

