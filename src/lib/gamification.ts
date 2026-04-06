import { Prisma, type PrismaClient } from "@prisma/client";
import { AttendanceStatus, BadgeConditionType, UserRole, XpSource } from "@prisma/client";
import { randomUUID } from "crypto";

import type { CourseLevelValue } from "@/lib/course-level";
import { applyXpMultiplier, getXpLevelMultiplier } from "@/lib/xp-settings";

type GamificationDbClient = Prisma.TransactionClient | PrismaClient;

type DefaultBadgeDefinition = {
  name: string;
  description: string;
  iconUrl: string;
  conditionType: BadgeConditionType;
  conditionValue: number | null;
  xpBonus: number;
};

type AwardXpInput = {
  userId: string;
  amount: number;
  source: XpSource;
  sourceId?: string;
  description: string;
};

type ActivityGamificationInput = {
  userId: string;
  chapterId?: string;
  quizId?: string;
  quizXpReward?: number;
  perfectQuiz?: boolean;
  updateStreak?: boolean;
  courseLevel?: CourseLevelValue;
};

type SessionGamificationInput = {
  userId: string;
  sessionId: string;
  sessionTitle: string;
  xpReward: number;
  attendanceStatus: AttendanceStatus;
};

export type GamificationSummary = {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  unlockedBadges: string[];
  currentStreak: number;
};

const DEFAULT_BADGES: DefaultBadgeDefinition[] = [
  {
    name: "Premier Pas",
    description: "Compléter un premier cours.",
    iconUrl: "/badges/premier-pas.svg",
    conditionType: BadgeConditionType.COURSES_COMPLETED,
    conditionValue: 1,
    xpBonus: 20,
  },
  {
    name: "Assidu",
    description: "Maintenir un streak de 7 jours.",
    iconUrl: "/badges/assidu.svg",
    conditionType: BadgeConditionType.STREAK,
    conditionValue: 7,
    xpBonus: 30,
  },
  {
    name: "Marathonien",
    description: "Maintenir un streak de 30 jours.",
    iconUrl: "/badges/marathonien.svg",
    conditionType: BadgeConditionType.STREAK,
    conditionValue: 30,
    xpBonus: 100,
  },
  {
    name: "Quiz Master",
    description: "Obtenir 10 quiz parfaits.",
    iconUrl: "/badges/quiz-master.svg",
    conditionType: BadgeConditionType.QUIZ_PERFECT,
    conditionValue: 10,
    xpBonus: 50,
  },
  {
    name: "Érudit",
    description: "Accumuler 500 XP.",
    iconUrl: "/badges/erudit.svg",
    conditionType: BadgeConditionType.XP_THRESHOLD,
    conditionValue: 500,
    xpBonus: 25,
  },
  {
    name: "Expert",
    description: "Accumuler 2000 XP.",
    iconUrl: "/badges/expert.svg",
    conditionType: BadgeConditionType.XP_THRESHOLD,
    conditionValue: 2000,
    xpBonus: 50,
  },
  {
    name: "Premier Atelier",
    description: "Participer à une première session.",
    iconUrl: "/badges/premier-pas.svg",
    conditionType: BadgeConditionType.SESSIONS_ATTENDED,
    conditionValue: 1,
    xpBonus: 15,
  },
  {
    name: "Participant Assidu",
    description: "Participer à 5 sessions.",
    iconUrl: "/badges/assidu.svg",
    conditionType: BadgeConditionType.SESSIONS_ATTENDED,
    conditionValue: 5,
    xpBonus: 40,
  },
];

function getTodayDate() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getLevelFromXp(totalXp: number) {
  return Math.floor(totalXp / 100) + 1;
}

export function shouldRewardSessionAttendance(status: AttendanceStatus) {
  return status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE;
}

export async function ensureDefaultBadges(db: GamificationDbClient) {
  const existingCount = await db.badge.count({
    where: {
      name: {
        in: DEFAULT_BADGES.map((badge) => badge.name),
      },
    },
  });

  if (existingCount === DEFAULT_BADGES.length) {
    return;
  }

  for (const badge of DEFAULT_BADGES) {
    await db.badge.upsert({
      where: { name: badge.name },
      update: {
        description: badge.description,
        iconUrl: badge.iconUrl,
        conditionType: badge.conditionType,
        conditionValue: badge.conditionValue,
        xpBonus: badge.xpBonus,
        isActive: true,
      },
      create: {
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        conditionType: badge.conditionType,
        conditionValue: badge.conditionValue,
        xpBonus: badge.xpBonus,
      },
    });
  }
}

