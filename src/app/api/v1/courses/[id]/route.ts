/**
 * `/api/v1/courses/[id]`
 *
 * - `GET` : détail complet d'un cours (modules + chapitres)
 * - `PUT` : mise à jour partielle (champs omis = inchangés)
 * - `DELETE` : suppression définitive (cascade sur modules/chapitres/quiz)
 */

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  deleteCourseForActor,
  getCourseForActor,
  updateCourseForActor,
} from "@/lib/courses-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const course = await getCourseForActor(auth.actor, id);
    return Response.json({ course });
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
    const course = await updateCourseForActor(auth.actor, id, body.body);
    return Response.json({ course });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteCourseForActor(auth.actor, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
