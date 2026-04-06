import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CourseLevel,
  CourseStatus,
  PrismaClient,
  ProgramStatus,
  SessionAccessPolicy,
  SessionEnrollmentStatus,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import ws from "ws";

import { ensureDefaultBadges } from "../src/lib/gamification";
import { slugify } from "../src/lib/utils";
import { ensureXpLevelSettings } from "../src/lib/xp-settings";

neonConfig.webSocketConstructor = ws;

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

function sanitizePostgresUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

function createSeedClient() {
  const localEnv = readEnvFile(resolve(process.cwd(), ".env.local"));
  const serverlessConnectionString =
    process.env.NEON_SERVERLESS_DATABASE_URL ??
    localEnv.NEON_SERVERLESS_DATABASE_URL ??
    process.env.DATABASE_URL ??
    localEnv.DATABASE_URL ??
    process.env.DIRECT_URL ??
    localEnv.DIRECT_URL;

  const directConnectionString =
    process.env.DIRECT_URL ??
    localEnv.DIRECT_URL ??
    process.env.DATABASE_URL ??
    localEnv.DATABASE_URL;

  if (process.env.NODE_ENV === "production") {
    if (!directConnectionString) {
      throw new Error("DIRECT_URL ou DATABASE_URL est manquante pour le seed Prisma.");
    }

    const connectionString = sanitizePostgresUrl(directConnectionString);
    const pool = new Pool({
      connectionString,
      max: 1,
      ssl: /\.neon\.tech/i.test(connectionString) ? { rejectUnauthorized: true } : undefined,
    });

    return new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }

  if (!serverlessConnectionString) {
    throw new Error("DATABASE_URL / DIRECT_URL est manquante pour le seed Prisma.");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: serverlessConnectionString,
    }),
  });
}

const db = createSeedClient();

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "rindra@nexthope.net").trim().toLowerCase();
const TRAINER_EMAIL = (process.env.SEED_TRAINER_EMAIL ?? "formateur@akaa.local").trim().toLowerCase();
const LEARNER_EMAIL = (process.env.SEED_LEARNER_EMAIL ?? "apprenant@akaa.local").trim().toLowerCase();
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "AkaaDemo123!";

function addDays(days: number, hours = 9, minutes = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

async function upsertUser(input: {
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}) {
  return db.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      isActive: true,
      passwordHash: input.passwordHash,
      emailVerified: new Date(),
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: true,
      passwordHash: input.passwordHash,
      emailVerified: new Date(),
    },
  });
}

async function upsertCategory(input: {
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
}) {
  const slug = slugify(input.name);

  return db.category.upsert({
    where: { slug },
    update: {
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      order: input.order,
      isActive: true,
    },
    create: {
      name: input.name,
      slug,
      description: input.description,
      color: input.color,
      icon: input.icon,
      order: input.order,
      isActive: true,
    },
  });
}

async function upsertSessionByTitleAndTrainer(input: {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  accessPolicy: SessionAccessPolicy;
  trainerId: string;
  xpReward: number;
  courseId?: string;
  programId?: string;
  reminderMinutes?: number;
  location?: string;
  meetingUrl?: string;
}) {
  const existing = await db.trainingSession.findFirst({
    where: {
      title: input.title,
      trainerId: input.trainerId,
    },
    select: { id: true },
  });

  if (existing) {
    return db.trainingSession.update({
      where: { id: existing.id },
      data: {
        description: input.description,
        status: SessionStatus.SCHEDULED,
        accessPolicy: input.accessPolicy,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        isAllDay: false,
        location: input.location,
        meetingUrl: input.meetingUrl,
        reminderMinutes: input.reminderMinutes ?? 1440,
        xpReward: input.xpReward,
        courseId: input.courseId ?? null,
        programId: input.programId ?? null,
      },
    });
  }

  return db.trainingSession.create({
    data: {
      title: input.title,
      description: input.description,
      status: SessionStatus.SCHEDULED,
      accessPolicy: input.accessPolicy,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isAllDay: false,
      location: input.location,
      meetingUrl: input.meetingUrl,
      reminderMinutes: input.reminderMinutes ?? 1440,
      xpReward: input.xpReward,
      trainerId: input.trainerId,
      courseId: input.courseId,
      programId: input.programId,
    },
  });
}

