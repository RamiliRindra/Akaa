/**
 * `/api/v1/chapters/[id]/quiz`
 *
 * - `GET` : récupère le quiz d'un chapitre (avec ses questions et options)
 * - `PUT` : crée ou remplace entièrement le quiz (opération atomique)
 * - `DELETE` : supprime le quiz du chapitre
 *
 * On utilise `PUT` plutôt que `POST` parce que l'opération est idempotente :
 * quelle que soit la fréquence d'appel, le résultat final est le même.
 * Le quiz précédent est supprimé puis recréé dans une transaction Prisma
 * pour rester cohérent.
 */

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  deleteQuizForActor,
  getQuizForActor,
  setQuizForActor,
} from "@/lib/courses-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: chapterId } = await context.params;

  try {
    const quiz = await getQuizForActor(auth.actor, chapterId);
    return Response.json({ quiz });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: chapterId } = await context.params;
  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const quiz = await setQuizForActor(auth.actor, chapterId, body.body);
    return Response.json({ quiz });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: chapterId } = await context.params;

  try {
    await deleteQuizForActor(auth.actor, chapterId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
