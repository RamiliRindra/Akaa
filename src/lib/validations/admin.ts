import { BadgeConditionType, UserRole } from "@prisma/client";
import { z } from "zod";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const trimmedOptionalString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const optionalIntegerField = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    return Number(value);
  })
  .refine(
    (value) => value === undefined || (Number.isInteger(value) && value >= 0),
    "La valeur doit être un entier positif.",
  );

const requiredIntegerField = z
  .string()
  .trim()
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isInteger(value) && value >= 0,
    "La valeur doit être un entier positif.",
  );

const booleanField = z
  .string()
  .trim()
  .transform((value) => value === "true");

const multiplierField = z
  .string()
  .trim()
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isFinite(value) && value >= 0.5 && value <= 5,
    "Le coefficient doit être compris entre 0,5 et 5.",
  );

export const xpLevelSettingsFormSchema = z.object({
  beginnerMultiplier: multiplierField,
  intermediateMultiplier: multiplierField,
  advancedMultiplier: multiplierField,
});

export const updateUserRoleFormSchema = z.object({
  role: z.nativeEnum(UserRole, {
    message: "Rôle utilisateur invalide.",
  }),
});

export const updateUserActiveStateFormSchema = z.object({
  isActive: booleanField,
});

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom de la catégorie doit contenir au moins 2 caractères.")
    .max(100, "Le nom de la catégorie est trop long."),
  description: trimmedOptionalString,
  color: z
    .string()
    .trim()
    .regex(hexColorRegex, "La couleur doit être un code hexadécimal du type #0F63FF."),
  icon: z
    .string()
    .trim()
    .min(2, "L’icône doit être renseignée.")
    .max(50, "Le nom de l’icône est trop long."),
  order: requiredIntegerField,
  isActive: booleanField,
});

export const badgeFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le nom du badge doit contenir au moins 2 caractères.")
      .max(100, "Le nom du badge est trop long."),
    description: trimmedOptionalString,
    iconUrl: z
      .string()
      .trim()
      .min(2, "Le chemin ou l’URL de l’icône est requis.")
      .max(500, "Le chemin ou l’URL de l’icône est trop long."),
    conditionType: z.nativeEnum(BadgeConditionType, {
      message: "Le type de condition du badge est invalide.",
    }),
    conditionValue: optionalIntegerField,
    xpBonus: requiredIntegerField,
    isActive: booleanField,
  })
  .superRefine((value, ctx) => {
    if (value.conditionType !== BadgeConditionType.MANUAL && value.conditionValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conditionValue"],
        message: "La valeur de condition est obligatoire pour ce type de badge.",
      });
    }
  });

export const adminXpAdjustmentFormSchema = z.object({
  userId: z.uuid("Utilisateur invalide."),
  amount: z
    .string()
    .trim()
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isInteger(value) && value !== 0 && value >= -10000 && value <= 10000,
      "Le montant XP doit être un entier non nul entre -10000 et 10000.",
    ),
  reason: z
    .string()
    .trim()
    .min(3, "La raison doit contenir au moins 3 caractères.")
    .max(500, "La raison est trop longue."),
});

export const apiTokenActionFormSchema = z.object({
  userId: z.uuid("Utilisateur invalide."),
});
