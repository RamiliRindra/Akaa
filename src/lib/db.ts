import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
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
