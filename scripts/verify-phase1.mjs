import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { BadgeConditionType, PrismaClient, XpSource } from "@prisma/client";

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split("\n")
    .reduce((acc, line) => {
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
const databaseUrl = process.env.DATABASE_URL ?? localEnv.DATABASE_URL;
const keepAuthUser = process.env.KEEP_AUTH_USER === "1";

if (!databaseUrl) {
  throw new Error("DATABASE_URL introuvable dans l'environnement ou .env.local");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

function computeLevel(totalXp) {
  return Math.floor(totalXp / 100) + 1;
}

async function main() {
  const runId = Date.now();
  const testEmail = `phase1+${runId}@akaa.local`;
  const badgeName = `Badge test Phase 1 ${runId}`;
  const plainPassword = "MotDePasse123!";
  const passwordHash = await hash(plainPassword, 10);

  let userId;
  let badgeId;

  try {
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Utilisateur Test Phase 1",
        passwordHash,
      },
    });
    userId = user.id;

    await prisma.streak.create({
      data: {
        userId: user.id,
        currentStreak: 3,
        longestStreak: 7,
        lastActivityDate: new Date(),
      },
    });

    const badge = await prisma.badge.create({
      data: {
        name: badgeName,
        description: "Badge de validation technique",
        iconUrl: "/badges/test.svg",
        conditionType: BadgeConditionType.MANUAL,
        conditionValue: null,
        xpBonus: 0,
      },
    });
    badgeId = badge.id;

    const xpDelta = 40;
    await prisma.$transaction(async (tx) => {
      await tx.xpTransaction.create({
        data: {
          userId: user.id,
          amount: xpDelta,
          source: XpSource.ADMIN,
          description: "Crédit de test Phase 1",
        },
      });

      const updatedTotalXp = user.totalXp + xpDelta;
      await tx.user.update({
        where: { id: user.id },
        data: {
          totalXp: {
            increment: xpDelta,
          },
          level: computeLevel(updatedTotalXp),
        },
      });
    });

    await prisma.userBadge.create({
      data: {
        userId: user.id,
        badgeId: badge.id,
      },
    });

    const loaded = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        xpTransactions: true,
        badges: {
          include: {
            badge: true,
          },
        },
        streak: true,
      },
    });

    if (!loaded) {
      throw new Error("Utilisateur de test introuvable.");
    }
    if (loaded.xpTransactions.length !== 1) {
      throw new Error("La relation User -> XpTransaction ne fonctionne pas.");
    }
    if (loaded.badges.length !== 1 || loaded.badges[0]?.badge.name !== badgeName) {
      throw new Error("La relation User -> UserBadge -> Badge ne fonctionne pas.");
    }
    if (!loaded.streak) {
      throw new Error("La relation User -> Streak ne fonctionne pas.");
    }

    await prisma.user.delete({ where: { id: user.id } });

    const [xpLeft, userBadgesLeft, streakLeft] = await prisma.$transaction([
      prisma.xpTransaction.count({ where: { userId: user.id } }),
      prisma.userBadge.count({ where: { userId: user.id } }),
      prisma.streak.count({ where: { userId: user.id } }),
    ]);

    if (xpLeft !== 0 || userBadgesLeft !== 0 || streakLeft !== 0) {
      throw new Error("Le ON DELETE CASCADE sur les tables de gamification n'est pas effectif.");
    }

    console.log("✅ Phase 1 validée : relations User -> XP/Badges/Streak + cascades OK.");

    if (keepAuthUser) {
      const authUserEmail = `auth+${runId}@akaa.local`;
      await prisma.user.create({
        data: {
          email: authUserEmail,
          name: "Compte Auth Test",
          passwordHash,
        },
      });

      console.log(`ℹ️ Compte credentials conservé: ${authUserEmail} / ${plainPassword}`);
    } else {
      console.log("ℹ️ Aucun compte credentials conservé. Utiliser KEEP_AUTH_USER=1 pour en garder un.");
    }
  } finally {
    if (badgeId) {
      await prisma.badge.deleteMany({ where: { id: badgeId } });
    } else {
      await prisma.badge.deleteMany({ where: { name: badgeName } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      await prisma.user.deleteMany({ where: { email: testEmail } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Vérification Phase 1 échouée :", error);
  process.exit(1);
});
