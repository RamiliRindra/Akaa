import { ChapterProgressStatus, CourseStatus, ProgramStatus, SessionEnrollmentStatus, SessionStatus } from "@prisma/client";
import { ArrowRight, BookOpenCheck, CalendarDays, Flame, Layers3, Sparkles, TrendingUp, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseCard } from "@/components/course/course-card";
import { ProgressBar } from "@/components/course/progress-bar";
import { BadgeCard } from "@/components/gamification/badge-card";
import { XpLineChart } from "@/components/gamification/xp-line-chart";
import { getHomePathForRole } from "@/lib/auth-config";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { buildAccessibleCourseWhere, buildAccessibleProgramWhere } from "@/lib/session-access";
import { formatDate } from "@/lib/utils";

export default async function LearnerDashboardPage() {
  const session = await getCachedSession();

  if (session?.user?.role === "TRAINER" || session?.user?.role === "ADMIN") {
    redirect(getHomePathForRole(session.user.role));
  }

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [
    user,
    enrollments,
    totalCompletedChapters,
    totalPublishedChapters,
    recentBadges,
    recentTransactions,
    availableSessions,
    publishedPrograms,
    upcomingApprovedSessionsCount,
  ] =
    await Promise.all([
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
        where: {
          userId,
          course: buildAccessibleCourseWhere(userId),
        },
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
              level: true,
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
                ...buildAccessibleCourseWhere(userId),
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
              ...buildAccessibleCourseWhere(userId),
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
        take: 30,
        select: {
          id: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      }),
      db.trainingSession.findMany({
        where: {
          status: SessionStatus.SCHEDULED,
          startsAt: { gt: new Date() },
          enrollments: {
            none: {
              userId,
              status: {
                in: [SessionEnrollmentStatus.PENDING, SessionEnrollmentStatus.APPROVED],
              },
            },
          },
        },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          id: true,
          title: true,
          startsAt: true,
          course: {
            select: {
              title: true,
            },
          },
          program: {
            select: {
              title: true,
            },
          },
        },
      }),
      db.trainingProgram.findMany({
        where: {
          status: ProgramStatus.PUBLISHED,
          ...buildAccessibleProgramWhere(userId),
        },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          courses: {
            select: {
              id: true,
            },
          },
          sessions: {
            where: {
              status: SessionStatus.SCHEDULED,
              startsAt: { gt: new Date() },
            },
            select: {
              id: true,
            },
          },
        },
      }),
      db.sessionEnrollment.count({
        where: {
          userId,
          status: SessionEnrollmentStatus.APPROVED,
          session: {
            status: SessionStatus.SCHEDULED,
            startsAt: { gt: new Date() },
          },
        },
      }),
    ]);

  const publishedEnrollments = enrollments.filter((enrollment) => enrollment.course.status === CourseStatus.PUBLISHED);
  const overallProgress = totalPublishedChapters
    ? Math.round((totalCompletedChapters / totalPublishedChapters) * 100)
    : 0;
  const displayTransactions = recentTransactions.slice(0, 5);
  const xpTrendPoints = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const value = recentTransactions
      .filter((transaction) => transaction.createdAt >= day && transaction.createdAt < nextDay)
      .reduce((total, transaction) => total + transaction.amount, 0);

    const label = new Intl.DateTimeFormat("fr-FR", { weekday: "short" })
      .format(day)
      .replace(".", "")
      .slice(0, 3);

    return {
      label,
      value,
    };
  });

  return (
    <section className="space-y-8">
      <div className="surface-section overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:items-start">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="editorial-eyebrow">Illuminated Focus</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tableau de bord apprenant
                </span>
                <span className="chip chip-success">{overallProgress}% de progression globale</span>
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight text-[#2c2f31] sm:text-5xl">
                Continuez votre ascension, un chapitre à la fois.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#2c2f31]/72 sm:text-base">
                Votre espace réunit progression, récompenses et dynamique de travail pour reprendre
                immédiatement le bon cours, au bon endroit.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="panel-card p-5">
                <p className="editorial-eyebrow">Progression</p>
                <p className="mt-3 font-display text-3xl font-black text-[#0050d6]">{overallProgress}%</p>
                <p className="mt-2 text-sm text-[#2c2f31]/68">Sur l’ensemble de vos chapitres publiés.</p>
              </article>
              <article className="panel-card p-5">
                <p className="editorial-eyebrow">Récompense</p>
                <p className="mt-3 font-display text-3xl font-black text-[#655670]">{user.totalXp}</p>
                <p className="mt-2 text-sm text-[#2c2f31]/68">XP total accumulé sur la plateforme.</p>
              </article>
              <article className="panel-card p-5">
                <p className="editorial-eyebrow">Niveau</p>
                <p className="mt-3 font-display text-3xl font-black text-[#119da4]">{user.level}</p>
                <p className="mt-2 text-sm text-[#2c2f31]/68">
                  Votre niveau actuel progresse avec chaque réussite.
                </p>
              </article>
              <article className="panel-card p-5">
                <p className="editorial-eyebrow">Rythme</p>
                <p className="mt-3 font-display text-3xl font-black text-[#775600]">
                  {user.streak?.currentStreak ?? 0}
                </p>
                <p className="mt-2 text-sm text-[#2c2f31]/68">
                  Jour{(user.streak?.currentStreak ?? 0) > 1 ? "s" : ""} de streak actuel.
                </p>
              </article>
            </div>
          </div>

          <aside className="glass-panel ambient-ring relative overflow-hidden p-6">
            <div className="absolute inset-x-8 top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(0,80,214,0.18),transparent_68%)] blur-2xl" />
            <div className="relative space-y-5">
              <div>
                <p className="editorial-eyebrow">Momentum</p>
                <h2 className="font-display mt-2 text-2xl font-black text-[#2c2f31]">
                  Votre semaine d’apprentissage
                </h2>
              </div>

              <ProgressBar value={overallProgress} label="Tous les chapitres publiés" />

              <div className="grid gap-3">
                <div className="rounded-[1.75rem] bg-white/82 p-4 shadow-[0_18px_38px_-28px_rgba(44,47,49,0.35)]">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0050d6]/12 text-[#0050d6]">
                      <BookOpenCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2c2f31]">
                        {totalCompletedChapters} chapitre{totalCompletedChapters > 1 ? "s" : ""} terminé
                      </p>
                      <p className="text-xs text-[#2c2f31]/65">Vos acquis réellement validés.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-white/82 p-4 shadow-[0_18px_38px_-28px_rgba(44,47,49,0.35)]">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ffc857]/25 text-[#775600]">
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2c2f31]">
                        Record: {user.streak?.longestStreak ?? 0} jour
                        {(user.streak?.longestStreak ?? 0) > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-[#2c2f31]/65">Votre meilleure série jusqu’ici.</p>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/courses" className="cta-button w-full px-5 py-3 text-sm font-semibold">
                Explorer le catalogue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="surface-section p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-black text-[#2c2f31]">
                  Sessions et parcours à explorer
                </h2>
                <p className="max-w-2xl text-sm text-[#2c2f31]/68">
                  Repérez rapidement les prochaines sessions auxquelles vous pouvez vous inscrire et les
                  parcours publiés à suivre ensuite.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/calendar" className="secondary-button px-4 py-2 text-sm font-semibold">
                  Voir le calendrier
                </Link>
                <Link href="/programs" className="primary-button px-4 py-2 text-sm font-semibold">
                  Explorer les parcours
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="panel-card p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0F63FF]/12 text-[#0F63FF]">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[#2c2f31]">
                        {availableSessions.length} session{availableSessions.length > 1 ? "s" : ""} ouverte
                        {availableSessions.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-[#2c2f31]/62">
                        {upcomingApprovedSessionsCount} inscription
                        {upcomingApprovedSessionsCount > 1 ? "s" : ""} déjà approuvée
                        {upcomingApprovedSessionsCount > 1 ? "s" : ""} à venir.
                      </p>
                    </div>

                    {availableSessions.length ? (
                      <div className="space-y-2">
                        {availableSessions.map((trainingSession) => (
                          <div key={trainingSession.id} className="rounded-2xl bg-[#f7f9ff] px-4 py-3">
                            <p className="text-sm font-semibold text-[#2c2f31]">{trainingSession.title}</p>
                            <p className="text-xs text-[#2c2f31]/62">
                              {formatDate(trainingSession.startsAt)}
                              {trainingSession.course ? ` • ${trainingSession.course.title}` : ""}
                              {trainingSession.program ? ` • ${trainingSession.program.title}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#2c2f31]/62">
                        Aucune nouvelle session ouverte pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              </article>

              <article className="panel-card p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#655670]/12 text-[#655670]">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[#2c2f31]">
                        {publishedPrograms.length} parcours publié{publishedPrograms.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-[#2c2f31]/62">
                        Parcours structurés pour aller plus loin que le simple catalogue.
                      </p>
                    </div>

                    {publishedPrograms.length ? (
                      <div className="space-y-2">
                        {publishedPrograms.map((program) => (
                          <div key={program.id} className="rounded-2xl bg-[#fcfbff] px-4 py-3">
                            <p className="text-sm font-semibold text-[#2c2f31]">{program.title}</p>
                            <p className="text-xs text-[#2c2f31]/62">
                              {program.courses.length} cours
                              {program.sessions.length
                                ? ` • ${program.sessions.length} session${program.sessions.length > 1 ? "s" : ""} à venir`
                                : " • aucune session planifiée"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#2c2f31]/62">
                        Aucun parcours publié pour le moment.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="editorial-eyebrow">Active Courses</p>
              <h2 className="font-display text-2xl font-black text-[#2c2f31]">Mes cours en cours</h2>
            </div>
            <Link href="/courses" className="ghost-button px-4 py-2 text-sm font-semibold">
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
                  level={enrollment.course.level}
                  progressPercent={enrollment.progressPercent}
                />
              ))}
            </div>
          ) : (
            <div className="surface-section px-6 py-10 text-center">
              <h3 className="font-display text-2xl font-black text-[#2c2f31]">Aucun cours démarré</h3>
              <p className="mt-2 text-sm text-[#2c2f31]/70">
                Parcourez le catalogue pour commencer votre première formation.
              </p>
            </div>
          )}
        </div>

        <aside className="surface-section space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="editorial-eyebrow">Gamification</p>
            <h2 className="font-display text-2xl font-black text-[#2c2f31]">Récompenses et activité</h2>
            <p className="text-sm text-[#2c2f31]/65">
              Vos récompenses et votre rythme d’apprentissage en un coup d’œil.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="panel-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#655670]/12 text-[#655670]">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2c2f31]">{displayTransactions.length} gains récents</p>
                  <p className="text-xs text-[#2c2f31]/62">Transactions XP visibles ci-dessous.</p>
                </div>
              </div>
            </div>
            <div className="panel-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#119da4]/12 text-[#119da4]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2c2f31]">{totalPublishedChapters} chapitres publiés</p>
                  <p className="text-xs text-[#2c2f31]/62">Base de calcul de votre progression.</p>
                </div>
              </div>
            </div>
            <div className="panel-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ffc857]/24 text-[#775600]">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2c2f31]">
                    {recentBadges.length} badge{recentBadges.length > 1 ? "s" : ""} récent
                    {recentBadges.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[#2c2f31]/62">Débloqués au fil de vos réussites.</p>
                </div>
              </div>
            </div>
          </div>

          <XpLineChart points={xpTrendPoints} />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#655670]">
              Historique récent
            </h3>
            {displayTransactions.length ? (
              <div className="space-y-3">
                {displayTransactions.map((transaction) => (
                  <div key={transaction.id} className="panel-card flex items-start justify-between gap-4 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#2c2f31]">
                        {transaction.description || "Gain d’XP"}
                      </p>
                      <p className="text-xs text-[#2c2f31]/58">{formatDate(transaction.createdAt)}</p>
                    </div>
                    <span className="chip chip-secondary">+{transaction.amount} XP</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-card px-4 py-5 text-sm text-[#2c2f31]/65">
                Aucun gain d’XP enregistré pour le moment.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#2c2f31]">Badges récents</h3>
              <Link href="/profile" className="ghost-button px-3 py-1.5 text-sm font-semibold">
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
              <div className="panel-card px-4 py-5 text-sm text-[#2c2f31]/65">
                Aucun badge débloqué pour le moment.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
