/**
 * `/api/v1/courses/[id]/modules`
 *
 * - `GET` : liste les modules d'un cours
 * - `POST` : crée un nouveau module dans le cours
 */

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  createModuleForActor,
  listModulesForActor,
} from "@/lib/courses-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: courseId } = await context.params;

  try {
    const modules = await listModulesForActor(auth.actor, courseId);
    return Response.json({ modules });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: courseId } = await context.params;
  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const moduleRecord = await createModuleForActor(
      auth.actor,
      courseId,
      body.body,
    );
    return Response.json({ module: moduleRecord }, { status: 201 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
