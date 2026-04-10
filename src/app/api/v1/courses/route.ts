/**
 * `GET /api/v1/courses` — liste les cours de l'appelant (ou tous si ADMIN)
 * `POST /api/v1/courses` — crée un nouveau cours
 *
 * Paramètres de query (GET) :
 * - `page` : numéro de page (défaut 1)
 * - `pageSize` : taille de page (défaut 20, max 100)
 * - `status` : filtre `DRAFT`, `PUBLISHED`, `ARCHIVED`
 */

import { CourseStatus } from "@prisma/client";

import {
  authenticateApiRequest,
  mapCoursesCoreErrorToResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  createCourseForActor,
  listCoursesForActor,
  type ListQuery,
} from "@/lib/courses-core";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const rawPage = url.searchParams.get("page");
  const rawPageSize = url.searchParams.get("pageSize");
  const rawStatus = url.searchParams.get("status");

  const page = Math.max(1, Number(rawPage ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(rawPageSize ?? "20") || 20));
  const status =
    rawStatus && Object.values(CourseStatus).includes(rawStatus as CourseStatus)
      ? (rawStatus as CourseStatus)
      : undefined;

  const query: ListQuery = { page, pageSize, status };

  try {
    const result = await listCoursesForActor(auth.actor, query);
    return Response.json(result);
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const course = await createCourseForActor(auth.actor, body.body);
    return Response.json({ course }, { status: 201 });
  } catch (error) {
    return mapCoursesCoreErrorToResponse(error);
  }
}
