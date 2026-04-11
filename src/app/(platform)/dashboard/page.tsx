import { ChapterProgressStatus, CourseStatus, ProgramStatus, SessionEnrollmentStatus, SessionStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Flame,
  Layers3,
  Lock,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseThumbnail } from "@/components/course/course-thumbnail";
import { ProgressBar } from "@/components/course/progress-bar";
import { WeeklyXpBars } from "@/components/gamification/weekly-xp-bars";
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
  const firstName = session.user.name?.split(/\s+/)[0] ?? "toi";

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
    nextApprovedSession,
  ] = await Promise.all([
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
            thumbnailUrl: true,
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
    db.trainingSession.findFirst({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAt: { gt: new Date() },
        enrollments: {
          some: {
            userId,
            status: SessionEnrollmentStatus.APPROVED,
          },
        },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        meetingUrl: true,
        trainer: {
          select: {
            name: true,
            image: true,
          },
        },
        course: { select: { title: true } },
        program: { select: { title: true } },
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

  const remainingChapters = Math.max(0, totalPublishedChapters - totalCompletedChapters);
  const resumeHref = publishedEnrollments[0] ? `/courses/${publishedEnrollments[0].course.slug}` : "/courses";

  const ringCircumference = 2 * Math.PI * 44;
  const ringDashOffset = ringCircumference - (overallProgress / 100) * ringCircumference;

  return (
    <section className="space-y-8 md:space-y-6">
      {/* Hero — maquette */}
      <div className="relative overflow-hidden rounded-[12px] bg-gradient-to-br from-[#0050d6] via-indigo-800 to-[#1e1b4b] p-8 text-white shadow-2xl sm:p-10">
        <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="max-w-lg space-y-4 text-center md:text-left">
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Bonjour {firstName} !
            </h2>
            <p className="text-lg font-medium text-blue-100/85">
              {remainingChapters > 0
                ? `Encore ${remainingChapters} chapitre${remainingChapters > 1 ? "s" : ""} pour progresser vers ta prochaine récompense.`
                : "Tu es à jour sur tes chapitres publiés — poursuis sur un cours ou un parcours."}
            </p>
            <Link
              href={resumeHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#fac453] px-8 py-3 text-sm font-bold text-[#593f00] transition-transform hover:scale-[1.02]"
            >
              Reprendre
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-8 md:gap-3">
            <div className="relative flex h-48 w-48 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="#fac453"
                  strokeWidth="12"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset]"
                />
              </svg>
              <div className="text-center">
                <span className="font-display text-4xl font-black">{overallProgress}%</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Maîtrise</p>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-400/20 blur-[100px]" />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/calendar" className="font-semibold text-[#0050d6] underline-offset-4 hover:underline">
          Calendrier
        </Link>
        <span className="text-[#cbd5e1]">·</span>
        <Link href="/programs" className="font-semibold text-[#0050d6] underline-offset-4 hover:underline">
          Parcours
        </Link>
        <span className="text-[#cbd5e1]">·</span>
        <span className="text-[#64748b]">
          {availableSessions.length} session{availableSessions.length > 1 ? "s" : ""} ouverte
          {availableSessions.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="space-y-8 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-0">
            <h3 className="font-display text-2xl font-bold text-[var(--color-text)]">Continuer</h3>
            <Link href="/courses" className="text-sm font-bold text-[#0050d6] hover:underline">
              Tout voir
            </Link>
          </div>

          {publishedEnrollments.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {publishedEnrollments.slice(0, 4).map((enrollment, index) => {
                const accent = index % 2 === 0 ? "text-[#0050d6]" : "text-[#655670]";
                const barAccent = index % 2 === 0 ? "bg-[var(--color-primary)]" : "bg-[#655670]";
                return (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.slug}`}
                    className="card-refined group overflow-hidden bg-white p-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-2"
                  >
                    <CourseThumbnail
                      title={enrollment.course.title}
                      thumbnailUrl={enrollment.course.thumbnailUrl}
                      roundedClassName="rounded-none"
                    />
                    <div className="p-6">
                    <h4 className="mb-2 text-xl font-bold text-[var(--color-text)]">{enrollment.course.title}</h4>
                    <p className="mb-6 line-clamp-2 text-sm text-slate-500">
                      {enrollment.course.description?.trim() || "Formation sur la plateforme Akaa."}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">Progression</span>
                        <span className={accent}>
                          {enrollment.progressPercent}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#dfe3e6]">
                        <div
                          className={`h-full rounded-full ${barAccent}`}
                          style={{ width: `${enrollment.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="card-refined bg-white px-6 py-10 text-center shadow-sm">
              <h3 className="font-display text-xl font-black text-[var(--color-text)]">Aucun cours démarré</h3>
              <p className="mt-2 text-sm text-[#64748b]">Explore le catalogue pour commencer.</p>
              <Link href="/courses" className="cta-button mt-4 inline-flex px-6 py-2.5 text-sm font-semibold">
                Catalogue
              </Link>
            </div>
          )}

          <div className="card-refined bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sm:p-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl font-bold text-[var(--color-text)]">Activité hebdomadaire</h3>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className="h-3 w-3 rounded-full bg-[var(--color-primary)]" />
                XP gagnés
              </div>
            </div>
            <WeeklyXpBars points={xpTrendPoints} />
          </div>

          <div className="surface-section p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h2 className="font-display text-xl font-black text-[var(--color-text)]">Sessions et parcours</h2>
                <p className="max-w-2xl text-sm text-[var(--color-text)]/68">
                  Inscriptions ouvertes et parcours publiés.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/calendar" className="secondary-button px-4 py-2 text-sm font-semibold">
                  Calendrier
                </Link>
                <Link href="/programs" className="primary-button px-4 py-2 text-sm font-semibold">
                  Parcours
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <article className="panel-card p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary-bright)]/12 text-[var(--color-primary-bright)]">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {availableSessions.length} session{availableSessions.length > 1 ? "s" : ""} ouverte
                        {availableSessions.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-[var(--color-text)]/62">
                        {upcomingApprovedSessionsCount} inscription
                        {upcomingApprovedSessionsCount > 1 ? "s" : ""} approuvée
                        {upcomingApprovedSessionsCount > 1 ? "s" : ""} à venir.
                      </p>
                    </div>

                    {availableSessions.length ? (
                      <div className="space-y-2">
                        {availableSessions.map((trainingSession) => (
                          <div key={trainingSession.id} className="rounded-2xl bg-[var(--color-surface-high)] px-4 py-3">
                            <p className="text-sm font-semibold text-[var(--color-text)]">{trainingSession.title}</p>
                            <p className="text-xs text-[var(--color-text)]/62">
                              {formatDate(trainingSession.startsAt)}
                              {trainingSession.course ? ` • ${trainingSession.course.title}` : ""}
                              {trainingSession.program ? ` • ${trainingSession.program.title}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text)]/62">Aucune session ouverte pour le moment.</p>
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
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {publishedPrograms.length} parcours publié{publishedPrograms.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-[var(--color-text)]/62">Parcours structurés pour aller plus loin.</p>
                    </div>

                    {publishedPrograms.length ? (
                      <div className="space-y-2">
                        {publishedPrograms.map((program) => (
                          <div key={program.id} className="rounded-2xl bg-[#fcfbff] px-4 py-3">
                            <p className="text-sm font-semibold text-[var(--color-text)]">{program.title}</p>
                            <p className="text-xs text-[var(--color-text)]/62">
                              {program.courses.length} cours
                              {program.sessions.length
                                ? ` • ${program.sessions.length} session${program.sessions.length > 1 ? "s" : ""} à venir`
                                : " • aucune session planifiée"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text)]/62">Aucun parcours publié pour le moment.</p>
                    )}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {nextApprovedSession ? (
            <div className="card-refined border-l-4 border-[#775600] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <span className="rounded-full bg-[#775600]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#775600]">
                  Session live
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {formatDistanceToNow(nextApprovedSession.startsAt, { locale: fr, addSuffix: true })}
                </span>
              </div>
              <h4 className="mb-4 text-xl font-bold text-[var(--color-text)]">{nextApprovedSession.title}</h4>
              <div className="mb-6 flex items-center gap-3">
                {nextApprovedSession.trainer.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL externe (Google OAuth, etc.)
                  <img
                    src={nextApprovedSession.trainer.image}
                    alt={nextApprovedSession.trainer.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border border-[#dfe3e6] object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-low)] text-xs font-bold text-[#64748b]">
                    {nextApprovedSession.trainer.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-600">{nextApprovedSession.trainer.name}</span>
              </div>
              {nextApprovedSession.meetingUrl ? (
                <a
                  href={nextApprovedSession.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-full border-2 border-[#775600] py-3 text-sm font-bold text-[#775600] transition-colors hover:bg-[#775600] hover:text-white"
                >
                  Rejoindre la session
                </a>
              ) : (
                <Link
                  href={`/calendar/sessions/${nextApprovedSession.id}`}
                  className="flex w-full items-center justify-center rounded-full border-2 border-[#775600] py-3 text-sm font-bold text-[#775600] transition-colors hover:bg-[#775600] hover:text-white"
                >
                  Voir le détail
                </Link>
              )}
            </div>
          ) : null}

          <div className="card-refined bg-white/90 p-6 backdrop-blur-xl">
            <h3 className="mb-6 font-display text-lg font-bold text-[var(--color-text)]">Badges récents</h3>
            <div className="grid grid-cols-2 gap-4">
              {recentBadges.map((entry) => (
                <div
                  key={`${entry.badge.name}-${entry.earnedAt.toISOString()}`}
                  className="card-refined flex flex-col items-center gap-2 border border-slate-50 bg-white p-4 text-center shadow-sm"
                >
                  <div className="mb-1 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#fac453]/40">
                    <Image
                      src={entry.badge.iconUrl}
                      alt={entry.badge.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Badge</span>
                  <span className="text-xs font-bold text-[var(--color-text)]">{entry.badge.name}</span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - recentBadges.length) }).map((_, i) => (
                <div
                  key={`locked-${i}`}
                  className="card-refined flex flex-col items-center gap-2 border border-dashed border-slate-200 bg-white/50 p-4 text-center"
                >
                  <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                    <Lock className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-300">À débloquer</span>
                  <span className="text-xs font-bold text-slate-300">—</span>
                </div>
              ))}
            </div>
            <Link href="/profile" className="ghost-button mt-4 block w-full py-2.5 text-center text-sm font-semibold">
              Voir le profil
            </Link>
          </div>

          <div className="card-refined space-y-4 bg-white p-6">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--color-text)]">Synthèse</h3>
              <p className="text-sm text-[#64748b]">XP, progression et historique.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="panel-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#655670]/12 text-[#655670]">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{displayTransactions.length} gains récents</p>
                    <p className="text-xs text-[var(--color-text)]/62">Transactions XP.</p>
                  </div>
                </div>
              </div>
              <div className="panel-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#119da4]/12 text-[#119da4]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{totalPublishedChapters} chapitres</p>
                    <p className="text-xs text-[var(--color-text)]/62">Publiés dans tes cours.</p>
                  </div>
                </div>
              </div>
              <div className="panel-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ffc857]/24 text-[#775600]">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{recentBadges.length} badge(s)</p>
                    <p className="text-xs text-[var(--color-text)]/62">Affichés ci-dessus.</p>
                  </div>
                </div>
              </div>
            </div>

            <ProgressBar value={overallProgress} label="Tous les chapitres publiés" />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">Historique XP</p>
              {displayTransactions.length ? (
                <div className="space-y-2">
                  {displayTransactions.map((transaction) => (
                    <div key={transaction.id} className="panel-card flex items-start justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {transaction.description || "Gain d’XP"}
                        </p>
                        <p className="text-xs text-[var(--color-text)]/58">{formatDate(transaction.createdAt)}</p>
                      </div>
                      <span className="chip chip-secondary shrink-0">+{transaction.amount} XP</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#64748b]">Aucun gain récent.</p>
              )}
            </div>

            <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(0,80,214,0.06),rgba(101,86,112,0.05))] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[#0050d6]">
                  <BookOpenCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {totalCompletedChapters} chapitre{totalCompletedChapters > 1 ? "s" : ""} validé
                    {totalCompletedChapters > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text)]/65">Complétés sur les cours suivis.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(255,200,87,0.12),rgba(101,86,112,0.06))] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ffc857]/25 text-[#775600]">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Record : {user.streak?.longestStreak ?? 0} jour
                    {(user.streak?.longestStreak ?? 0) > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text)]/65">Meilleure série.</p>
                </div>
              </div>
            </div>
            <Link href="/courses" className="cta-button flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold">
              Explorer le catalogue
              <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
