#!/usr/bin/env node
/**
 * Serveur MCP (Model Context Protocol) pour Akaa.
 *
 * Ce script expose les routes `/api/v1/*` d'Akaa comme des "tools" MCP. Un
 * agent IA (Claude Desktop, Cursor, un autre client MCP) peut ainsi :
 *
 *  1. lister les cours du formateur,
 *  2. créer un cours complet (cours → modules → chapitres → quiz),
 *  3. mettre à jour / supprimer ce qui existe.
 *
 * ## Transport
 *
 * Le serveur utilise le transport **stdio** défini par la spec MCP. Chaque
 * message est une ligne JSON (NDJSON) envoyée sur stdin/stdout. La sortie
 * standard est réservée aux messages JSON-RPC — tout log doit passer par
 * stderr (sinon on casse le protocole).
 *
 * ## Dépendances
 *
 * Zéro dépendance runtime. On s'appuie sur `fetch` natif (Node 20+) et on
 * implémente à la main le petit sous-ensemble de JSON-RPC 2.0 nécessaire à
 * MCP (méthodes `initialize`, `tools/list`, `tools/call`, plus la notif
 * `notifications/initialized`). Rindra peut relire et modifier ce fichier
 * sans plonger dans un SDK tiers.
 *
 * ## Lancement
 *
 * ```
 * AKAA_API_BASE_URL=http://localhost:3000 \
 * AKAA_API_TOKEN=akaa_xxx... \
 *   npx tsx scripts/mcp-server/index.ts
 * ```
 *
 * Utilisé tel quel par Claude Desktop via la config MCP — voir
 * `claude_desktop_config.example.json`.
 */

import { createInterface } from "node:readline";

import {
  AkaaApiError,
  readClientConfigFromEnv,
  type ClientConfig,
} from "./client.js";
import { allTools, findToolByName } from "./tools/index.js";

const SERVER_NAME = "akaa-mcp";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2024-11-05";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

function logStderr(message: string, extra?: unknown) {
  const payload = extra === undefined ? message : `${message} ${JSON.stringify(extra)}`;
  process.stderr.write(`[akaa-mcp] ${payload}\n`);
}

function writeMessage(message: JsonRpcSuccess | JsonRpcError) {
  // NDJSON : une ligne par message. JSON.stringify ne produit pas de newline
  // mais on ajoute `\n` pour délimiter.
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function buildSuccess(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

function buildError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function handleInitialize(id: JsonRpcId): JsonRpcSuccess {
  return buildSuccess(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  });
}

function handleToolsList(id: JsonRpcId): JsonRpcSuccess {
  return buildSuccess(id, {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
}

async function handleToolsCall(
  id: JsonRpcId,
  params: unknown,
  config: ClientConfig,
): Promise<JsonRpcSuccess> {
  const parsed = params as { name?: unknown; arguments?: unknown } | null | undefined;
  const name = typeof parsed?.name === "string" ? parsed.name : "";
  const tool = findToolByName(name);

  if (!tool) {
    return buildSuccess(id, {
      content: [
        {
          type: "text",
          text: `Tool "${name}" inconnue. Tools disponibles : ${allTools
            .map((t) => t.name)
            .join(", ")}`,
        },
      ],
      isError: true,
    });
  }

  const args =
    parsed?.arguments && typeof parsed.arguments === "object" && !Array.isArray(parsed.arguments)
      ? (parsed.arguments as Record<string, unknown>)
      : {};

  try {
    const result = await tool.handler(config, args);
    return buildSuccess(id, {
      content: [
        {
          type: "text",
          text: JSON.stringify(result ?? null, null, 2),
        },
      ],
      isError: false,
    });
  } catch (error) {
    if (error instanceof AkaaApiError) {
      logStderr(`API error on ${name}:`, {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      return buildSuccess(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: {
                  status: error.status,
                  code: error.code,
                  message: error.message,
                  details: error.details,
                },
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      });
    }

    const message = error instanceof Error ? error.message : String(error);
    logStderr(`Unexpected error on ${name}: ${message}`);
    return buildSuccess(id, {
      content: [{ type: "text", text: `Erreur inattendue: ${message}` }],
      isError: true,
    });
  }
}

async function dispatch(
  request: JsonRpcRequest,
  config: ClientConfig,
): Promise<JsonRpcSuccess | JsonRpcError | null> {
  const id = request.id ?? null;

  switch (request.method) {
    case "initialize":
      return handleInitialize(id);

    case "notifications/initialized":
      // Notification : pas de réponse attendue.
      return null;

    case "tools/list":
      return handleToolsList(id);

    case "tools/call":
      return handleToolsCall(id, request.params, config);

    case "ping":
      return buildSuccess(id, {});

    default:
      // Notifications (id manquant) : on les ignore silencieusement pour
      // rester tolérants aux clients futurs.
      if (request.id === undefined) {
        return null;
      }
      return buildError(id, -32601, `Méthode inconnue: ${request.method}`);
  }
}

async function main() {
  let config: ClientConfig;
  try {
    config = readClientConfigFromEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStderr(`Configuration invalide: ${message}`);
    process.exit(1);
  }

  logStderr(
    `Serveur démarré (${allTools.length} tools, base=${config.baseUrl}). En attente de messages…`,
  );

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let request: JsonRpcRequest;
    try {
      request = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      logStderr(`Ligne JSON invalide ignorée: ${trimmed.slice(0, 120)}`);
      return;
    }

    // Traiter chaque message de façon indépendante — on n'attend pas les
    // précédents pour éviter de bloquer le serveur sur un appel lent.
    dispatch(request, config)
      .then((response) => {
        if (response) {
          writeMessage(response);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logStderr(`dispatch() a levé: ${message}`);
        writeMessage(buildError(request.id ?? null, -32603, `Erreur interne: ${message}`));
      });
  });

  rl.on("close", () => {
    logStderr("stdin fermé, arrêt du serveur.");
    process.exit(0);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logStderr(`Erreur fatale: ${message}`);
  process.exit(1);
});
