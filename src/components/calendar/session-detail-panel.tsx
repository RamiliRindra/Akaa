import type { SessionAccessPolicy } from "@prisma/client";
import { SessionEnrollmentStatus, SessionStatus } from "@prisma/client";
import Link from "next/link";

import {
  cancelSessionEnrollmentAction,
  requestSessionEnrollmentAction,
} from "@/actions/training";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  formatDateTime,
  getEnrollmentStatusClassName,
  getSessionAccessPolicyClassName,
  getSessionStatusClassName,
  sessionAccessPolicyLabels,
  sessionEnrollmentStatusLabels,
  sessionStatusLabels,
} from "@/lib/training";

type SessionDetailPanelProps = {
  session: {
    id: string;
    title: string;
    description: string | null;
    status: SessionStatus;
    accessPolicy: SessionAccessPolicy;
    startsAt: Date;
    endsAt: Date;
    isAllDay: boolean;
    location: string | null;
    meetingUrl: string | null;
    xpReward: number;
    recurrenceSeriesId: string | null;
    trainer: { name: string; email: string | null };
    course: { id: string; title: string; slug: string } | null;
    program: { id: string; title: string; slug: string } | null;
    _count: { enrollments: number; attendances: number };
  };
  enrollment: { id: string; status: SessionEnrollmentStatus } | null;
  returnTo: string;
  backHref: string;
  /** Formulaire d’inscription : session future, pas encore inscrit */
  showEnrollForm: boolean;
};

export function SessionDetailPanel({
  session,
  enrollment,
  returnTo,
  backHref,
  showEnrollForm,
}: SessionDetailPanelProps) {
  const now = new Date();
  const isPast = session.endsAt.getTime() < now.getTime();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]">
          ← Retour
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-[var(--color-text-dark)]">{session.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(session.status)}`}>
            {sessionStatusLabels[session.status]}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionAccessPolicyClassName(session.accessPolicy)}`}>
            {sessionAccessPolicyLabels[session.accessPolicy]}
          </span>
          {session.recurrenceSeriesId ? (
            <span className="rounded-full bg-[#eef3fb] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-dark)]/70">
              Série récurrente
            </span>
          ) : null}
        </div>
      </div>

      <article className="panel-card space-y-4 p-6">
        <p className="text-sm text-[var(--color-text-dark)]/70">
          {formatDateTime(session.startsAt)} → {formatDateTime(session.endsAt)}
          {session.isAllDay ? " · Journée entière" : null}
        </p>
        <p className="text-sm text-[var(--color-text-dark)]/70">
          Formateur : <span className="font-medium text-[var(--color-text-dark)]">{session.trainer.name}</span>
        </p>
        {session.location ? (
          <p className="text-sm text-[var(--color-text-dark)]/70">
            Lieu : <span className="font-medium text-[var(--color-text-dark)]">{session.location}</span>
          </p>
        ) : null}
        {session.meetingUrl ? (
          <p className="text-sm">
            <a href={session.meetingUrl} className="font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]" target="_blank" rel="noreferrer">
              Lien de visioconférence
            </a>
          </p>
        ) : null}
        <p className="text-sm text-[var(--color-text-dark)]/70">
          XP prévus (présence) : <span className="font-mono font-semibold text-[#655670]">{session.xpReward}</span>
        </p>
        <p className="text-sm text-[var(--color-text-dark)]/60">
          Inscriptions : {session._count.enrollments} · Présences enregistrées : {session._count.attendances}
        </p>
        {session.course ? (
          <p className="text-sm">
            <span className="text-[var(--color-text-dark)]/60">Cours lié : </span>
            <Link href={`/courses/${session.course.slug}`} className="font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]">
              {session.course.title}
            </Link>
          </p>
        ) : null}
        {session.program ? (
          <p className="text-sm">
            <span className="text-[var(--color-text-dark)]/60">Parcours lié : </span>
            <Link href={`/programs/${session.program.id}`} className="font-semibold text-[#0050d6] hover:text-[var(--color-primary-bright)]">
              {session.program.title}
            </Link>
          </p>
        ) : null}
        {session.description ? <p className="text-sm leading-7 text-[var(--color-text-dark)]/78">{session.description}</p> : null}
      </article>

      {enrollment ? (
        <div className="panel-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-dark)]">Votre inscription</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEnrollmentStatusClassName(enrollment.status)}`}>
              {sessionEnrollmentStatusLabels[enrollment.status]}
            </span>
          </div>
          {!isPast && enrollment.status !== SessionEnrollmentStatus.CANCELLED ? (
            <form action={cancelSessionEnrollmentAction}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="enrollmentId" value={enrollment.id} />
              <ConfirmSubmitButton
                triggerLabel="Annuler l'inscription"
                triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                title="Annuler cette inscription ?"
                description="Votre place ou votre demande sera libérée pour cette session."
                confirmLabel="Oui, annuler"
                pendingLabel="Annulation..."
              />
            </form>
          ) : null}
        </div>
      ) : null}

      {showEnrollForm && !isPast && session.status === SessionStatus.SCHEDULED ? (
        <form action={requestSessionEnrollmentAction} className="panel-card p-5">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="sessionId" value={session.id} />
          <p className="mb-3 text-sm text-[var(--color-text-dark)]/70">Demander une inscription à cette session.</p>
          <SubmitButton className="primary-button px-4 py-2 text-sm font-semibold" pendingLabel="Envoi...">
            S&apos;inscrire
          </SubmitButton>
        </form>
      ) : null}
    </section>
  );
}
