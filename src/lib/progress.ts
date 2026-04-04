import type { Prisma, PrismaClient } from "@prisma/client";
import { ChapterProgressStatus } from "@prisma/client";

type ProgressDbClient = Prisma.TransactionClient | PrismaClient;

export async function ensureEnrollment(
  db: ProgressDbClient,
  userId: string,
  courseId: string,
) {
  return db.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {},
    create: {
      userId,
      courseId,
    },
  });
}

export async function markChapterInProgress(
  db: ProgressDbClient,
  userId: string,
  chapterId: string,
) {
  const now = new Date();
  const existing = await db.chapterProgress.findUnique({
    where: {
      userId_chapterId: {
        userId,
        chapterId,
      },
    },
    select: {
      startedAt: true,
    },
  });

  return db.chapterProgress.upsert({
    where: {
      userId_chapterId: {
        userId,
        chapterId,
      },
    },
    update: {
      status: {
        set: ChapterProgressStatus.IN_PROGRESS,
      },
      startedAt: {
        set: existing?.startedAt ?? now,
      },
      completedAt: {
        set: null,
      },
    },
    create: {
      userId,
      chapterId,
      status: ChapterProgressStatus.IN_PROGRESS,
      startedAt: now,
    },
  });
}

export async function markChapterCompleted(
  db: ProgressDbClient,
  userId: string,
  chapterId: string,
) {
  const now = new Date();
  const existing = await db.chapterProgress.findUnique({
    where: {
      userId_chapterId: {
        userId,
        chapterId,
      },
    },
    select: {
      startedAt: true,
    },
  });

  return db.chapterProgress.upsert({
    where: {
      userId_chapterId: {
        userId,
        chapterId,
      },
    },
    update: {
      status: {
        set: ChapterProgressStatus.COMPLETED,
      },
      startedAt: {
        set: existing?.startedAt ?? now,
      },
      completedAt: {
        set: now,
      },
    },
    create: {
      userId,
      chapterId,
      status: ChapterProgressStatus.COMPLETED,
      startedAt: now,
      completedAt: now,
    },
  });
}

export async function recalculateEnrollmentProgress(
  db: ProgressDbClient,
  userId: string,
  courseId: string,
) {
  const [totalChapters, completedChapters] = await Promise.all([
    db.chapter.count({
      where: {
        module: {
          courseId,
        },
      },
    }),
    db.chapterProgress.count({
      where: {
        userId,
        status: ChapterProgressStatus.COMPLETED,
        chapter: {
          module: {
            courseId,
          },
        },
      },
    }),
  ]);

  const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return db.enrollment.update({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    data: {
      progressPercent,
      completedAt: progressPercent === 100 ? new Date() : null,
    },
    select: {
      progressPercent: true,
      completedAt: true,
    },
  });
}
