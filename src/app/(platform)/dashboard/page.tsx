import { ChapterProgressStatus, CourseStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseCard } from "@/components/course/course-card";
import { ProgressBar } from "@/components/course/progress-bar";
import { BadgeCard } from "@/components/gamification/badge-card";
import { getHomePathForRole } from "@/lib/auth-config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultBadges } from "@/lib/gamification";
import { formatDate } from "@/lib/utils";

export default async function LearnerDashboardPage() {
  const session = await auth();

  if (session?.user?.role === "TRAINER" || session?.user?.role === "ADMIN") {
    redirect(getHomePathForRole(session.user.role));
  }

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  await ensureDefaultBadges(db);

  const [user, enrollments, totalCompletedChapters, totalPublishedChapters, recentBadges, recentTransactions] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        totalXp: true,
        level: true,
        streak: {
          select: {
            currentStreak: true,
            longestStreak: true,
          },
        },
      },
    }),
    db.enrollment.findMany({
      where: { userId },
      orderBy: [{ progressPercent: "desc" }, { enrolledAt: "desc" }],
      select: {
        id: true,
        progressPercent: true,
        completedAt: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            estimatedHours: true,
            status: true,
            category: {
              select: {
                name: true,
              },
            },
            modules: {
              select: {
                id: true,
                chapters: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.chapterProgress.count({
      where: {
        userId,
        status: ChapterProgressStatus.COMPLETED,
        chapter: {
          module: {
            course: {
              status: CourseStatus.PUBLISHED,
              enrollments: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    }),
    db.chapter.count({
      where: {
        module: {
          course: {
            status: CourseStatus.PUBLISHED,
            enrollments: {
              some: {
                userId,
              },
            },
          },
        },
      },
    }),
    db.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      take: 4,
      select: {
        earnedAt: true,
        badge: {
          select: {
            name: true,
            description: true,
            iconUrl: true,
          },
        },
      },
    }),
    db.xpTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  const publishedEnrollments = enrollments.filter((enrollment) => enrollment.course.status === CourseStatus.PUBLISHED);
  const overallProgress = totalPublishedChapters
    ? Math.round((totalCompletedChapters / totalPublishedChapters) * 100)
    : 0;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#0c0910]">Mon tableau de bord</h1>
        <p className="text-sm text-[#0c0910]/70">
          Suivez votre progression chapitre par chapitre et reprenez rapidement vos cours en cours.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">XP total</p>
          <p className="mt-2 text-3xl font-bold text-[#453750]">{user.totalXp}</p>
        </article>
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Niveau</p>
          <p className="mt-2 text-3xl font-bold text-[#0F63FF]">{user.level}</p>
        </article>
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Streak actuel</p>
          <p className="mt-2 text-3xl font-bold text-[#ffc857]">{user.streak?.currentStreak ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Record de streak</p>
          <p className="mt-2 text-3xl font-bold text-[#119da4]">{user.streak?.longestStreak ?? 0}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0c0910]">Mes cours</h2>
            <Link href="/courses" className="text-sm font-medium text-[#0F63FF] hover:underline">
              Voir le catalogue
            </Link>
          </div>

          {publishedEnrollments.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {publishedEnrollments.map((enrollment) => (
                <CourseCard
                  key={enrollment.id}
                  title={enrollment.course.title}
                  slug={enrollment.course.slug}
                  description={enrollment.course.description}
                  categoryName={enrollment.course.category?.name}
                  moduleCount={enrollment.course.modules.length}
                  chapterCount={enrollment.course.modules.reduce(
                    (total, module) => total + module.chapters.length,
                    0,
                  )}
                  estimatedHours={enrollment.course.estimatedHours}
                  progressPercent={enrollment.progressPercent}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-[#0c0910]">Aucun cours démarré</h3>
              <p className="mt-2 text-sm text-[#0c0910]/70">
                Parcourez le catalogue pour commencer votre première formation.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[#0c0910]">Vue gamifiée</h2>
            <p className="text-sm text-[#0c0910]/65">
              Vos récompenses et votre rythme d’apprentissage en un coup d’œil.
            </p>
          </div>

          <ProgressBar value={overallProgress} label="Tous les chapitres publiés" />

          <div className="space-y-3 rounded-2xl bg-[#f7f9ff] p-4 text-sm text-[#0c0910]/75">
            <p>
              <span className="font-semibold text-[#0c0910]">{totalCompletedChapters}</span> chapitre
              {totalCompletedChapters > 1 ? "s" : ""} terminé
              {totalCompletedChapters > 1 ? "s" : ""}.
            </p>
            <p>
              <span className="font-semibold text-[#0c0910]">{totalPublishedChapters}</span> chapitre
              {totalPublishedChapters > 1 ? "s" : ""} publié
              {totalPublishedChapters > 1 ? "s" : ""} dans la plateforme.
            </p>
            <p>
              Lorsqu’un quiz est associé à un chapitre, sa réussite est requise pour compter ce chapitre comme terminé.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0c0910]">Badges récents</h3>
              <Link href="/profile" className="text-sm font-medium text-[#0F63FF] hover:underline">
                Voir mon profil
              </Link>
            </div>

            {recentBadges.length ? (
              <div className="space-y-3">
                {recentBadges.map((entry) => (
                  <BadgeCard
                    key={`${entry.badge.name}-${entry.earnedAt.toISOString()}`}
                    name={entry.badge.name}
                    description={entry.badge.description}
                    iconUrl={entry.badge.iconUrl}
                    earnedAt={formatDate(entry.earnedAt)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] px-4 py-5 text-sm text-[#0c0910]/65">
                Aucun badge débloqué pour le moment.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-[#0c0910]">Derniers gains XP</h3>
            {recentTransactions.length ? (
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-xl border border-[#0c0910]/10 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#0c0910]">{transaction.description ?? "Gain d’XP"}</p>
                      <span className="font-semibold text-[#453750]">+{transaction.amount} XP</span>
                    </div>
                    <p className="mt-1 text-xs text-[#0c0910]/55">{formatDate(transaction.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] px-4 py-5 text-sm text-[#0c0910]/65">
                Aucun gain XP enregistré pour le moment.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
