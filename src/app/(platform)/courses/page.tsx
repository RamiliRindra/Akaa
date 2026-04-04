import { CourseStatus } from "@prisma/client";

import { CategoryFilter } from "@/components/course/category-filter";
import { CourseCard } from "@/components/course/course-card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type LearnerCoursesPageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function LearnerCoursesPage({ searchParams }: LearnerCoursesPageProps) {
  const { category: categorySlug } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const [categories, courses] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    db.course.findMany({
      where: {
        status: CourseStatus.PUBLISHED,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        estimatedHours: true,
        category: {
          select: {
            name: true,
          },
        },
        enrollments: userId
          ? {
              where: { userId },
              select: {
                progressPercent: true,
              },
            }
          : false,
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
    }),
  ]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Catalogue des cours</h2>
        <p className="text-sm text-[#0c0910]/70">
          Explorez les formations publiées et choisissez votre prochain objectif d’apprentissage.
        </p>
      </div>

      <CategoryFilter categories={categories} activeSlug={categorySlug} />

      {courses.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              slug={course.slug}
              description={course.description}
              categoryName={course.category?.name}
              moduleCount={course.modules.length}
              chapterCount={course.modules.reduce((total, module) => total + module.chapters.length, 0)}
              estimatedHours={course.estimatedHours}
              progressPercent={course.enrollments?.[0]?.progressPercent}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#0c0910]">Aucun cours publié</h3>
          <p className="mt-2 text-sm text-[#0c0910]/70">
            Revenez un peu plus tard ou changez de filtre de catégorie.
          </p>
        </div>
      )}
    </section>
  );
}
