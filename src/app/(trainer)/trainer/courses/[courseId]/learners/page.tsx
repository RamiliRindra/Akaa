import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type CourseLearnersPageProps = {
  params: Promise<{ courseId: string }>;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "A";
}

export default async function CourseLearnersPage({ params }: CourseLearnersPageProps) {
  const [session, { courseId }] = await Promise.all([getCachedSession(), params]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      trainerId: true,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        select: {
          id: true,
          enrolledAt: true,
          progressPercent: true,
          completedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    redirect("/trainer/courses");
  }

  if (session.user.role !== "ADMIN" && course.trainerId !== session.user.id) {
    redirect("/trainer/courses");
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link href="/trainer/courses" className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à mes cours
        </Link>
        <h2 className="text-2xl font-bold text-[#0c0910]">Apprenants inscrits</h2>
        <p className="text-sm text-[#0c0910]/70">
          {course.title} · {course.enrollments.length} apprenant
          {course.enrollments.length > 1 ? "s" : ""}
        </p>
      </div>

      {course.enrollments.length ? (
        <div className="overflow-hidden rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-[#0c0910]/10 text-sm">
            <thead className="bg-[#f7f9ff] text-left text-xs uppercase tracking-[0.08em] text-[#0c0910]/58">
              <tr>
                <th className="px-4 py-3">Apprenant</th>
                <th className="px-4 py-3">Inscription</th>
                <th className="px-4 py-3">Progression</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0c0910]/8">
              {course.enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={enrollment.user.image ?? undefined} alt={enrollment.user.name} />
                        <AvatarFallback>{getInitials(enrollment.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#0c0910]">{enrollment.user.name}</p>
                        <p className="truncate text-xs text-[#0c0910]/60">{enrollment.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#0c0910]/70">{formatDate(enrollment.enrolledAt)}</td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium text-[#0c0910]/70">
                        <span>Avancement</span>
                        <span>{enrollment.progressPercent}%</span>
                      </div>
                      <div className="rounded-[1.25rem] bg-[#eef1f3] p-1">
                        <div
                          className="h-2.5 rounded-full bg-[linear-gradient(90deg,#0050d6_0%,#119da4_100%)]"
                          style={{ width: `${enrollment.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {enrollment.completedAt ? (
                      <span className="rounded-full bg-[#119da4]/10 px-2.5 py-1 text-xs font-semibold text-[#119da4]">
                        Terminé
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                        En cours
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#0c0910]">Aucun apprenant inscrit</h3>
          <p className="mt-2 text-sm text-[#0c0910]/70">
            Cette formation n’a pas encore d’inscriptions apprenantes.
          </p>
        </div>
      )}
    </section>
  );
}
