import { ProgramStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { buildAccessibleProgramWhere } from "@/lib/session-access";
import { formatDateTime, getProgramStatusClassName, programStatusLabels } from "@/lib/training";

export default async function PlatformProgramsPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const programs = await db.trainingProgram.findMany({
    where: {
      status: ProgramStatus.PUBLISHED,
      ...buildAccessibleProgramWhere(session.user.id),
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    include: {
      trainer: { select: { name: true } },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            select: { id: true, title: true, slug: true, level: true, estimatedHours: true },
          },
        },
      },
      sessions: {
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Parcours de formation</h2>
        <p className="text-sm text-[#0c0910]/70">
          Consultez les parcours publiés, leurs cours inclus et les sessions qui leur sont rattachées.
        </p>
      </div>

      {programs.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {programs.map((program) => (
            <article key={program.id} className="panel-card p-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getProgramStatusClassName(program.status)}`}>
                    {programStatusLabels[program.status]}
                  </span>
                  <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                    {program.courses.length} cours{program.courses.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0c0910]">
                    <Link href={`/programs/${program.id}`} className="hover:text-[#0F63FF]">
                      {program.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-[#0c0910]/60">Formateur : {program.trainer.name}</p>
                </div>
                {program.description ? (
                  <p className="text-sm leading-7 text-[#0c0910]/72">{program.description}</p>
                ) : null}
              </div>

              <div className="mt-5 space-y-3 rounded-2xl bg-[#f7f9ff] p-4">
                <p className="text-sm font-semibold text-[#0c0910]">Cours inclus</p>
                {program.courses.length ? (
                  program.courses.map((programCourse) => (
                    <div key={programCourse.id} className="rounded-xl bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-[#0c0910]">
                          {programCourse.order}. {programCourse.course.title}
                        </p>
                        <span className="rounded-full bg-[#655670]/10 px-2 py-1 text-xs font-semibold text-[#655670]">
                          {programCourse.course.level}
                        </span>
                      </div>
                      {programCourse.course.estimatedHours ? (
                        <p className="text-xs text-[#0c0910]/60">
                          {programCourse.course.estimatedHours} h estimées
                        </p>
                      ) : null}
                      <Link href={`/courses/${programCourse.course.slug}`} className="mt-2 inline-flex text-xs font-semibold text-[#0F63FF]">
                        Voir le cours
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#0c0910]/55">Ce parcours n’a pas encore de cours associés.</p>
                )}
              </div>

              <div className="mt-4 space-y-3 rounded-2xl bg-white/80 p-4">
                <p className="text-sm font-semibold text-[#0c0910]">Sessions liées au parcours</p>
                {program.sessions.length ? (
                  program.sessions.map((trainingSession) => (
                    <div key={trainingSession.id} className="rounded-xl border border-[#0c0910]/8 bg-white p-3">
                      <p className="font-medium text-[#0c0910]">
                        <Link href={`/calendar/sessions/${trainingSession.id}`} className="hover:text-[#0F63FF]">
                          {trainingSession.title}
                        </Link>
                      </p>
                      <p className="text-xs text-[#0c0910]/60">
                        {formatDateTime(trainingSession.startsAt)} → {formatDateTime(trainingSession.endsAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#0c0910]/55">Aucune session planifiée pour ce parcours pour le moment.</p>
                )}
              </div>

              <div className="mt-5">
                <Link href="/calendar" className="secondary-button px-4 py-2 text-sm font-semibold">
                  Voir le calendrier
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#0c0910]">Aucun parcours publié</h3>
          <p className="mt-2 text-sm text-[#0c0910]/70">
            Les parcours publiés apparaîtront ici lorsqu’ils seront ouverts aux apprenants.
          </p>
        </div>
      )}
    </section>
  );
}
