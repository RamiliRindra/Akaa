/**
 * `GET /api/v1/me`
 *
 * Health check + identification de l'appelant. Permet à un agent IA de
 * vérifier que son jeton est bien valide et de connaître le compte associé
 * (utile pour le debug et pour afficher "Connecté en tant que ...").
 */

import { authenticateApiRequest } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  return Response.json({
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.user.role,
    },
    apiVersion: "v1",
  });
}
