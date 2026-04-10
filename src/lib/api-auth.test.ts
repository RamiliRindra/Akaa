/**
 * Tests unitaires de `src/lib/api-auth.ts`.
 *
 * On couvre :
 *  - `apiError`                       : format JSON et détails optionnels.
 *  - `parseJsonBody`                  : JSON valide, body vide, JSON malformé.
 *  - `mapCoursesCoreErrorToResponse`  : mapping des 4 codes métier + fallback 500.
 *  - `authenticateApiRequest`         : toutes les branches :
 *      * header manquant / format invalide / préfixe absent / jeton trop court
 *      * jeton inconnu / user désactivé / rôle LEARNER → 403
 *      * jeton TRAINER / ADMIN actif → ok + actor
 *
 * Pour les branches BDD on mock `@/lib/db` — aucune vraie connexion
 * PostgreSQL n'est ouverte pendant ces tests.
 */

import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `vi.hoisted` garantit que `findUniqueMock` existe avant le `vi.mock` (lui-même
// remonté en haut du fichier). Sans ça on obtient "Cannot access before
// initialization" au chargement du module sous test.
const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

import {
  apiError,
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";

function makeRequest(headers: Record<string, string>, body?: string) {
  return new Request("http://localhost/api/v1/test", {
    method: body === undefined ? "GET" : "POST",
    headers,
    body,
  });
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

beforeEach(() => {
  findUniqueMock.mockReset();
});

describe("apiError", () => {
  it("renvoie un JSON { error: { code, message } } avec le bon statut", async () => {
    const response = apiError(401, "UNAUTHORIZED", "Pas bon");
    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      error: { code: "UNAUTHORIZED", message: "Pas bon" },
    });
  });

  it("inclut `details` quand fourni", async () => {
    const response = apiError(400, "VALIDATION_FAILED", "Invalide", [
      { path: "title", issue: "required" },
    ]);
    expect(await readJson(response)).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalide",
        details: [{ path: "title", issue: "required" }],
      },
    });
  });
});

