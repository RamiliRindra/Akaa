import { CourseStatus } from "@prisma/client";
import { BookOpenCheck, GraduationCap, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseThumbnail } from "@/components/course/course-thumbnail";
import AvatarGroupMaxDemo from "@/components/shadcn-studio/avatar/avatar-14";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "A";
}

export default async function TrainerDashboardPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const courseFilter = session.user.role === "ADMIN" ? undefined : { trainerId: session.user.id };

  const [courses, totalCourses, publishedCourses, totalEnrollments, recentEnrollments] = await Promise.all([
    db.course.findMany({
      where: courseFilter,
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        status: true,
        enrollments: {
          orderBy: { enrolledAt: "desc" },
          take: 3,
          select: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    }),
    db.course.count({ where: courseFilter }),
    db.course.count({
      where: {
        ...courseFilter,
        status: CourseStatus.PUBLISHED,
      },
    }),
    db.enrollment.count({
      where: {
        course: courseFilter,
      },
    }),
    db.enrollment.findMany({
      where: {
        course: courseFilter,
      },
      orderBy: { enrolledAt: "desc" },
      take: 8,
      select: {
        id: true,
        enrolledAt: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return (
    <section className="space-y-8">
      <div className="surface-section overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Dashboard formateur
                </span>
                <span className="chip chip-success">{publishedCourses} cours publiés</span>
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight text-[#2c2f31] sm:text-5xl">
                Pilotez vos formations et suivez vos apprenants en un coup d’œil.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#2c2f31]/72 sm:text-base">
                Cet espace réunit vos volumes de cours, vos inscriptions récentes et les formations
                qui demandent le plus d’attention.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="panel-card p-5">
                <p className="text-sm font-medium text-[#2c2f31]/65">Cours total</p>
                <p className="mt-3 font-display text-3xl font-black text-[#0050d6]">{totalCourses}</p>
                <p className="mt-2 text-sm text-[#2c2f31]/65">Brouillons et publiés confondus.</p>
              </article>
              <article className="panel-card p-5">
                <p className="text-sm font-medium text-[#2c2f31]/65">Cours publiés</p>
                <p className="mt-3 font-display text-3xl font-black text-[#119da4]">{publishedCourses}</p>
                <p className="mt-2 text-sm text-[#2c2f31]/65">Visibles côté apprenant.</p>
              </article>
              <article className="panel-card p-5">
                <p className="text-sm font-medium text-[#2c2f31]/65">Apprenants inscrits</p>
                <p className="mt-3 font-display text-3xl font-black text-[#655670]">{totalEnrollments}</p>
                <p className="mt-2 text-sm text-[#2c2f31]/65">Inscriptions cumulées sur vos formations.</p>
              </article>
            </div>
          </div>

          <aside className="glass-panel ambient-ring space-y-5 p-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-black text-[#2c2f31]">Raccourcis utiles</h2>
              <p className="text-sm text-[#2c2f31]/65">
                Accédez rapidement aux actions de gestion les plus fréquentes.
              </p>
            </div>

            <div className="grid gap-3">
              <Link
                href="/trainer/courses/new"
                className="cta-button justify-start px-5 py-3 text-sm font-semibold"
              >
                <GraduationCap className="h-4 w-4" />
                Créer une nouvelle formation
              </Link>
              <Link
                href="/trainer/courses/import"
                className="secondary-button justify-start px-5 py-3 text-sm font-semibold"
              >
                <BookOpenCheck className="h-4 w-4" />
                Importer un cours
              </Link>
              <Link
                href="/trainer/courses"
                className="secondary-button justify-start px-5 py-3 text-sm font-semibold"
              >
                <UsersRound className="h-4 w-4" />
                Voir mes formations
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0c0910]">Formations récentes</h2>
              <p className="text-sm text-[#0c0910]/70">
                Accès direct aux formations avec aperçu des apprenants déjà inscrits.
              </p>
            </div>
            <Link href="/trainer/courses" className="text-sm font-medium text-[#0F63FF] hover:underline">
              Voir tout
            </Link>
          </div>

          <div className="grid gap-4">
            {courses.length ? (
              courses.map((course) => (
                <article key={course.id} className="panel-card overflow-hidden p-0">
                  <CourseThumbnail
                    title={course.title}
                    thumbnailUrl={course.thumbnailUrl}
                    roundedClassName="rounded-none"
                  />
                  <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="chip chip-primary">{course.status === "PUBLISHED" ? "Publié" : "Brouillon"}</span>
                        <span className="chip chip-secondary">
                          {course._count.enrollments} apprenant{course._count.enrollments > 1 ? "s" : ""}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-[#0c0910]">{course.title}</h3>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      {course.enrollments.length ? (
                        <AvatarGroupMaxDemo
                          items={course.enrollments.map((enrollment) => ({
                            src: enrollment.user.image,
                            fallback: getInitials(enrollment.user.name),
                            name: enrollment.user.name,
                          }))}
                          max={3}
                          extraLabel={
                            course._count.enrollments > course.enrollments.length
                              ? `+${course._count.enrollments - course.enrollments.length}`
                              : undefined
                          }
                        />
                      ) : (
                        <span className="text-sm text-[#0c0910]/55">Aucune inscription</span>
                      )}

                      <Link
                        href={`/trainer/courses/${course.id}/learners`}
                        className="secondary-button px-4 py-2 text-sm font-semibold"
                      >
                        Voir tous les apprenants
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
                <h3 className="text-lg font-semibold text-[#0c0910]">Aucune formation pour le moment</h3>
                <p className="mt-2 text-sm text-[#0c0910]/70">
                  Créez votre première formation pour voir apparaître vos apprenants ici.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#0c0910]">Dernières inscriptions</h2>
            <p className="text-sm text-[#0c0910]/70">
              Les apprenants qui ont rejoint vos formations récemment.
            </p>
          </div>

          <div className="space-y-3">
            {recentEnrollments.length ? (
              recentEnrollments.map((enrollment) => (
                <article key={enrollment.id} className="panel-card p-4">
                  <div className="flex items-center gap-3">
                    <AvatarGroupMaxDemo
                      items={[
                        {
                          src: enrollment.user.image,
                          fallback: getInitials(enrollment.user.name),
                          name: enrollment.user.name,
                        },
                      ]}
                      max={1}
                      extraLabel={undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#0c0910]">{enrollment.user.name}</p>
                      <p className="truncate text-xs text-[#0c0910]/60">
                        {enrollment.course.title} · {formatDate(enrollment.enrolledAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
                <h3 className="text-lg font-semibold text-[#0c0910]">Aucune inscription récente</h3>
                <p className="mt-2 text-sm text-[#0c0910]/70">
                  Les nouvelles inscriptions apparaîtront ici dès qu’un apprenant rejoindra une formation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
