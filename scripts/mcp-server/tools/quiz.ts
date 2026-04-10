/**
 * Tools MCP pour le quiz rattaché à un chapitre.
 *
 * Le quiz est toujours lié à un chapitre (relation 1-1). Le remplacement est
 * atomique : `akaa_set_quiz` supprime l'éventuel quiz existant puis recrée
 * toutes les questions/options dans une transaction.
 *
 *  - `akaa_get_quiz`    : récupère le quiz d'un chapitre (ou null).
 *  - `akaa_set_quiz`    : remplace intégralement le quiz du chapitre.
 *  - `akaa_delete_quiz` : supprime le quiz du chapitre (idempotent).
 */

import { apiRequest } from "../client.js";
import type { Tool } from "./types.js";

const quizQuestionTypeEnum = ["SINGLE", "MULTIPLE"] as const;

export const quizTools: Tool[] = [
  {
    name: "akaa_get_quiz",
    description:
      "Récupère le quiz associé à un chapitre, avec toutes ses questions et options. Renvoie `null` si aucun quiz n'est défini.",
    inputSchema: {
      type: "object",
      properties: {
        chapterId: {
          type: "string",
          description: "UUID du chapitre.",
          format: "uuid",
        },
      },
      required: ["chapterId"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      return apiRequest(config, {
        method: "GET",
        path: `/api/v1/chapters/${encodeURIComponent(String(args.chapterId))}/quiz`,
      });
    },
  },
  {
    name: "akaa_set_quiz",
    description:
      "Remplace intégralement le quiz d'un chapitre (opération atomique). Si un quiz existait déjà il est supprimé et recréé. Chaque question doit avoir au moins 2 options et au moins une bonne réponse. Pour SINGLE il faut exactement UNE bonne réponse.",
    inputSchema: {
      type: "object",
      properties: {
        chapterId: {
          type: "string",
          description: "UUID du chapitre auquel rattacher le quiz.",
          format: "uuid",
        },
        title: {
          type: "string",
          description: "Titre du quiz (3 caractères minimum).",
          minLength: 3,
        },
        passingScore: {
          type: "number",
          description: "Score minimal pour réussir le quiz (1-100, défaut 70).",
          minimum: 1,
          maximum: 100,
          default: 70,
        },
        xpReward: {
          type: "number",
          description: "XP accordé à l'apprenant qui réussit le quiz (entier positif, défaut 50).",
          minimum: 1,
          default: 50,
        },
        questions: {
          type: "array",
          description: "Liste ordonnée des questions du quiz (au moins 1).",
          items: {
            type: "object",
            properties: {
              questionText: {
                type: "string",
                description: "Énoncé de la question (5 caractères minimum).",
                minLength: 5,
              },
              type: {
                type: "string",
                description:
                  "SINGLE = une seule bonne réponse. MULTIPLE = plusieurs bonnes réponses possibles.",
                enum: quizQuestionTypeEnum,
              },
              options: {
                type: "array",
                description: "Liste des réponses (au moins 2).",
                items: {
                  type: "object",
                  properties: {
                    optionText: {
                      type: "string",
                      description: "Texte de la réponse.",
                      minLength: 1,
                    },
                    isCorrect: {
                      type: "boolean",
                      description: "True si cette réponse est correcte.",
                    },
                  },
                  required: ["optionText", "isCorrect"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questionText", "type", "options"],
            additionalProperties: false,
          },
        },
      },
      required: ["chapterId", "title", "questions"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      const { chapterId, ...body } = args;
      return apiRequest(config, {
        method: "PUT",
        path: `/api/v1/chapters/${encodeURIComponent(String(chapterId))}/quiz`,
        body,
      });
    },
  },
  {
    name: "akaa_delete_quiz",
    description:
      "Supprime le quiz d'un chapitre. Idempotent : si aucun quiz n'existe l'opération réussit quand même.",
    inputSchema: {
      type: "object",
      properties: {
        chapterId: {
          type: "string",
          description: "UUID du chapitre.",
          format: "uuid",
        },
      },
      required: ["chapterId"],
      additionalProperties: false,
    },
    handler: async (config, args) => {
      await apiRequest(config, {
        method: "DELETE",
        path: `/api/v1/chapters/${encodeURIComponent(String(args.chapterId))}/quiz`,
      });
      return { ok: true };
    },
  },
];
