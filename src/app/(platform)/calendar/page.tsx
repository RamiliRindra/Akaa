import { SessionEnrollmentStatus, SessionStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  cancelSessionEnrollmentAction,
  requestSessionEnrollmentAction,
} from "@/actions/training";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  formatDateTime,
  getEnrollmentStatusClassName,
  getSessionAccessPolicyClassName,
  getSessionStatusClassName,
  sessionAccessPolicyLabels,
  sessionEnrollmentStatusLabels,
  sessionStatusLabels,
} from "@/lib/training";

type PlatformCalendarPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function PlatformCalendarPage({ searchParams }: PlatformCalendarPageProps) {
  const [session, feedback] = await Promise.all([getCachedSession(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [myEnrollments, availableSessions] = await Promise.all([
    db.sessionEnrollment.findMany({
      where: {
        userId,
        status: {
          in: [SessionEnrollmentStatus.PENDING, SessionEnrollmentStatus.APPROVED],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        session: {
          include: {
            trainer: { select: { name: true } },
            course: { select: { title: true } },
            program: { select: { title: true } },
          },
        },
      },
    }),
    db.trainingSession.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAt: { gt: new Date() },
      },
      orderBy: { startsAt: "asc" },
      include: {
        trainer: { select: { name: true } },
        course: { select: { title: true } },
        program: { select: { title: true } },
        enrollments: {
          where: { userId },
          select: { id: true, status: true },
        },
      },
      take: 24,
    }),
  ]);

  const visibleAvailableSessions = availableSessions.filter((trainingSession) => {
    const ownEnrollment = trainingSession.enrollments[0];
    return (
      !ownEnrollment ||
      ownEnrollment.status === SessionEnrollmentStatus.REJECTED ||
      ownEnrollment.status === SessionEnrollmentStatus.CANCELLED
    );
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Mon calendrier</h2>
        <p className="text-sm text-[#0c0910]/70">
          Retrouvez vos sessions approuvées, vos demandes en attente et les prochaines formations disponibles.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0c0910]">Mes inscriptions</h3>
            <p className="text-sm text-[#0c0910]/60">
              Sessions en attente ou déjà approuvées par le formateur.
            </p>
          </div>

          {myEnrollments.length ? (
            <div className="space-y-4">
              {myEnrollments.map((enrollment) => (
                <article key={enrollment.id} className="panel-card p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEnrollmentStatusClassName(enrollment.status)}`}>
                          {sessionEnrollmentStatusLabels[enrollment.status]}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(enrollment.session.status)}`}>
                          {sessionStatusLabels[enrollment.session.status]}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionAccessPolicyClassName(enrollment.session.accessPolicy)}`}>
                          {sessionAccessPolicyLabels[enrollment.session.accessPolicy]}
                        </span>
                        {enrollment.session.course ? (
                          <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                            {enrollment.session.course.title}
                          </span>
                        ) : null}
                      </div>
                      <h4 className="text-lg font-semibold text-[#0c0910]">
                        <Link href={`/calendar/sessions/${enrollment.session.id}`} className="hover:text-[#0F63FF]">
                          {enrollment.session.title}
                        </Link>
                      </h4>
                      <p className="text-sm text-[#0c0910]/70">
                        {formatDateTime(enrollment.session.startsAt)} → {formatDateTime(enrollment.session.endsAt)}
                      </p>
                      <p className="text-sm text-[#0c0910]/60">Formateur : {enrollment.session.trainer.name}</p>
                      {enrollment.session.location ? (
                        <p className="text-sm text-[#0c0910]/60">Lieu : {enrollment.session.location}</p>
                      ) : null}
                    </div>

                    <form action={cancelSessionEnrollmentAction}>
                      <input type="hidden" name="returnTo" value="/calendar" />
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
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-[#0c0910]">Aucune session réservée</h3>
              <p className="mt-2 text-sm text-[#0c0910]/70">
                Explorez les prochaines sessions disponibles pour faire une demande d’inscription.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0c0910]">Sessions disponibles</h3>
            <p className="text-sm text-[#0c0910]/60">
              Catalogue des prochaines sessions ouvertes à l’inscription.
            </p>
          </div>

          <div className="space-y-4">
            {visibleAvailableSessions.length ? (
              visibleAvailableSessions.map((trainingSession) => (
                <article key={trainingSession.id} className="panel-card p-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(trainingSession.status)}`}>
                        {sessionStatusLabels[trainingSession.status]}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionAccessPolicyClassName(trainingSession.accessPolicy)}`}>
                        {sessionAccessPolicyLabels[trainingSession.accessPolicy]}
                      </span>
                      {trainingSession.program ? (
                        <span className="rounded-full bg-[#655670]/12 px-2.5 py-1 text-xs font-semibold text-[#655670]">
                          {trainingSession.program.title}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="text-lg font-semibold text-[#0c0910]">
                      <Link href={`/calendar/sessions/${trainingSession.id}`} className="hover:text-[#0F63FF]">
                        {trainingSession.title}
                      </Link>
                    </h4>
                    <p className="text-sm text-[#0c0910]/70">
                      {formatDateTime(trainingSession.startsAt)} → {formatDateTime(trainingSession.endsAt)}
                    </p>
                    <p className="text-sm text-[#0c0910]/60">Formateur : {trainingSession.trainer.name}</p>
                    {trainingSession.location ? (
                      <p className="text-sm text-[#0c0910]/60">Lieu : {trainingSession.location}</p>
                    ) : null}
                    {trainingSession.description ? (
                      <p className="text-sm text-[#0c0910]/70">{trainingSession.description}</p>
                    ) : null}
                  </div>

                  <form action={requestSessionEnrollmentAction} className="mt-4">
                    <input type="hidden" name="returnTo" value="/calendar" />
                    <input type="hidden" name="sessionId" value={trainingSession.id} />
                    <SubmitButton className="primary-button px-4 py-2 text-sm font-semibold" pendingLabel="Envoi...">
                      S&apos;inscrire
                    </SubmitButton>
                  </form>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
                <h3 className="text-lg font-semibold text-[#0c0910]">Aucune session disponible</h3>
                <p className="mt-2 text-sm text-[#0c0910]/70">
                  Les nouvelles sessions ouvertes apparaîtront ici automatiquement.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
