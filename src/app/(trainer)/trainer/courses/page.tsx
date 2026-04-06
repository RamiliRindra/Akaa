import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseCard } from "@/components/course/course-card";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "A";
}

type TrainerCoursesPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function TrainerCoursesPage({ searchParams }: TrainerCoursesPageProps) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const feedback = await searchParams;
  const courses = await db.course.findMany({
    where: session.user.role === "ADMIN" ? undefined : { trainerId: session.user.id },
    orderBy: { createdAt: "desc" },
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
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0c0910]">Gestion des cours</h2>
          <p className="text-sm text-[#0c0910]/70">
            Créez vos cours, structurez-les en modules et pilotez leur publication.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/trainer/courses/import"
            className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
          >
            Importer un cours
          </Link>
          <Link
            href="/trainer/courses/new"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0F63FF]/90"
          >
            Nouveau cours
          </Link>
        </div>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      {courses.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              slug={course.slug}
              thumbnailUrl={course.thumbnailUrl}
              description={course.description}
              categoryName={course.category?.name}
              moduleCount={course.modules.length}
              chapterCount={course.modules.reduce((total, module) => total + module.chapters.length, 0)}
              estimatedHours={course.estimatedHours}
              level={course.level}
              status={course.status}
              href={`/trainer/courses/${course.id}/edit`}
              learnerCount={course._count.enrollments}
              learnerPreview={course.enrollments.map((enrollment) => ({
                src: enrollment.user.image,
                fallback: getInitials(enrollment.user.name),
                name: enrollment.user.name,
              }))}
              learnersHref={`/trainer/courses/${course.id}/learners`}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#0c0910]">Aucun cours pour le moment</h3>
          <p className="mt-2 text-sm text-[#0c0910]/70">
            Lancez votre premier cours pour alimenter le catalogue apprenant.
          </p>
        </div>
      )}
    </section>
  );
}
