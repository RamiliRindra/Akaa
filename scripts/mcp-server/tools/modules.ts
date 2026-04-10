/**
 * Tools MCP pour le CRUD des modules (unités pédagogiques à l'intérieur d'un cours).
 *
 *  - `akaa_list_modules`   : liste les modules d'un cours donné.
 *  - `akaa_create_module`  : crée un nouveau module dans un cours.
 *  - `akaa_update_module`  : modifie un module existant.
 *  - `akaa_delete_module`  : supprime un module (cascade sur chapitres).
 */

import { apiRequest } from "../client.js";
import type { Tool, ToolHandlerArgs } from "./types.js";

const moduleInputProperties = {
  title: {
    type: "string",
    description: "Titre du module (2-255 caractères).",
    minLength: 2,
  },
  description: {
    type: "string",
    description: "Description courte du module (optionnelle).",
  },
  order: {
    type: "number",
    description:
      "Position du module dans le cours (entier positif). Si omis, le module est ajouté à la fin.",
    minimum: 1,
  },
} as const;

function pickModuleInput(args: ToolHandlerArgs) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(moduleInputProperties)) {
    if (args[key] !== undefined) {
      result[key] = args[key];
    }
  }
  return result;
}

export const moduleTools: Tool[] = [
  {
    name: "akaa_list_modules",
    description:
      "Liste les modules d'un cours donné, triés par ordre croissant. Ne renvoie pas les chapitres — utilise `akaa_list_chapters` pour ça.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "UUID du cours parent.",
          format: "uuid",
        },
      },
      required: ["courseId"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "GET",
        path: `/api/v1/courses/${encodeURIComponent(String(args.courseId))}/modules`,
      });
    },
  },
  {
    name: "akaa_create_module",
    description:
      "Crée un nouveau module dans un cours. Si `order` est omis, le module est automatiquement placé en dernière position.",
    inputSchema: {
      type: "object",
      properties: {
        courseId: {
          type: "string",
          description: "UUID du cours parent.",
          format: "uuid",
        },
        ...moduleInputProperties,
      },
      required: ["courseId", "title"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      const { courseId, ...rest } = args;
      return apiRequest(config, {
        method: "POST",
        path: `/api/v1/courses/${encodeURIComponent(String(courseId))}/modules`,
        body: pickModuleInput(rest),
      });
    },
  },
  {
    name: "akaa_update_module",
    description:
      "Met à jour un module existant. Tous les champs sont optionnels — seuls ceux fournis sont modifiés.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du module à mettre à jour.",
          format: "uuid",
        },
        ...moduleInputProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      const { id, ...rest } = args;
      return apiRequest(config, {
        method: "PUT",
        path: `/api/v1/modules/${encodeURIComponent(String(id))}`,
        body: pickModuleInput(rest),
      });
    },
  },
  {
    name: "akaa_delete_module",
    description:
      "Supprime un module. Cascade sur les chapitres et leurs quiz. L'ordre des modules restants est renormalisé automatiquement.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du module à supprimer.",
          format: "uuid",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      await apiRequest(config, {
        method: "DELETE",
        path: `/api/v1/modules/${encodeURIComponent(String(args.id))}`,
      });
      return { ok: true };
    },
  },
];