async function main() {
  const passwordHash = await hash(DEFAULT_PASSWORD, 12);

  const [admin, trainer, learner] = await Promise.all([
    upsertUser({
      email: ADMIN_EMAIL,
      name: "Admin Akaa",
      role: UserRole.ADMIN,
      passwordHash,
    }),
    upsertUser({
      email: TRAINER_EMAIL,
      name: "Formateur Démo",
      role: UserRole.TRAINER,
      passwordHash,
    }),
    upsertUser({
      email: LEARNER_EMAIL,
      name: "Apprenant Démo",
      role: UserRole.LEARNER,
      passwordHash,
    }),
  ]);

  const [categoryAi] = await Promise.all([
    upsertCategory({
      name: "IA générative",
      description: "Pratiques d'usage, prompting et intégration au quotidien.",
      color: "#0F63FF",
      icon: "Sparkles",
      order: 1,
    }),
    upsertCategory({
      name: "Productivité",
      description: "Méthodes et outils pour mieux organiser son travail.",
      color: "#119da4",
      icon: "Rocket",
      order: 2,
    }),
    upsertCategory({
      name: "Management",
      description: "Pilotage d'équipe, animation et suivi opérationnel.",
      color: "#453750",
      icon: "Users",
      order: 3,
    }),
  ]);

  await Promise.all([ensureDefaultBadges(db), ensureXpLevelSettings(db)]);

  const course = await db.course.upsert({
    where: { slug: "fondamentaux-ia-generative" },
    update: {
      title: "Fondamentaux de l'IA générative",
      description: "Une formation démo pour découvrir le prompting, les cas d'usage et les limites des outils d'IA.",
      status: CourseStatus.PUBLISHED,
      level: CourseLevel.INTERMEDIATE,
      trainerId: trainer.id,
      categoryId: categoryAi.id,
      estimatedHours: 6,
      modules: {
        deleteMany: {},
        create: [
          {
            title: "Comprendre les bases",
            description: "Vocabulaire, concepts clés et cadre d'usage.",
            order: 1,
            chapters: {
              create: [
                {
                  title: "Panorama de l'IA générative",
                  order: 1,
                  estimatedMinutes: 15,
                  content:
                    "# Panorama de l'IA générative\n\nDécouvrez les concepts clés, les familles d'outils et les points de vigilance.\n\n- définitions\n- cas d'usage\n- limites\n",
                },
                {
                  title: "Premier prompt utile",
                  order: 2,
                  estimatedMinutes: 20,
                  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                  content:
                    "## Construire un prompt\n\nUn bon prompt précise le rôle, l'objectif, le contexte et le format attendu.\n\n```txt\nTu es un formateur. Résume ce document en 5 points.\n```\n",
                },
              ],
            },
          },
          {
            title: "Appliquer au quotidien",
            description: "Méthodes pour industrialiser l'usage de l'IA dans une équipe.",
            order: 2,
            chapters: {
              create: [
                {
                  title: "Checklist de fiabilisation",
                  order: 1,
                  estimatedMinutes: 12,
                  content:
                    "## Vérifier une réponse\n\n> Ne publiez jamais un contenu sans relecture.\n\n1. Contrôler les faits\n2. Vérifier les sources\n3. Reformuler si nécessaire\n",
                },
              ],
            },
          },
        ],
      },
    },
    create: {
      title: "Fondamentaux de l'IA générative",
      slug: "fondamentaux-ia-generative",
      description: "Une formation démo pour découvrir le prompting, les cas d'usage et les limites des outils d'IA.",
      status: CourseStatus.PUBLISHED,
      level: CourseLevel.INTERMEDIATE,
      trainerId: trainer.id,
      categoryId: categoryAi.id,
      estimatedHours: 6,
      modules: {
        create: [
          {
            title: "Comprendre les bases",
            description: "Vocabulaire, concepts clés et cadre d'usage.",
            order: 1,
            chapters: {
              create: [
                {
                  title: "Panorama de l'IA générative",
                  order: 1,
                  estimatedMinutes: 15,
                  content:
                    "# Panorama de l'IA générative\n\nDécouvrez les concepts clés, les familles d'outils et les points de vigilance.\n\n- définitions\n- cas d'usage\n- limites\n",
                },
                {
                  title: "Premier prompt utile",
                  order: 2,
                  estimatedMinutes: 20,
                  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                  content:
                    "## Construire un prompt\n\nUn bon prompt précise le rôle, l'objectif, le contexte et le format attendu.\n\n```txt\nTu es un formateur. Résume ce document en 5 points.\n```\n",
                },
              ],
            },
          },
          {
            title: "Appliquer au quotidien",
            description: "Méthodes pour industrialiser l'usage de l'IA dans une équipe.",
            order: 2,
            chapters: {
              create: [
                {
                  title: "Checklist de fiabilisation",
                  order: 1,
                  estimatedMinutes: 12,
                  content:
                    "## Vérifier une réponse\n\n> Ne publiez jamais un contenu sans relecture.\n\n1. Contrôler les faits\n2. Vérifier les sources\n3. Reformuler si nécessaire\n",
                },
              ],
            },
          },
        ],
      },
    },
  });

  const program = await db.trainingProgram.upsert({
    where: { slug: "parcours-demarrage-ia" },
    update: {
      title: "Parcours démarrage IA",
      description: "Un parcours démo prêt à être planifié en cohorte.",
      status: ProgramStatus.PUBLISHED,
      trainerId: trainer.id,
      courses: {
        deleteMany: {},
        create: [
          {
            courseId: course.id,
            order: 1,
          },
        ],
      },
    },
    create: {
      title: "Parcours démarrage IA",
      slug: "parcours-demarrage-ia",
      description: "Un parcours démo prêt à être planifié en cohorte.",
      status: ProgramStatus.PUBLISHED,
      trainerId: trainer.id,
      courses: {
        create: [
          {
            courseId: course.id,
            order: 1,
          },
        ],
      },
    },
  });

  const kickoffSession = await upsertSessionByTitleAndTrainer({
    title: "Atelier lancement IA générative",
    description: "Session d'introduction liée au cours de démonstration.",
    startsAt: addDays(7, 9, 30),
    endsAt: addDays(7, 11, 0),
    accessPolicy: SessionAccessPolicy.OPEN,
    trainerId: trainer.id,
    xpReward: 30,
    courseId: course.id,
    location: "Salle Horizon",
  });

  const cohortSession = await upsertSessionByTitleAndTrainer({
    title: "Cohorte parcours IA",
    description: "Session cohortée pour les apprenants approuvés du parcours.",
    startsAt: addDays(14, 13, 30),
    endsAt: addDays(14, 15, 0),
    accessPolicy: SessionAccessPolicy.SESSION_ONLY,
    trainerId: trainer.id,
    xpReward: 45,
    programId: program.id,
    meetingUrl: "https://meet.google.com/demo-akaa-cohorte",
  });

  await Promise.all([
    db.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: learner.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: learner.id,
        courseId: course.id,
      },
    }),
    db.sessionEnrollment.upsert({
      where: {
        userId_sessionId: {
          userId: learner.id,
          sessionId: kickoffSession.id,
        },
      },
      update: {
        status: SessionEnrollmentStatus.APPROVED,
      },
      create: {
        userId: learner.id,
        sessionId: kickoffSession.id,
        status: SessionEnrollmentStatus.APPROVED,
      },
    }),
    db.sessionEnrollment.upsert({
      where: {
        userId_sessionId: {
          userId: learner.id,
          sessionId: cohortSession.id,
        },
      },
      update: {
        status: SessionEnrollmentStatus.APPROVED,
      },
      create: {
        userId: learner.id,
        sessionId: cohortSession.id,
        status: SessionEnrollmentStatus.APPROVED,
      },
    }),
  ]);

  console.info("Seed Prisma terminé.");
  console.info(`Admin : ${admin.email}`);
  console.info(`Formateur : ${trainer.email}`);
  console.info(`Apprenant : ${learner.email}`);
  console.info(`Mot de passe par défaut : ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Erreur pendant le seed Prisma", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
