import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

function readEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split("\n")
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return acc;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        return acc;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key.length > 0) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

const localEnv = readEnvFile(resolve(process.cwd(), ".env.local"));
// DIRECT_URL (Neon direct) pour migrate ; DATABASE_URL en secours (CI/Railway).
// URL factice uniquement pour charger la config pendant `prisma generate` sans .env (aucune connexion au generate).
const directUrl =
  process.env.DIRECT_URL ??
  localEnv.DIRECT_URL ??
  process.env.DATABASE_URL ??
  localEnv.DATABASE_URL ??
  "postgresql://127.0.0.1:5432/prisma_generate_placeholder?sslmode=require";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI (migrations/introspection) doit cibler l'URL directe Neon.
    url: directUrl,
  },
});
