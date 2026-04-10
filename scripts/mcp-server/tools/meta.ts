/**
 * Tools MCP "meta" — health check et lecture seule des données utilitaires.
 *
 *  - `akaa_whoami`        : vérifie que le jeton est valide et renvoie le user.
 *  - `akaa_list_categories`: liste les catégories de formation actives, utiles
 *     pour ensuite passer un `categoryId` à `akaa_create_course`.
 */

import { apiRequest } from "../client.js";
import type { Tool } from "./types.js";

export const metaTools: Tool[] = [
  {
    name: "akaa_whoami",
    description:
      "Vérifie que le jeton API Akaa est valide et renvoie l'utilisateur associé (id, email, nom, rôle). À utiliser comme health check avant toute autre opération.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async (config) => {
      return apiRequest(config, { method: "GET", path: "/api/v1/me" });
    },
  },
  {
    name: "akaa_list_categories",
    description:
      "Liste les catégories de formation actives. Utile pour obtenir le `categoryId` à passer lors de la création d'un cours.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async (config) => {
      return apiRequest(config, { method: "GET", path: "/api/v1/categories" });
    },
  },
];
