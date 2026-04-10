/**
 * Tools MCP pour le CRUD des cours.
 *
 * Chaque tool est une fine enveloppe au-dessus d'un endpoint `/api/v1/courses*`.
 * La vraie validation (titre min 3 caractères, URL de miniature valide, etc.)
 * est faite par l'API v1 via Zod — ici on se contente d'exposer les bons
 * champs à l'agent IA.
 */

import { apiRequest } from "../client.js";
import type { Tool, ToolHandlerArgs } from "./types.js";

const courseLevelEnum = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const courseStatusEnum = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const courseInputProperties = {
  title: {
    type: "string",
    description: "Titre du cours (3-255 caractères).",
    minLength: 3,
  },
  description: {
    type: "string",
    description: "Description courte du cours (optionnelle).",
  },
  categoryId: {
    type: "string",
    description:
      "UUID d'une catégorie existante (optionnel). Utiliser `akaa_list_categories` pour en obtenir.",
    format: "uuid",
  },
  thumbnailUrl: {
    type: "string",
    description: "URL d'une miniature (optionnel).",
    format: "uri",
  },
  estimatedHours: {
    type: "number",
    description: "Durée estimée en heures (entier positif, optionnel).",
    minimum: 1,
  },
  level: {
    type: "string",
    description: "Niveau du cours.",
    enum: courseLevelEnum,
    default: "BEGINNER",
  },
  status: {
    type: "string",
    description: "Statut de publication.",
    enum: courseStatusEnum,
    default: "DRAFT",
  },
} as const;

function pickCourseInput(args: ToolHandlerArgs) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(courseInputProperties)) {
    if (args[key] !== undefined) {
      result[key] = args[key];
    }
  }
  return result;
}

export const courseTools: Tool[] = [
  {
    name: "akaa_list_courses",
    description:
      "Liste les cours accessibles par le jeton (les cours du formateur, ou tous si admin). Supporte la pagination et un filtre par statut.",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "number",
          description: "Numéro de page (défaut 1).",
          minimum: 1,
          default: 1,
        },
        pageSize: {
          type: "number",
          description: "Nombre d'éléments par page (défaut 20, max 100).",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        status: {
          type: "string",
          description: "Filtre optionnel par statut.",
          enum: courseStatusEnum,
        },
      },
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "GET",
        path: "/api/v1/courses",
        query: {
          page: args.page as number | undefined,
          pageSize: args.pageSize as number | undefined,
          status: args.status as string | undefined,
        },
      });
    },
  },
  {
    name: "akaa_get_course",
    description:
      "Récupère un cours par son id, avec ses modules et chapitres (métadonnées seules, pas le contenu rich-text complet).",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du cours.",
          format: "uuid",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "GET",
        path: `/api/v1/courses/${encodeURIComponent(String(args.id))}`,
      });
    },
  },
  {
    name: "akaa_create_course",
    description:
      "Crée un nouveau cours. Le cours est créé avec le statut fourni (DRAFT par défaut). Le slug est généré automatiquement à partir du titre.",
    inputSchema: {
      type: "object",
      properties: courseInputProperties,
      required: ["title"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "POST",
        path: "/api/v1/courses",
        body: pickCourseInput(args),
      });
    },
  },
  {
    name: "akaa_update_course",
    description:
      "Met à jour les champs d'un cours existant. Tous les champs sont optionnels — seuls ceux fournis sont modifiés. Changer le titre met à jour le slug.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du cours à mettre à jour.",
          format: "uuid",
        },
        ...courseInputProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      const { id, ...rest } = args;
      return apiRequest(config, {
        method: "PUT",
        path: `/api/v1/courses/${encodeURIComponent(String(id))}`,
        body: pickCourseInput(rest),
      });
    },
  },
  {
    name: "akaa_delete_course",
    description:
      "Supprime définitivement un cours. Supprime aussi en cascade ses modules, chapitres, quiz, et les inscriptions associées. Action irréversible.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID du cours à supprimer.",
          format: "uuid",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      await apiRequest(config, {
        method: "DELETE",
        path: `/api/v1/courses/${encodeURIComponent(String(args.id))}`,
      });
      return { ok: true };
    },
  },
];
