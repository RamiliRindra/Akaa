/**
 * Aggrégation de toutes les tools MCP exposées par le wrapper Akaa.
 *
 * L'ordre importe peu — le serveur MCP renvoie simplement ce tableau à l'agent
 * IA lors de l'appel `tools/list`. L'agent choisit ensuite laquelle appeler.
 */

import { chapterTools } from "./chapters.js";
import { courseTools } from "./courses.js";
import { metaTools } from "./meta.js";
import { moduleTools } from "./modules.js";
import { quizTools } from "./quiz.js";
import type { Tool } from "./types.js";

export const allTools: Tool[] = [
  ...metaTools,
  ...courseTools,
  ...moduleTools,
  ...chapterTools,
  ...quizTools,
];

export function findToolByName(name: string): Tool | undefined {
  return allTools.find((tool) => tool.name === name);
}
