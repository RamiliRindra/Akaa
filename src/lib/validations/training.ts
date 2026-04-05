import {
  AttendanceStatus,
  ProgramStatus,
  SessionEnrollmentStatus,
  SessionStatus,
} from "@prisma/client";
import { z } from "zod";

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

const integerField = z
  .string()
  .trim()
  .transform((value) => Number(value))
  .refine((value) => Number.isInteger(value) && value >= 0, "La valeur doit être un entier positif.");

const optionalPositiveIntegerField = z
  .string()
  .trim()
  .transform((value) => (value.length ? Number(value) : undefined))
  .refine(
    (value) => value === undefined || (Number.isInteger(value) && value >= 0),
    "La valeur doit être un entier positif.",
  )
  .optional();

const booleanField = z
  .string()
  .trim()
  .transform((value) => value === "true");

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : undefined))
  .refine((value) => !value || z.url().safeParse(value).success, "L’URL fournie est invalide.")
  .optional();

const dateTimeField = z
  .string()
  .trim()
  .min(1, "La date est obligatoire.")
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), "La date est invalide.");

export const trainingProgramFormSchema = z.object({
  programId: optionalUuid,
  title: z
    .string()
    .trim()
    .min(3, "Le titre du parcours doit contenir au moins 3 caractères.")
    .max(255, "Le titre du parcours est trop long."),
  description: optionalText,
  trainerId: optionalUuid,
  status: z.nativeEnum(ProgramStatus, {
    message: "Le statut du parcours est invalide.",
  }),
});

export const trainingSessionFormSchema = z
  .object({
    sessionId: optionalUuid,
    title: z
      .string()
      .trim()
      .min(3, "Le titre de la session doit contenir au moins 3 caractères.")
      .max(255, "Le titre de la session est trop long."),
    description: optionalText,
    status: z.nativeEnum(SessionStatus, {
      message: "Le statut de la session est invalide.",
    }),
    startsAt: dateTimeField,
    endsAt: dateTimeField,
    isAllDay: booleanField,
    location: optionalText,
    meetingUrl: optionalUrl,
    recurrenceRule: optionalText,
    reminderMinutes: integerField,
    xpReward: integerField,
    courseId: optionalUuid,
    programId: optionalUuid,
    trainerId: optionalUuid,
  })
  .superRefine((value, ctx) => {
    if (value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "La fin de session doit être postérieure au début.",
      });
    }
  });

export const sessionEnrollmentRequestSchema = z.object({
  sessionId: z.uuid("Session invalide."),
});

export const sessionEnrollmentReviewSchema = z.object({
  enrollmentId: z.uuid("Inscription invalide."),
  status: z.enum([SessionEnrollmentStatus.APPROVED, SessionEnrollmentStatus.REJECTED], {
    message: "Le statut de validation est invalide.",
  }),
});

export const sessionEnrollmentCancelSchema = z.object({
  enrollmentId: z.uuid("Inscription invalide."),
});

export const sessionAttendanceSchema = z.object({
  sessionId: z.uuid("Session invalide."),
  userId: z.uuid("Utilisateur invalide."),
  status: z.nativeEnum(AttendanceStatus, {
    message: "Le statut de présence est invalide.",
  }),
});

export const sessionDeleteSchema = z.object({
  sessionId: z.uuid("Session invalide."),
});

export const programDeleteSchema = z.object({
  programId: z.uuid("Parcours invalide."),
});

export const sessionFilterSchema = z.object({
  trainerId: optionalUuid,
  programId: optionalUuid,
  courseId: optionalUuid,
  limit: optionalPositiveIntegerField,
});