async function awardXp(db: GamificationDbClient, input: AwardXpInput) {
  if (input.amount <= 0) {
    return {
      awarded: false,
      newLevel: null as number | null,
    };
  }

  if (input.sourceId) {
    const existingTransaction = await db.xpTransaction.findFirst({
      where: {
        userId: input.userId,
        source: input.source,
        sourceId: input.sourceId,
      },
      select: { id: true },
    });

    if (existingTransaction) {
      const user = await db.user.findUnique({
        where: { id: input.userId },
        select: { level: true },
      });

      return {
        awarded: false,
        newLevel: user?.level ?? null,
      };
    }
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: {
      totalXp: true,
      level: true,
    },
  });

  const nextTotalXp = user.totalXp + input.amount;
  const nextLevel = getLevelFromXp(nextTotalXp);

  await db.xpTransaction.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      source: input.source,
      sourceId: input.sourceId,
      description: input.description,
    },
  });

  await db.user.update({
    where: { id: input.userId },
    data: {
      totalXp: nextTotalXp,
      level: nextLevel,
    },
  });

  return {
    awarded: true,
    newLevel: nextLevel,
  };
}

async function updateDailyStreak(db: GamificationDbClient, userId: string) {
  const today = getTodayDate();
  const yesterday = addDays(today, -1);
  const streak = await db.streak.findUnique({
    where: { userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
    },
  });

  if (!streak) {
    return db.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      },
      select: {
        currentStreak: true,
        longestStreak: true,
      },
    });
  }

  const lastActivity = streak.lastActivityDate
    ? new Date(streak.lastActivityDate.toISOString().slice(0, 10))
    : null;

  if (lastActivity && lastActivity.getTime() === today.getTime()) {
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    };
  }

  const nextCurrentStreak =
    lastActivity && lastActivity.getTime() === yesterday.getTime()
      ? streak.currentStreak + 1
      : 1;
  const nextLongestStreak = Math.max(streak.longestStreak, nextCurrentStreak);

  return db.streak.update({
    where: { userId },
    data: {
      currentStreak: nextCurrentStreak,
      longestStreak: nextLongestStreak,
      lastActivityDate: today,
    },
    select: {
      currentStreak: true,
      longestStreak: true,
    },
  });
}

async function evaluateAutomaticBadges(db: GamificationDbClient, userId: string) {
  const [user, streak, completedCourses, perfectQuizAttempts, attendedSessions, existingBadges, activeBadges] =
    await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          totalXp: true,
        },
      }),
      db.streak.findUnique({
        where: { userId },
        select: {
          currentStreak: true,
        },
      }),
      db.enrollment.count({
        where: {
          userId,
          progressPercent: 100,
        },
      }),
      db.quizAttempt.findMany({
        where: {
          userId,
          passed: true,
          score: 100,
        },
        distinct: ["quizId"],
        select: {
          quizId: true,
        },
      }),
      db.sessionAttendance.count({
        where: {
          userId,
          status: {
            in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE],
          },
        },
      }),
      db.userBadge.findMany({
        where: { userId },
        select: {
          badgeId: true,
        },
      }),
      db.badge.findMany({
        where: {
          isActive: true,
          conditionType: { not: BadgeConditionType.MANUAL },
        },
        select: {
          id: true,
          name: true,
          conditionType: true,
          conditionValue: true,
          xpBonus: true,
        },
      }),
    ]);

  const ownedBadgeIds = new Set(existingBadges.map((badge) => badge.badgeId));
  const unlockedBadgeNames: string[] = [];

  for (const badge of activeBadges) {
    if (ownedBadgeIds.has(badge.id)) {
      continue;
    }

    const threshold = badge.conditionValue ?? 0;
    let unlocked = false;

    switch (badge.conditionType) {
      case BadgeConditionType.XP_THRESHOLD:
        unlocked = user.totalXp >= threshold;
        break;
      case BadgeConditionType.COURSES_COMPLETED:
        unlocked = completedCourses >= threshold;
        break;
      case BadgeConditionType.STREAK:
        unlocked = (streak?.currentStreak ?? 0) >= threshold;
        break;
      case BadgeConditionType.QUIZ_PERFECT:
        unlocked = perfectQuizAttempts.length >= threshold;
        break;
      case BadgeConditionType.SESSIONS_ATTENDED:
        unlocked = attendedSessions >= threshold;
        break;
      default:
        unlocked = false;
        break;
    }

    if (!unlocked) {
      continue;
    }

    let awardedNow = false;

    try {
      await db.userBadge.create({
        data: {
          id: randomUUID(),
          userId,
          badgeId: badge.id,
        },
      });
      awardedNow = true;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    if (!awardedNow) {
      continue;
    }

    if (badge.xpBonus > 0) {
      await awardXp(db, {
        userId,
        amount: badge.xpBonus,
        source: XpSource.BADGE,
        sourceId: `badge:${badge.id}`,
        description: `Badge débloqué : ${badge.name}`,
      });
    }

    unlockedBadgeNames.push(badge.name);
  }

  return unlockedBadgeNames;
}