describe("parseJsonBody", () => {
  it("parse un body JSON valide", async () => {
    const result = await parseJsonBody<{ title: string }>(
      makeRequest({ "content-type": "application/json" }, '{"title":"Cours"}'),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toEqual({ title: "Cours" });
    }
  });

  it("traite un body vide comme un objet vide", async () => {
    const result = await parseJsonBody(
      makeRequest({ "content-type": "application/json" }, ""),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toEqual({});
    }
  });

  it("traite un body avec uniquement des espaces comme vide", async () => {
    const result = await parseJsonBody(
      makeRequest({ "content-type": "application/json" }, "   \n  "),
    );
    expect(result.ok).toBe(true);
  });

  it("renvoie une erreur 400 sur JSON malformé", async () => {
    const result = await parseJsonBody(
      makeRequest({ "content-type": "application/json" }, "{ ceci n'est pas du json"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = (await readJson(result.response)) as {
        error: { code: string };
      };
      expect(body.error.code).toBe("VALIDATION_FAILED");
    }
  });
});

describe("mapCoursesCoreErrorToResponse", () => {
  function makeError(code: string, message: string, details?: unknown) {
    // On reproduit la shape minimale de `CoursesCoreError` : name + code
    // + message + details. Le mapping ne dépend que de ces champs.
    const error = new Error(message) as Error & {
      code: string;
      details?: unknown;
    };
    error.name = "CoursesCoreError";
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
  }

  it("mappe NOT_FOUND → 404", async () => {
    const response = mapCoursesCoreErrorToResponse(
      makeError("NOT_FOUND", "Cours introuvable."),
    );
    expect(response.status).toBe(404);
    const body = (await readJson(response)) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("mappe FORBIDDEN → 403", async () => {
    const response = mapCoursesCoreErrorToResponse(
      makeError("FORBIDDEN", "Pas autorisé."),
    );
    expect(response.status).toBe(403);
  });

  it("mappe VALIDATION → 400 avec code VALIDATION_FAILED", async () => {
    const response = mapCoursesCoreErrorToResponse(
      makeError("VALIDATION", "Invalide.", [{ path: "title" }]),
    );
    expect(response.status).toBe(400);
    const body = (await readJson(response)) as {
      error: { code: string; details?: unknown };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details).toEqual([{ path: "title" }]);
  });

  it("mappe CONFLICT → 409", async () => {
    const response = mapCoursesCoreErrorToResponse(
      makeError("CONFLICT", "Conflit."),
    );
    expect(response.status).toBe(409);
  });

  it("fallback sur 500 pour les erreurs non CoursesCoreError", async () => {
    // On silencieux console.error pour éviter le bruit dans la sortie de test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = mapCoursesCoreErrorToResponse(
      new Error("Quelque chose a cassé"),
    );
    expect(response.status).toBe(500);
    const body = (await readJson(response)) as { error: { code: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    spy.mockRestore();
  });
});

describe("authenticateApiRequest", () => {
  describe("branches pré-BDD (aucune requête SQL)", () => {
    it("401 si header Authorization absent", async () => {
      const result = await authenticateApiRequest(makeRequest({}));
      expect(findUniqueMock).not.toHaveBeenCalled();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it("401 si le header n'a pas la forme `Bearer xxx`", async () => {
      const result = await authenticateApiRequest(
        makeRequest({ authorization: "Basic abc123" }),
      );
      expect(findUniqueMock).not.toHaveBeenCalled();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
    });

    it("401 si le jeton ne commence pas par `akaa_`", async () => {
      const result = await authenticateApiRequest(
        makeRequest({
          authorization: "Bearer pk_live_1234567890abcdef",
        }),
      );
      expect(findUniqueMock).not.toHaveBeenCalled();
      expect(result.ok).toBe(false);
    });

    it("401 si le jeton est trop court (min 16 caractères)", async () => {
      const result = await authenticateApiRequest(
        makeRequest({ authorization: "Bearer akaa_short" }),
      );
      expect(findUniqueMock).not.toHaveBeenCalled();
      expect(result.ok).toBe(false);
    });
  });

  describe("branches BDD (db.user.findUnique mocké)", () => {
    const validToken = "akaa_1234567890abcdefghij";

    it("401 si le jeton est inconnu", async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      const result = await authenticateApiRequest(
        makeRequest({ authorization: `Bearer ${validToken}` }),
      );

      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { apiToken: validToken },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(401);
    });

    it("401 si le user existe mais est désactivé", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "u1",
        name: "Inactive",
        email: "inactive@akaa.io",
        role: UserRole.TRAINER,
        isActive: false,
      });

      const result = await authenticateApiRequest(
        makeRequest({ authorization: `Bearer ${validToken}` }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
        const body = (await readJson(result.response)) as {
          error: { message: string };
        };
        expect(body.error.message).toMatch(/désactivé/i);
      }
    });

    it("403 si le user est un LEARNER", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "u1",
        name: "Apprenant",
        email: "learner@akaa.io",
        role: UserRole.LEARNER,
        isActive: true,
      });

      const result = await authenticateApiRequest(
        makeRequest({ authorization: `Bearer ${validToken}` }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const body = (await readJson(result.response)) as {
          error: { code: string };
        };
        expect(body.error.code).toBe("FORBIDDEN");
      }
    });

    it("ok = true + actor pour un TRAINER actif", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "trainer-1",
        name: "Formateur",
        email: "trainer@akaa.io",
        role: UserRole.TRAINER,
        isActive: true,
      });

      const result = await authenticateApiRequest(
        makeRequest({ authorization: `Bearer ${validToken}` }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user).toEqual({
          id: "trainer-1",
          name: "Formateur",
          email: "trainer@akaa.io",
          role: UserRole.TRAINER,
        });
        expect(result.actor).toEqual({
          userId: "trainer-1",
          role: UserRole.TRAINER,
        });
      }
    });

    it("ok = true + actor pour un ADMIN actif", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "admin-1",
        name: "Admin",
        email: "admin@akaa.io",
        role: UserRole.ADMIN,
        isActive: true,
      });

      const result = await authenticateApiRequest(
        makeRequest({ authorization: `Bearer ${validToken}` }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.actor.role).toBe(UserRole.ADMIN);
      }
    });

    it("tolère les espaces autour du header", async () => {
      findUniqueMock.mockResolvedValueOnce({
        id: "trainer-1",
        name: "Formateur",
        email: "trainer@akaa.io",
        role: UserRole.TRAINER,
        isActive: true,
      });

      const result = await authenticateApiRequest(
        makeRequest({ authorization: `  Bearer   ${validToken}  ` }),
      );

      expect(result.ok).toBe(true);
      expect(findUniqueMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { apiToken: validToken },
        }),
      );
    });
  });
});
