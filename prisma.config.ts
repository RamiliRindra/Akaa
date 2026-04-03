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
const directUrl = process.env.DIRECT_URL ?? localEnv.DIRECT_URL;

if (!directUrl) {
  throw new Error("DIRECT_URL est manquante dans l'environnement ou .env.local.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI (migrations/introspection) doit cibler l'URL directe Neon.
    url: directUrl,
  },
});
