import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse email invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Adresse email invalide."),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z
      .string()
      .min(8, "La confirmation doit contenir au moins 8 caractères."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
