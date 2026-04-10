/**
 * Tests E2E pour les routes `/api/v1/*`.
 *
 * Utilise l'APIRequestContext de Playwright (pas de navigateur ouvert) : on
 * envoie des requêtes HTTP directement contre le serveur Next.js local.
 *
 * ## Prérequis
 *
 * - `npm run dev` qui tourne sur le port 3000 (ou via `reuseExistingServer`).
 * - La variable `AKAA_E2E_API_TOKEN` contenant un jeton `akaa_...` valide
 *   lié à un compte TRAINER ou ADMIN actif. Sans cette variable, tous les
 *   tests sont ignorés — le CI peut donc ne pas définir ces secrets et les
 *   tests de smoke continueront à passer.
 *
 * ## Isolation
 *
 * Chaque test qui crée un cours s'appuie sur un slug unique (timestamp) et
 * supprime le cours en teardown via `afterAll`. La BDD est la même qu'en
 * prod locale (Neon free tier) — on reste donc conservateur : un seul cours
 * de test créé, tout nettoyé à la fin.
 */

import { expect, test, type APIRequestContext } from "@playwright/test";

const token = process.env.AKAA_E2E_API_TOKEN?.trim();

/**
 * Préfixe unique basé sur la date/heure pour les titres de cours de test.
 * Garantit l'absence de conflits de slug si la suite tourne plusieurs fois.
 */
const RUN_ID = Date.now().toString(36).toUpperCase();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bearer(req: APIRequestContext) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

// ---------------------------------------------------------------------------
// Suite principale
// ---------------------------------------------------------------------------

