/**
 * Client HTTP pour appeler l'API v1 d'Akaa depuis le serveur MCP.
 *
 * Ce module est volontairement auto-suffisant : il ne dépend que de `fetch`
 * (disponible nativement sur Node 20+) et lit les deux variables d'environnement
 * attendues :
 *
 *  - `AKAA_API_BASE_URL` : URL de base sans slash final (ex: `http://localhost:3000`
 *    en local, ou `https://akaa.example.com` en production).
 *  - `AKAA_API_TOKEN`    : jeton `akaa_...` généré depuis `/admin/api-tokens`.
 *
 * Toutes les requêtes sont typées comme `unknown` côté réponse — les outils MCP
 * sont responsables de renvoyer le résultat tel quel à l'agent IA. Le serveur
 * MCP ne cherche pas à re-valider le schéma, l'API v1 l'a déjà fait.
 */

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class AkaaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AkaaApiError";
  }
}

export type ClientConfig = {
  baseUrl: string;
  token: string;
};

export function readClientConfigFromEnv(): ClientConfig {
  const baseUrl = (process.env.AKAA_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const token = (process.env.AKAA_API_TOKEN ?? "").trim();

  if (!baseUrl) {
    throw new Error(
      "AKAA_API_BASE_URL est manquante. Définis-la dans la config MCP (ex: http://localhost:3000).",
    );
  }

  if (!token) {
    throw new Error(
      "AKAA_API_TOKEN est manquante. Génère un jeton depuis /admin/api-tokens puis ajoute-le dans la config MCP.",
    );
  }

  if (!token.startsWith("akaa_")) {
    throw new Error(
      "AKAA_API_TOKEN semble invalide : il doit commencer par 'akaa_'.",
    );
  }

  return { baseUrl, token };
}

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

/**
 * Effectue une requête vers l'API v1 et renvoie le JSON parsé.
 *
 * Jette une `AkaaApiError` si la réponse n'est pas OK. En cas de 204, renvoie
 * `null` — utile pour les routes DELETE.
 */
export async function apiRequest<TResponse = unknown>(
  config: ClientConfig,
  options: RequestOptions,
): Promise<TResponse | null> {
  const url = new URL(options.path, config.baseUrl + "/");

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    Accept: "application/json",
  };

  let bodyPayload: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyPayload = JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), {
    method: options.method,
    headers,
    body: bodyPayload,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let parsed: unknown = undefined;

  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AkaaApiError(
        response.status,
        "INVALID_JSON",
        `Réponse API non-JSON (status ${response.status}): ${text.slice(0, 200)}`,
      );
    }
  }

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorBody;
    const code = errorBody.error?.code ?? `HTTP_${response.status}`;
    const message = errorBody.error?.message ?? `Requête API en échec (${response.status}).`;
    throw new AkaaApiError(response.status, code, message, errorBody.error?.details);
  }

  return (parsed ?? null) as TResponse | null;
}
