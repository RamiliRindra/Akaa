import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/** `channel_binding=require` (parfois dans l’URL Neon) n’est pas supporté par le driver `pg`. */
function sanitizePostgresUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    const raw =
      process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? process.env.NEON_SERVERLESS_DATABASE_URL;
    if (!raw) {
      throw new Error("DATABASE_URL (ou DIRECT_URL) est manquante en production.");
    }
    const connectionString = sanitizePostgresUrl(raw);
    const pool = globalForPrisma.pgPool ?? new Pool({ connectionString });
    globalForPrisma.pgPool = pool;
    return new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }

  const connectionString =
    process.env.NEON_SERVERLESS_DATABASE_URL ??
    process.env.DATABASE_URL ??
    process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL / DIRECT_URL est manquante.");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