test.describe("API v1 — tests bout-en-bout", () => {
  test.beforeEach(() => {
    test.skip(!token, "Définir AKAA_E2E_API_TOKEN pour activer ces tests.");
  });

  // -----------------------------------------------------------------------
  // Health check
  // -----------------------------------------------------------------------

  test("GET /api/v1/me → 200 avec user TRAINER ou ADMIN", async ({ request }) => {
    const response = await request.get("/api/v1/me", bearer(request));

    expect(response.status()).toBe(200);
    const body = await response.json() as {
      user: { id: string; email: string; role: string };
      apiVersion: string;
    };
    expect(body.user.id).toBeTruthy();
    expect(body.user.email).toBeTruthy();
    expect(["TRAINER", "ADMIN"]).toContain(body.user.role);
    expect(body.apiVersion).toBe("v1");
  });

  // -----------------------------------------------------------------------
  // Authentification — cas d'erreur
  // -----------------------------------------------------------------------

  test("GET /api/v1/me sans token → 401", async ({ request }) => {
    const response = await request.get("/api/v1/me");
    expect(response.status()).toBe(401);
    const body = await response.json() as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("GET /api/v1/me avec un jeton bidon → 401", async ({ request }) => {
    const response = await request.get("/api/v1/me", {
      headers: { Authorization: "Bearer akaa_jeton_qui_nexiste_pas" },
    });
    expect(response.status()).toBe(401);
  });

  // -----------------------------------------------------------------------
  // Catégories
  // -----------------------------------------------------------------------

  test("GET /api/v1/categories → 200 avec tableau categories", async ({ request }) => {
    const response = await request.get("/api/v1/categories", bearer(request));

    expect(response.status()).toBe(200);
    const body = await response.json() as { categories: unknown[] };
    expect(Array.isArray(body.categories)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Parcours CRUD complet : Cours → Module → Chapitre → Quiz
  // -----------------------------------------------------------------------

  test("parcours complet : créer cours + module + chapitre + quiz, puis supprimer", async ({ request }) => {
    // ---------- Créer un cours -----------------------------------------------
    const createCourseRes = await request.post("/api/v1/courses", {
      ...bearer(request),
      data: {
        title: `E2E Test Course ${RUN_ID}`,
        description: "Cours créé automatiquement par les tests E2E Playwright.",
        level: "BEGINNER",
        status: "DRAFT",
        estimatedHours: 1,
      },
    });

    expect(createCourseRes.status()).toBe(201);
    const { course } = await createCourseRes.json() as { course: { id: string; slug: string; status: string } };
    expect(course.id).toBeTruthy();
    expect(course.slug).toContain("e2e-test-course");
    expect(course.status).toBe("DRAFT");

    const courseId = course.id;

    try {
      // ---------- GET course ---------------------------------------------------
      const getCourseRes = await request.get(`/api/v1/courses/${courseId}`, bearer(request));
      expect(getCourseRes.status()).toBe(200);
      const { course: fetched } = await getCourseRes.json() as {
        course: { id: string; modules: unknown[] };
      };
      expect(fetched.id).toBe(courseId);
      expect(fetched.modules).toEqual([]);

      // ---------- Créer un module ----------------------------------------------
      const createModuleRes = await request.post(`/api/v1/courses/${courseId}/modules`, {
        ...bearer(request),
        data: { title: "Module 1 — E2E", order: 1 },
      });
      expect(createModuleRes.status()).toBe(201);
      const { module: mod } = await createModuleRes.json() as {
        module: { id: string; title: string };
      };
      expect(mod.id).toBeTruthy();
      expect(mod.title).toBe("Module 1 — E2E");

      const moduleId = mod.id;

      // ---------- Créer un chapitre --------------------------------------------
      const createChapterRes = await request.post(`/api/v1/modules/${moduleId}/chapters`, {
        ...bearer(request),
        data: {
          title: "Chapitre 1 — Introduction E2E",
          content: "# Introduction\n\nContenu de test.",
          order: 1,
          estimatedMinutes: 5,
        },
      });
      expect(createChapterRes.status()).toBe(201);
      const { chapter } = await createChapterRes.json() as {
        chapter: { id: string; title: string };
      };
      expect(chapter.id).toBeTruthy();

      const chapterId = chapter.id;

      // ---------- GET chapitre complet -----------------------------------------
      const getChapterRes = await request.get(`/api/v1/chapters/${chapterId}`, bearer(request));
      expect(getChapterRes.status()).toBe(200);
      const { chapter: fullChapter } = await getChapterRes.json() as {
        chapter: { id: string; content: string | null };
      };
      expect(fullChapter.id).toBe(chapterId);
      expect(fullChapter.content).toContain("Introduction");

      // ---------- Créer un quiz via PUT ----------------------------------------
      const setQuizRes = await request.put(`/api/v1/chapters/${chapterId}/quiz`, {
        ...bearer(request),
        data: {
          title: "Quiz E2E — types primitifs",
          passingScore: 60,
          xpReward: 20,
          questions: [
            {
              questionText: "Quel mot-clé déclare une constante en JS ?",
              type: "SINGLE",
              options: [
                { optionText: "var", isCorrect: false },
                { optionText: "let", isCorrect: false },
                { optionText: "const", isCorrect: true },
              ],
            },
          ],
        },
      });
      expect(setQuizRes.status()).toBe(200);
      const { quiz } = await setQuizRes.json() as {
        quiz: { id: string; title: string; questions: unknown[] };
      };
      expect(quiz.id).toBeTruthy();
      expect(quiz.questions).toHaveLength(1);

      // ---------- GET quiz -------------------------------------------------------
      const getQuizRes = await request.get(`/api/v1/chapters/${chapterId}/quiz`, bearer(request));
      expect(getQuizRes.status()).toBe(200);
      const { quiz: fetchedQuiz } = await getQuizRes.json() as {
        quiz: { title: string; passingScore: number };
      };
      expect(fetchedQuiz.title).toBe("Quiz E2E — types primitifs");
      expect(fetchedQuiz.passingScore).toBe(60);

      // ---------- Lister les cours (cours de test doit apparaître) --------------
      const listRes = await request.get("/api/v1/courses?status=DRAFT", bearer(request));
      expect(listRes.status()).toBe(200);
      const listBody = await listRes.json() as {
        items: Array<{ id: string }>;
        total: number;
      };
      expect(listBody.items.some((c) => c.id === courseId)).toBe(true);

      // ---------- Mettre à jour le cours ----------------------------------------
      const updateRes = await request.put(`/api/v1/courses/${courseId}`, {
        ...bearer(request),
        data: { estimatedHours: 2 },
      });
      expect(updateRes.status()).toBe(200);
      const { course: updated } = await updateRes.json() as {
        course: { estimatedHours: number };
      };
      expect(updated.estimatedHours).toBe(2);
    } finally {
      // ---------- Nettoyage — toujours exécuté même si un test échoue ----------
      const deleteRes = await request.delete(`/api/v1/courses/${courseId}`, bearer(request));
      expect(deleteRes.status()).toBe(204);

      // Vérification que le cours a bien disparu
      const getDeletedRes = await request.get(`/api/v1/courses/${courseId}`, bearer(request));
      expect(getDeletedRes.status()).toBe(404);
    }
  });

  // -----------------------------------------------------------------------
  // Validation — erreurs 400
  // -----------------------------------------------------------------------

  test("POST /api/v1/courses sans titre → 400 VALIDATION_FAILED", async ({ request }) => {
    const response = await request.post("/api/v1/courses", {
      ...bearer(request),
      data: { level: "BEGINNER" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json() as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  test("POST /api/v1/courses avec JSON malformé → 400", async ({ request }) => {
    const response = await request.post("/api/v1/courses", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: "{ ceci n'est pas du json",
    });
    expect(response.status()).toBe(400);
  });

  test("GET /api/v1/courses/uuid-inexistant → 404", async ({ request }) => {
    const response = await request.get(
      "/api/v1/courses/00000000-0000-0000-0000-000000000000",
      bearer(request),
    );
    expect(response.status()).toBe(404);
    const body = await response.json() as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
