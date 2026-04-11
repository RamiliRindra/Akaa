import type { CourseLevel, ProgramStatus, SessionStatus } from "@prisma/client";
import Link from "next/link";

import { formatDateTime, getProgramStatusClassName, programStatusLabels } from "@/lib/training";

type ProgramDetailPanelProps = {
  program: {
    id: string;
    title: string;
    description: string | null;
    status: ProgramStatus;
    trainer: { name: string };
    courses: Array<{
      id: string;
      order: number;
      course: {
        id: string;
        title: string;
        slug: string;
        level: CourseLevel;
        estimatedHours: number | null;
      };
    }>;
    sessions: Array<{
      id: string;
      title: string;
      startsAt: Date;
      endsAt: Date;
      status: SessionStatus;
    }>;
  };
  backHref: string;
  sessionDetailHref: (sessionId: string) => string;
};

export function ProgramDetailPanel({ program, backHref, sessionDetailHref }: ProgramDetailPanelProps) {
  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]">
          ← Retour aux parcours
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getProgramStatusClassName(program.status)}`}>
            {programStatusLabels[program.status]}
          </span>
          <span className="rounded-full bg-[var(--color-primary-bright)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-bright)]">
            {program.courses.length} cours{program.courses.length > 1 ? "s" : ""}
          </span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-dark)]">{program.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-dark)]/60">Formateur : {program.trainer.name}</p>
        {program.description ? (
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-dark)]/72">{program.description}</p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl bg-[var(--color-surface-high)] p-5">
        <p className="text-sm font-semibold text-[var(--color-text-dark)]">Cours inclus</p>
        {program.courses.length ? (
          program.courses.map((programCourse) => (
            <div key={programCourse.id} className="rounded-xl bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[var(--color-text-dark)]">
                  {programCourse.order}. {programCourse.course.title}
                </p>
                <span className="rounded-full bg-[#655670]/10 px-2 py-1 text-xs font-semibold text-[#655670]">
                  {programCourse.course.level}
                </span>
              </div>
              {programCourse.course.estimatedHours ? (
                <p className="text-xs text-[var(--color-text-dark)]/60">{programCourse.course.estimatedHours} h estimées</p>
              ) : null}
              <Link href={`/courses/${programCourse.course.slug}`} className="mt-2 inline-flex text-xs font-semibold text-[var(--color-primary-bright)]">
                Voir le cours
              </Link>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--color-text-dark)]/55">Aucun cours dans ce parcours.</p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--color-text-dark)]">Sessions liées</p>
        {program.sessions.length ? (
          <ul className="space-y-2">
            {program.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={sessionDetailHref(s.id)}
                  className="block rounded-xl border border-[var(--color-text-dark)]/8 bg-white p-4 transition hover:border-[#0F63FF]/30"
                >
                  <p className="font-medium text-[var(--color-text-dark)]">{s.title}</p>
                  <p className="text-xs text-[var(--color-text-dark)]/60">
                    {formatDateTime(s.startsAt)} → {formatDateTime(s.endsAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-text-dark)]/55">Aucune session planifiée pour ce parcours.</p>
        )}
      </div>

      <Link href="/calendar" className="secondary-button inline-flex px-4 py-2 text-sm font-semibold">
        Voir le calendrier
      </Link>
    </section>
  );
}
