import { ChapterProgressStatus, CourseStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseCard } from "@/components/course/course-card";
import { ProgressBar } from "@/components/course/progress-bar";
import { getHomePathForRole } from "@/lib/auth-config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function LearnerDashboardPage() {
  const session = await auth();

  if (session?.user?.role === "TRAINER" || session?.user?.role === "ADMIN") {
    redirect(getHomePathForRole(session.user.role));
  }

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [enrollments, totalCompletedChapters, totalPublishedChapters] = await Promise.all([
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
  ]);

  const publishedEnrollments = enrollments.filter((enrollment) => enrollment.course.status === CourseStatus.PUBLISHED);
  const completedCourses = publishedEnrollments.filter((enrollment) => enrollment.progressPercent === 100).length;
  const inProgressCourses = publishedEnrollments.filter(
    (enrollment) => enrollment.progressPercent > 0 && enrollment.progressPercent < 100,
  ).length;
  const averageProgress = publishedEnrollments.length
    ? Math.round(
        publishedEnrollments.reduce((total, enrollment) => total + enrollment.progressPercent, 0) /
          publishedEnrollments.length,
      )
    : 0;
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
          <p className="text-sm text-[#0c0910]/60">Cours inscrits</p>
          <p className="mt-2 text-3xl font-bold text-[#0c0910]">{publishedEnrollments.length}</p>
        </article>
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Cours terminés</p>
          <p className="mt-2 text-3xl font-bold text-[#119da4]">{completedCourses}</p>
        </article>
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Cours en cours</p>
          <p className="mt-2 text-3xl font-bold text-[#0F63FF]">{inProgressCourses}</p>
        </article>
        <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Progression moyenne</p>
          <p className="mt-2 text-3xl font-bold text-[#453750]">{averageProgress}%</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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
            <h2 className="text-lg font-semibold text-[#0c0910]">Progression globale</h2>
            <p className="text-sm text-[#0c0910]/65">
              Cette vue résume l’avancement de tous les chapitres publiés sur vos cours suivis.
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
        </aside>
      </div>
    </section>
  );
}
