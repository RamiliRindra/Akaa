/**
 * `/api/v1/modules/[id]/chapters`
 *
 * - `GET` : liste les chapitres d'un module
 * - `POST` : crée un nouveau chapitre dans le module
 */

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  createChapterForActor,
  listChaptersForActor,
} from "@/lib/courses-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: moduleId } = await context.params;

  try {
    const chapters = await listChaptersForActor(auth.actor, moduleId);
    return Response.json({ chapters });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: moduleId } = await context.params;
  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const chapter = await createChapterForActor(auth.actor, moduleId, body.body);
    return Response.json({ chapter }, { status: 201 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
