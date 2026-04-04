import type { Prisma, PrismaClient } from "@prisma/client";

import type { CourseLevelValue } from "@/lib/course-level";

type SettingsDbClient = Prisma.TransactionClient | PrismaClient;

export const defaultXpLevelMultipliers: Record<CourseLevelValue, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 1.5,
  ADVANCED: 2,
};

export function applyXpMultiplier(baseXp: number, multiplier: number) {
  return Math.max(1, Math.round(baseXp * multiplier));
}

export async function ensureXpLevelSettings(db: SettingsDbClient) {
  await Promise.all(
    Object.entries(defaultXpLevelMultipliers).map(([level, multiplier]) =>
      db.xpLevelSetting.upsert({
        where: { level: level as CourseLevelValue },
        update: {},
        create: {
          level: level as CourseLevelValue,
          multiplier,
        },
      }),
    ),
  );
}

export async function getXpLevelMultiplier(db: SettingsDbClient, level: CourseLevelValue) {
  await ensureXpLevelSettings(db);

  const setting = await db.xpLevelSetting.findUnique({
    where: { level },
    select: { multiplier: true },
  });

  return setting ? Number(setting.multiplier) : defaultXpLevelMultipliers[level];
}

export async function getAllXpLevelSettings(db: SettingsDbClient) {
  await ensureXpLevelSettings(db);

  const settings = await db.xpLevelSetting.findMany({
    orderBy: { level: "asc" },
    select: {
      level: true,
      multiplier: true,
    },
  });

  return settings.map((setting) => ({
    level: setting.level,
    multiplier: Number(setting.multiplier),
  }));
}
