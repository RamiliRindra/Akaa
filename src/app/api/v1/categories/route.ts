/**
 * `GET /api/v1/categories`
 *
 * Liste en lecture seule des catégories de formation actives.
 * Permet à un agent IA de récupérer l'`id` d'une catégorie à passer à
 * `POST /api/v1/courses` via le champ `categoryId`.
 */

import { apiError, authenticateApiRequest, mapCoursesCoreErrorToResponse } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        icon: true,
        order: true,
      },
    });
    return Response.json({ categories });
  } catch (error) {
    // Fallback : si c'est une erreur typée `CoursesCoreError`, la fonction
    // helper la convertit en statut HTTP ; sinon 500.
    const mapped = mapCoursesCoreErrorToResponse(error);
    return mapped ?? apiError(500, "INTERNAL_ERROR", "Erreur inconnue.");
  }
}
