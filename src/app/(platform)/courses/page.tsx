import { CourseStatus } from "@prisma/client";
import { BookMarked, Compass, Layers3, Sparkles } from "lucide-react";

import { CategoryFilter } from "@/components/course/category-filter";
import { CourseCard } from "@/components/course/course-card";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { buildAccessibleCourseWhere } from "@/lib/session-access";

type LearnerCoursesPageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function LearnerCoursesPage({ searchParams }: LearnerCoursesPageProps) {
  const { category: categorySlug } = await searchParams;
  const session = await getCachedSession();
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
        ...buildAccessibleCourseWhere(userId),
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        estimatedHours: true,
        level: true,
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
    <section className="space-y-8">
      <div className="surface-section overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-primary">
                <Compass className="h-3.5 w-3.5" />
                Catalogue vivant
              </span>
              <span className="chip chip-secondary">{courses.length} cours publiés</span>
            </div>
            <div className="space-y-3">
              <p className="editorial-eyebrow">Explore & Learn</p>
              <h2 className="font-display text-3xl font-black tracking-tight text-[#2c2f31] sm:text-5xl">
                Choisissez votre prochaine trajectoire d’apprentissage.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#2c2f31]/72 sm:text-base">
                Le catalogue réunit des formations progressives, classées par niveau, avec une lecture claire
                des modules, chapitres et de votre avancement personnel.
              </p>
            </div>
          </div>

          <aside className="glass-panel ambient-ring p-6">
            <div className="space-y-4">
              <p className="editorial-eyebrow">Vue d’ensemble</p>
              <div className="grid gap-3">
                <div className="panel-card flex items-center gap-3 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0050d6]/12 text-[#0050d6]">
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2c2f31]">{courses.length} cours</p>
                    <p className="text-xs text-[#2c2f31]/62">Disponibles immédiatement.</p>
                  </div>
                </div>
                <div className="panel-card flex items-center gap-3 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#655670]/12 text-[#655670]">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2c2f31]">{categories.length} catégories</p>
                    <p className="text-xs text-[#2c2f31]/62">Pour filtrer selon vos priorités.</p>
                  </div>
                </div>
                <div className="panel-card flex items-center gap-3 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ffc857]/24 text-[#775600]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2c2f31]">
                      {categorySlug ? "Filtre actif" : "Tous les parcours"}
                    </p>
                    <p className="text-xs text-[#2c2f31]/62">
                      {categorySlug ? "Le catalogue est actuellement filtré." : "Vision complète du catalogue."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="editorial-eyebrow">Find Your Path</p>
          <h3 className="font-display text-2xl font-black text-[#2c2f31]">Filtrer le catalogue</h3>
        </div>
        <CategoryFilter categories={categories} activeSlug={categorySlug} />
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-2xl font-black text-[#2c2f31]">Tous les cours publiés</h3>
        <p className="text-sm text-[#2c2f31]/70">
          Explorez les formations publiées et choisissez votre prochain objectif d’apprentissage.
        </p>
      </div>

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
              level={course.level}
              progressPercent={course.enrollments?.[0]?.progressPercent}
            />
          ))}
        </div>
      ) : (
        <div className="surface-section px-6 py-10 text-center">
          <h3 className="font-display text-2xl font-black text-[#2c2f31]">Aucun cours publié</h3>
          <p className="mt-2 text-sm text-[#2c2f31]/70">
            Revenez un peu plus tard ou changez de filtre de catégorie.
          </p>
        </div>
      )}
    </section>
  );
}
