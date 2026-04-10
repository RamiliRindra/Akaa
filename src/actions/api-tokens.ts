"use server";

/**
 * Server Actions pour la gestion des jetons API IA (`user.apiToken`).
 *
 * Ces actions sont appelées par la page `/admin/api-tokens`. Seuls les
 * administrateurs peuvent générer ou révoquer un jeton, et uniquement pour
 * des utilisateurs `TRAINER` ou `ADMIN`. Les apprenants n'ont jamais accès à
 * l'API `/api/v1/*`.
 *
 * Sécurité :
 * - Le jeton plaintext n'est renvoyé qu'une seule fois au moment de la
 *   génération. Il n'est jamais stocké ailleurs que dans `user.apiToken` et
 *   ne réapparaît plus jamais à l'écran — l'admin doit le copier
 *   immédiatement.
 * - La génération est toujours destructive : si un jeton existe déjà, il est
 *   écrasé. Cela signifie qu'un seul jeton actif par compte.
 */

import { randomBytes } from "node:crypto";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTokenActionFormSchema } from "@/lib/validations/admin";

// -----------------------------------------------------------------------------
// Types d'état (useActionState)
// -----------------------------------------------------------------------------

export type GenerateApiTokenState =
  | { status: "idle" }
  | {
      status: "success";
      token: string;
      userEmail: string;
      userName: string | null;
      generatedAt: string;
    }
  | { status: "error"; error: string };

export type RevokeApiTokenState =
  | { status: "idle" }
  | { status: "success"; userEmail: string }
  | { status: "error"; error: string };

export const initialGenerateApiTokenState: GenerateApiTokenState = { status: "idle" };
export const initialRevokeApiTokenState: RevokeApiTokenState = { status: "idle" };

// -----------------------------------------------------------------------------
// Helpers internes
// -----------------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return null;
  }
  return session.user;
}

/**
 * Construit un nouveau jeton API au format `akaa_<base64url(30 bytes)>`.
 *
 * 30 octets de random ≈ 40 caractères base64url, soit 240 bits d'entropie.
 * Le préfixe `akaa_` facilite le debug et permet de rejeter tout de suite un
 * jeton copié depuis une autre plateforme.
 */
function createNewApiToken(): string {
  return `akaa_${randomBytes(30).toString("base64url")}`;
}

function revalidateApiTokensPage() {
  revalidatePath("/admin/api-tokens");
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

/**
 * Génère (ou régénère) un jeton API pour un utilisateur TRAINER/ADMIN cible.
 *
 * Flot :
 * 1. Vérifie que l'appelant est admin.
 * 2. Vérifie que la cible existe, est active et a le bon rôle.
 * 3. Génère un token frais et persiste `apiToken` + `apiTokenCreatedAt`.
 * 4. Revalide `/admin/api-tokens` et renvoie le jeton plaintext **une seule
 *    fois** via le state `useActionState` pour qu'il puisse être copié.
 */
export async function generateApiTokenAction(
  _prev: GenerateApiTokenState,
  formData: FormData,
): Promise<GenerateApiTokenState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { status: "error", error: "Accès administrateur requis." };
  }

  const parsed = apiTokenActionFormSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error:
        parsed.error.issues[0]?.message ?? "Identifiant utilisateur invalide.",
    };
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  if (!target) {
    return { status: "error", error: "Utilisateur introuvable." };
  }
  if (!target.isActive) {
    return {
      status: "error",
      error: "Impossible de générer un jeton pour un compte désactivé.",
    };
  }
  if (target.role !== UserRole.TRAINER && target.role !== UserRole.ADMIN) {
    return {
      status: "error",
      error:
        "Seuls les comptes formateurs ou administrateurs peuvent utiliser l'API.",
    };
  }

  const token = createNewApiToken();
  const now = new Date();

  await db.user.update({
    where: { id: target.id },
    data: {
      apiToken: token,
      apiTokenCreatedAt: now,
    },
  });

  revalidateApiTokensPage();

  return {
    status: "success",
    token,
    userEmail: target.email,
    userName: target.name,
    generatedAt: now.toISOString(),
  };
}

/**
 * Révoque le jeton API d'un utilisateur (remet `apiToken` à `null`).
 *
 * Flot :
 * 1. Vérifie que l'appelant est admin.
 * 2. Charge la cible (juste pour vérifier qu'elle existe et pour le retour).
 * 3. Met `apiToken` et `apiTokenCreatedAt` à `null`.
 * 4. Revalide la page.
 */
export async function revokeApiTokenAction(
  _prev: RevokeApiTokenState,
  formData: FormData,
): Promise<RevokeApiTokenState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { status: "error", error: "Accès administrateur requis." };
  }

  const parsed = apiTokenActionFormSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error:
        parsed.error.issues[0]?.message ?? "Identifiant utilisateur invalide.",
    };
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, apiToken: true },
  });

  if (!target) {
    return { status: "error", error: "Utilisateur introuvable." };
  }
  if (!target.apiToken) {
    return {
      status: "error",
      error: "Ce compte n'a déjà pas de jeton API actif.",
    };
  }

  await db.user.update({
    where: { id: target.id },
    data: {
      apiToken: null,
      apiTokenCreatedAt: null,
    },
  });

  revalidateApiTokensPage();

  return { status: "success", userEmail: target.email };
}
