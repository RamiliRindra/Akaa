/**
 * Types partagés par toutes les tools MCP exposées par le wrapper Akaa.
 *
 * Une tool est décrite par :
 *  - `name` : identifiant MCP (préfixé `akaa_` pour éviter les collisions).
 *  - `description` : texte lu par l'agent IA pour décider quand l'appeler.
 *  - `inputSchema` : JSON Schema brut (draft 2020-12) attendu par le protocole
 *    MCP. On écrit les schémas à la main pour garder zéro dépendance.
 *  - `handler` : fonction async qui reçoit les arguments validés (on les passe
 *    tels quels — la validation stricte est faite par l'API v1 via Zod).
 */

import type { ClientConfig } from "../client.js";

export type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: readonly string[];
  description?: string;
  additionalProperties?: boolean | JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  format?: string;
  default?: unknown;
};

export type ToolHandlerArgs = Record<string, unknown>;

export type Tool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (config: ClientConfig, args: ToolHandlerArgs) => Promise<unknown>;
};
