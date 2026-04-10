/**
 * api-auth — authentification bearer token pour les routes `/api/v1/*`.
 *
 * Les routes de l'API IA programmatique sont consommées par des agents
 * extérieurs (Claude, ChatGPT, Gemini, serveur MCP wrapper). On n'utilise donc
 * pas la session NextAuth habituelle : chaque requête doit porter un header
 * `Authorization: Bearer akaa_xxxx…`. Le jeton est stocké sur
 * `User.apiToken` (voir migration `20260410000100_add_api_tokens`).
 *
 * Règles :
 * - Un jeton valide appartient forcément à un utilisateur `TRAINER` ou `ADMIN`
 *   actif (`isActive = true`). Les apprenants n'ont pas accès à l'API.
 * - Le jeton doit respecter le préfixe `akaa_` pour faciliter le debug visuel
 *   et détecter tout de suite un header mal collé.
 * - En cas d'échec, on renvoie une réponse JSON uniforme
 *   `{ error: { code, message } }` avec le bon statut HTTP.
 *
 * Ce helper est volontairement indépendant de Next.js côté session : il
 * accepte un `Request` standard (celui reçu par les Route Handlers), donc il
 * peut être testé hors contexte HTTP réel.
 */

import { UserRole } from "@prisma/client";

import type { ActorContext } from "@/lib/courses-core";
import { db } from "@/lib/db";

// -----------------------------------------------------------------------------
// Types publics
// -----------------------------------------------------------------------------

/** Informations du user propriétaire du jeton, exposées au handler. */
export type ApiAuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

/**
 * Résultat de `authenticateApiRequest` :
 * - succès : on expose à la fois un `ApiAuthUser` (pour logs/affichage) et un
 *   `ActorContext` directement consommable par les helpers `courses-core`.
 * - échec : une `Response` déjà formée (statut + JSON).
 */
export type ApiAuthResult =
  | {
      ok: true;
      user: ApiAuthUser;
      actor: ActorContext;
    }
  | {
      ok: false;
      response: Response;
    };

/** Codes d'erreur normalisés exposés par l'API v1. */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

// -----------------------------------------------------------------------------
// Réponses d'erreur
// -----------------------------------------------------------------------------

/**
 * Construit une réponse d'erreur JSON uniforme pour l'API v1.
 *
 * Format retenu (proche de ce que consomment les agents IA) :
 * ```json
 * { "error": { "code": "UNAUTHORIZED", "message": "..." } }
 * ```
 *
 * Le champ `details` est optionnel — utilisé notamment pour joindre les
 * issues Zod sur les erreurs de validation.
 */
export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): Response {
  const body: Record<string, unknown> = { error: { code, message } };
  if (details !== undefined) {
    (body.error as Record<string, unknown>).details = details;
  }
  return Response.json(body, { status });
}

// -----------------------------------------------------------------------------
// Authentification
// -----------------------------------------------------------------------------

/**
 * Valide le header `Authorization` d'une requête API v1 et renvoie le
 * `ActorContext` à utiliser pour appeler les helpers `courses-core`.
 *
 * Tous les échecs sont remontés sous la forme `{ ok: false, response }` : le
 * Route Handler peut simplement écrire
 *
 * ```ts
 * const auth = await authenticateApiRequest(request);
 * if (!auth.ok) return auth.response;
 * ```
 *
 * sans avoir à penser aux statuts HTTP.
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<ApiAuthResult> {
  const header = request.headers.get("authorization");
  if (!header) {
    return {
      ok: false,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "Header Authorization manquant. Utilisez `Authorization: Bearer akaa_...`.",
      ),
    };
  }

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    return {
      ok: false,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "Format de header invalide. Attendu : `Authorization: Bearer akaa_...`.",
      ),
    };
  }

  const token = match[1].trim();
  if (!token.startsWith("akaa_")) {
    return {
      ok: false,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "Jeton invalide : les jetons API Akaa doivent commencer par `akaa_`.",
      ),
    };
  }

  // Garde-fou : on refuse les jetons manifestement trop courts pour couper
  // court à tout test accidentel (`Bearer akaa_`).
  if (token.length < 16) {
    return {
      ok: false,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "Jeton invalide : longueur insuffisante.",
      ),
    };
  }

  const user = await db.user.findUnique({
    where: { apiToken: token },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "Jeton API inconnu ou révoqué.",
      ),
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      response: apiError(
        401,
        "UNAUTHORIZED",
        "Le compte associé à ce jeton est désactivé.",
      ),
    };
  }

  if (user.role !== UserRole.TRAINER && user.role !== UserRole.ADMIN) {
    return {
      ok: false,
      response: apiError(
        403,
        "FORBIDDEN",
        "Seuls les formateurs et administrateurs peuvent utiliser l'API /api/v1.",
      ),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    actor: {
      userId: user.id,
      role: user.role,
    },
  };
}

// -----------------------------------------------------------------------------
// Mapping d'erreurs métier
// -----------------------------------------------------------------------------

/**
 * Convertit une `CoursesCoreError` en réponse HTTP. Utilisé dans chaque Route
 * Handler de `/api/v1/*` pour factoriser le `try/catch` autour des helpers
 * `courses-core`.
 */
export function mapCoursesCoreErrorToResponse(error: unknown): Response {
  // Import paresseux pour éviter une boucle d'imports côté module.
  // (api-auth ← courses-core typeonly, mais on veut isoler le runtime).
  // On utilise le `name` pour rester compatible avec les tests qui
  // instancient les erreurs via un mock.
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "CoursesCoreError" &&
    "code" in error
  ) {
    const typed = error as unknown as {
      code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" | "CONFLICT";
      message: string;
      details?: unknown;
    };
    switch (typed.code) {
      case "NOT_FOUND":
        return apiError(404, "NOT_FOUND", typed.message, typed.details);
      case "FORBIDDEN":
        return apiError(403, "FORBIDDEN", typed.message, typed.details);
      case "VALIDATION":
        return apiError(
          400,
          "VALIDATION_FAILED",
          typed.message,
          typed.details,
        );
      case "CONFLICT":
        return apiError(409, "CONFLICT", typed.message, typed.details);
    }
  }
  console.error("[api/v1] unexpected error:", error);
  return apiError(
    500,
    "INTERNAL_ERROR",
    "Erreur interne du serveur. Réessayez plus tard.",
  );
}
