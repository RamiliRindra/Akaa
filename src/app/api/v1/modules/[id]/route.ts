/**
 * `/api/v1/modules/[id]`
 *
 * - `PUT` : mise à jour d'un module (title, description, order)
 * - `DELETE` : suppression d'un module (cascade sur chapitres et quiz)
 */

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  deleteModuleForActor,
  updateModuleForActor,
} from "@/lib/courses-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const moduleRecord = await updateModuleForActor(auth.actor, id, body.body);
    return Response.json({ module: moduleRecord });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteModuleForActor(auth.actor, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
