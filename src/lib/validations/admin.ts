import { z } from "zod";

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
