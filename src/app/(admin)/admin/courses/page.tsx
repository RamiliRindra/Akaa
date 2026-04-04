import { redirect } from "next/navigation";

import { CourseCard } from "@/components/course/course-card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminCoursesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const courses = await db.course.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      estimatedHours: true,
      level: true,
      status: true,
      trainer: {
        select: {
          name: true,
          email: true,
        },
      },
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
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Administration des cours</h2>
        <p className="text-sm text-[#0c0910]/70">
          Supervisez l’ensemble du catalogue, consultez les cours dans l’espace admin et ouvrez l’édition si nécessaire.
        </p>
      </div>

      {courses.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {courses.map((course) => (
            <div key={course.id} className="space-y-3">
              <CourseCard
                title={course.title}
                slug={course.slug}
                description={course.description}
                categoryName={course.category?.name}
                moduleCount={course.modules.length}
                chapterCount={course.modules.reduce((total, module) => total + module.chapters.length, 0)}
                estimatedHours={course.estimatedHours}
                level={course.level}
                status={course.status}
                href={`/admin/courses/${course.id}`}
              />
              <div className="rounded-xl bg-white px-4 py-3 text-sm text-[#0c0910]/70 ring-1 ring-[#0c0910]/10">
                Formateur : <span className="font-medium text-[#0c0910]">{course.trainer.name}</span> ({course.trainer.email})
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#0c0910]">Aucun cours dans le catalogue</h3>
          <p className="mt-2 text-sm text-[#0c0910]/70">
            Les cours créés par les formateurs apparaîtront ici automatiquement.
          </p>
        </div>
      )}
    </section>
  );
}
