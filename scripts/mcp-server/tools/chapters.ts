/**
 * Tools MCP pour le CRUD des chapitres (unités de contenu à l'intérieur d'un module).
 *
 *  - `akaa_list_chapters`  : liste les chapitres d'un module.
 *  - `akaa_get_chapter`    : récupère un chapitre complet (avec son contenu markdown).
 *  - `akaa_create_chapter` : crée un chapitre avec contenu et vidéo optionnelle.
 *  - `akaa_update_chapter` : modifie un chapitre existant.
 *  - `akaa_delete_chapter` : supprime un chapitre (cascade sur le quiz associé).
 */

import { apiRequest } from "../client.js";
import type { Tool, ToolHandlerArgs } from "./types.js";

const chapterInputProperties = {
  title: {
    type: "string",
    description: "Titre du chapitre (2-255 caractères).",
    minLength: 2,
  },
  content: {
    type: "string",
    description:
      "Contenu du chapitre en markdown. Supporte headings, listes, code blocks, images, tableaux.",
  },
  videoUrl: {
    type: "string",
    description:
      "URL de vidéo (YouTube ou Google Drive uniquement). Optionnelle. Si fournie, le type est dérivé automatiquement.",
  },
  estimatedMinutes: {
    type: "number",
    description: "Durée estimée en minutes (entier positif, optionnel).",
    minimum: 1,
  },
  order: {
    type: "number",
    description:
      "Position du chapitre dans le module. Si omis, le chapitre est ajouté à la fin.",
    minimum: 1,
  },
} as const;

function pickChapterInput(args: ToolHandlerArgs) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(chapterInputProperties)) {
    if (args[key] !== undefined) {
      result[key] = args[key];
    }
  }
  return result;
}

export const chapterTools: Tool[] = [
  {
    name: "akaa_list_chapters",
    description:
      "Liste les chapitres d'un module donné (métadonnées seulement : id, title, order, videoUrl, estimatedMinutes). Utilise `akaa_get_chapter` pour obtenir le contenu complet.",
    inputSchema: {
      type: "object",
      properties: {
        moduleId: {
          type: "string",
          description: "UUID du module parent.",
          format: "uuid",
        },
      },
      required: ["moduleId"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "GET",
        path: `/api/v1/modules/${encodeURIComponent(String(args.moduleId))}/chapters`,
      });
    },
  },
  {
    name: "akaa_get_chapter",
    description:
      "Récupère un chapitre complet par son id, incluant son contenu markdown.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du chapitre.",
          format: "uuid",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "GET",
        path: `/api/v1/chapters/${encodeURIComponent(String(args.id))}`,
      });
    },
  },
  {
    name: "akaa_create_chapter",
    description:
      "Crée un nouveau chapitre dans un module. Si `order` est omis, le chapitre est placé en dernière position. Si `content` est omis, le chapitre est créé avec un contenu markdown vide.",
    inputSchema: {
      type: "object",
      properties: {
        moduleId: {
          type: "string",
          description: "UUID du module parent.",
          format: "uuid",
        },
        ...chapterInputProperties,
      },
      required: ["moduleId", "title"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      const { moduleId, ...rest } = args;
      return apiRequest(config, {
        method: "POST",
        path: `/api/v1/modules/${encodeURIComponent(String(moduleId))}/chapters`,
        body: pickChapterInput(rest),
      });
    },
  },
  {
    name: "akaa_update_chapter",
    description:
      "Met à jour un chapitre existant. Tous les champs sont optionnels — seuls ceux fournis sont modifiés.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du chapitre à mettre à jour.",
          format: "uuid",
        },
        ...chapterInputProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      const { id, ...rest } = args;
      return apiRequest(config, {
        method: "PUT",
        path: `/api/v1/chapters/${encodeURIComponent(String(id))}`,
        body: pickChapterInput(rest),
      });
    },
  },
  {
    name: "akaa_delete_chapter",
    description:
      "Supprime un chapitre. Cascade sur le quiz associé s'il existe. L'ordre des chapitres restants est renormalisé automatiquement.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du chapitre à supprimer.",
          format: "uuid",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      await apiRequest(config, {
        method: "DELETE",
        path: `/api/v1/chapters/${encodeURIComponent(String(args.id))}`,
      });
      return { ok: true };
    },
  },
];