export async function applyLearningGamification(
  db: GamificationDbClient,
  input: ActivityGamificationInput,
): Promise<GamificationSummary> {
  await ensureDefaultBadges(db);

  const userBefore = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: {
      role: true,
      level: true,
    },
  });

  if (userBefore.role !== UserRole.LEARNER) {
    const streak = await db.streak.findUnique({
      where: { userId: input.userId },
      select: {
        currentStreak: true,
      },
    });

    return {
      xpGained: 0,
      levelBefore: userBefore.level,
      levelAfter: userBefore.level,
      unlockedBadges: [],
      currentStreak: streak?.currentStreak ?? 0,
    };
  }

  let xpGained = 0;
  let currentStreak = 0;
  let resolvedCourseLevel = input.courseLevel;

  if (!resolvedCourseLevel && input.chapterId) {
    const chapter = await db.chapter.findUnique({
      where: { id: input.chapterId },
      select: {
        module: {
          select: {
            course: {
              select: {
                level: true,
              },
            },
          },
        },
      },
    });

    resolvedCourseLevel = (chapter?.module.course.level as CourseLevelValue | undefined) ?? "BEGINNER";
  }

  const xpMultiplier = resolvedCourseLevel
    ? await getXpLevelMultiplier(db, resolvedCourseLevel)
    : 1;

  if (input.updateStreak !== false) {
    const streak = await updateDailyStreak(db, input.userId);
    currentStreak = streak.currentStreak;

    if (streak.currentStreak >= 7) {
      const streakXp = await awardXp(db, {
        userId: input.userId,
        amount: 30,
        source: XpSource.STREAK,
        sourceId: "streak:7",
        description: "Récompense de streak de 7 jours",
      });

      if (streakXp.awarded) {
        xpGained += 30;
      }
    }
  } else {
    const streak = await db.streak.findUnique({
      where: { userId: input.userId },
      select: {
        currentStreak: true,
      },
    });
    currentStreak = streak?.currentStreak ?? 0;
  }

  if (input.chapterId) {
    const chapterXpAmount = applyXpMultiplier(10, xpMultiplier);
    const chapterXp = await awardXp(db, {
      userId: input.userId,
      amount: chapterXpAmount,
      source: XpSource.CHAPTER,
      sourceId: `chapter:${input.chapterId}`,
      description: "Chapitre terminé",
    });

    if (chapterXp.awarded) {
      xpGained += chapterXpAmount;
    }
  }

  if (input.quizId && input.quizXpReward) {
    const quizXpAmount = applyXpMultiplier(input.quizXpReward, xpMultiplier);
    const quizXp = await awardXp(db, {
      userId: input.userId,
      amount: quizXpAmount,
      source: XpSource.QUIZ,
      sourceId: `quiz:${input.quizId}`,
      description: "Quiz réussi",
    });

    if (quizXp.awarded) {
      xpGained += quizXpAmount;
    }
  }

  if (input.quizId && input.perfectQuiz) {
    const perfectXpAmount = applyXpMultiplier(25, xpMultiplier);
    const perfectXp = await awardXp(db, {
      userId: input.userId,
      amount: perfectXpAmount,
      source: XpSource.QUIZ,
      sourceId: `quiz-perfect:${input.quizId}`,
      description: "Quiz parfait",
    });

    if (perfectXp.awarded) {
      xpGained += perfectXpAmount;
    }
  }

  const unlockedBadges = await evaluateAutomaticBadges(db, input.userId);
  const userAfter = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: {
      level: true,
    },
  });

  return {
    xpGained,
    levelBefore: userBefore.level,
    levelAfter: userAfter.level,
    unlockedBadges,
    currentStreak,
  };
}

export async function applySessionAttendanceGamification(
  db: GamificationDbClient,
  input: SessionGamificationInput,
): Promise<GamificationSummary> {
  await ensureDefaultBadges(db);

  const [userBefore, streak] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: {
        role: true,
        level: true,
      },
    }),
    db.streak.findUnique({
      where: { userId: input.userId },
      select: {
        currentStreak: true,
      },
    }),
  ]);

  if (userBefore.role !== UserRole.LEARNER) {
    return {
      xpGained: 0,
      levelBefore: userBefore.level,
      levelAfter: userBefore.level,
      unlockedBadges: [],
      currentStreak: streak?.currentStreak ?? 0,
    };
  }

  let xpGained = 0;

  if (shouldRewardSessionAttendance(input.attendanceStatus)) {
    const sessionXp = await awardXp(db, {
      userId: input.userId,
      amount: input.xpReward,
      source: XpSource.SESSION,
      sourceId: input.sessionId,
      description: `Présence à la session « ${input.sessionTitle} »`,
    });

    if (sessionXp.awarded) {
      xpGained += input.xpReward;
    }
  }

  const unlockedBadges = await evaluateAutomaticBadges(db, input.userId);
  const userAfter = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: {
      level: true,
    },
  });

  return {
    xpGained,
    levelBefore: userBefore.level,
    levelAfter: userAfter.level,
    unlockedBadges,
    currentStreak: streak?.currentStreak ?? 0,
  };
}
