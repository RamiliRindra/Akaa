/**
 * `/api/v1/chapters/[id]`
 *
 * - `GET` : détail complet d'un chapitre (contenu markdown inclus)
 * - `PUT` : mise à jour partielle
 * - `DELETE` : suppression (cascade sur le quiz éventuel)
 */

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  deleteChapterForActor,
  getChapterForActor,
  updateChapterForActor,
} from "@/lib/courses-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const chapter = await getChapterForActor(auth.actor, id);
    return Response.json({ chapter });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const chapter = await updateChapterForActor(auth.actor, id, body.body);
    return Response.json({ chapter });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteChapterForActor(auth.actor, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
