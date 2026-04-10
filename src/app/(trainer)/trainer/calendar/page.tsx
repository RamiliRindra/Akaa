import { SessionAccessPolicy, SessionStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  deleteTrainingSessionAction,
  updateTrainingSessionAction,
} from "@/actions/training";
import { CreateSessionToggle } from "@/components/calendar/create-session-toggle";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  formatDateTime,
  getSessionAccessPolicyClassName,
  getSessionStatusClassName,
  sessionAccessPolicyLabels,
  sessionStatusLabels,
  toDateTimeLocalValue,
} from "@/lib/training";

type TrainerCalendarPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function TrainerCalendarPage({ searchParams }: TrainerCalendarPageProps) {
  const [session, feedback] = await Promise.all([getCachedSession(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.TRAINER && session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const where = session.user.role === UserRole.ADMIN ? undefined : { trainerId: session.user.id };

  const [courses, programs, ownSessions, otherSessions] = await Promise.all([
    db.course.findMany({
      where: session.user.role === UserRole.ADMIN ? undefined : { trainerId: session.user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.trainingProgram.findMany({
      where: session.user.role === UserRole.ADMIN ? undefined : { trainerId: session.user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.trainingSession.findMany({
      where,
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        trainer: { select: { name: true } },
        course: { select: { title: true } },
        program: { select: { title: true } },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    }),
    db.trainingSession.findMany({
      where:
        session.user.role === UserRole.ADMIN
          ? { trainerId: { not: session.user.id } }
          : { trainerId: { not: session.user.id } },
      orderBy: [{ startsAt: "asc" }],
      take: 8,
      include: {
        trainer: { select: { name: true } },
        course: { select: { title: true } },
        program: { select: { title: true } },
      },
    }),
  ]);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Sessions de formation</h2>
        <p className="text-sm text-[#0c0910]/70">
          Créez, planifiez et pilotez les inscriptions de vos sessions synchrones.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      {/* Create form — collapsed behind a button */}
      <CreateSessionToggle courses={courses} programs={programs} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        {/* ---------------------------------------------------------------- */}
        {/* Mes sessions                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0c0910]">Mes sessions</h3>
            <p className="text-sm text-[#0c0910]/60">
              Gérez vos sessions. Cliquez sur &laquo;&nbsp;Gestion&nbsp;&raquo; pour les inscriptions et le
              pointage de présence.
            </p>
          </div>

          {ownSessions.length ? (
            ownSessions.map((trainingSession) => (
              <article key={trainingSession.id} className="panel-card p-5">
                {/* Header: badges + title + dates */}
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(trainingSession.status)}`}
                      >
                        {sessionStatusLabels[trainingSession.status]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionAccessPolicyClassName(trainingSession.accessPolicy)}`}
                      >
                        {sessionAccessPolicyLabels[trainingSession.accessPolicy]}
                      </span>
                      {trainingSession.course ? (
                        <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                          {trainingSession.course.title}
                        </span>
                      ) : null}
                      {trainingSession.program ? (
                        <span className="rounded-full bg-[#655670]/12 px-2.5 py-1 text-xs font-semibold text-[#655670]">
                          {trainingSession.program.title}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="text-lg font-semibold text-[#0c0910]">
                      <Link
                        href={`/trainer/sessions/${trainingSession.id}`}
                        className="hover:text-[#0F63FF]"
                      >
                        {trainingSession.title}
                      </Link>
                    </h4>
                    <p className="text-sm text-[#0c0910]/70">
                      {formatDateTime(trainingSession.startsAt)} →{" "}
                      {formatDateTime(trainingSession.endsAt)}
                    </p>
                    {trainingSession.location ? (
                      <p className="text-sm text-[#0c0910]/60">
                        Lieu&nbsp;: {trainingSession.location}
                      </p>
                    ) : null}
                    {trainingSession.description ? (
                      <p className="text-sm text-[#0c0910]/70">{trainingSession.description}</p>
                    ) : null}
                    {trainingSession._count.enrollments > 0 ? (
                      <p className="text-xs text-[#0c0910]/55">
                        {trainingSession._count.enrollments} inscription
                        {trainingSession._count.enrollments > 1 ? "s" : ""}
                      </p>
                    ) : null}
                  </div>

                  {/* Actions: Gestion + Supprimer */}
                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    <Link
                      href={`/trainer/sessions/${trainingSession.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-[#0F63FF]/30 bg-[#0F63FF]/5 px-4 py-2 text-sm font-semibold text-[#0F63FF] transition hover:bg-[#0F63FF]/10"
                    >
                      Gestion
                    </Link>
                    <form action={deleteTrainingSessionAction}>
                      <input type="hidden" name="returnTo" value="/trainer/calendar" />
                      <input type="hidden" name="sessionId" value={trainingSession.id} />
                      <ConfirmSubmitButton
                        triggerLabel="Supprimer"
                        triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        title="Supprimer cette session ?"
                        description="Cette suppression retirera aussi les inscriptions et présences liées."
                        requireText="delete"
                        requireTextPlaceholder="delete"
                        confirmLabel="Supprimer définitivement"
                        pendingLabel="Suppression..."
                      />
                    </form>
                  </div>
                </div>

                {/* Inline edit form */}
                <form
                  action={updateTrainingSessionAction}
                  className="mt-5 grid gap-4 rounded-2xl bg-[#f7f9ff] p-4 md:grid-cols-2"
                >
                  <input type="hidden" name="returnTo" value="/trainer/calendar" />
                  <input type="hidden" name="sessionId" value={trainingSession.id} />
                  <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                    Titre
                    <input
                      name="title"
                      defaultValue={trainingSession.title}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Début
                    <input
                      name="startsAt"
                      type="datetime-local"
                      defaultValue={toDateTimeLocalValue(trainingSession.startsAt)}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Fin
                    <input
                      name="endsAt"
                      type="datetime-local"
                      defaultValue={toDateTimeLocalValue(trainingSession.endsAt)}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Statut
                    <select
                      name="status"
                      defaultValue={trainingSession.status}
                      className="form-select text-sm"
                    >
                      {Object.values(SessionStatus).map((s) => (
                        <option key={s} value={s}>
                          {sessionStatusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Politique d&apos;accès
                    <select
                      name="accessPolicy"
                      defaultValue={trainingSession.accessPolicy}
                      className="form-select text-sm"
                    >
                      {Object.values(SessionAccessPolicy).map((p) => (
                        <option key={p} value={p}>
                          {sessionAccessPolicyLabels[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    XP
                    <input
                      name="xpReward"
                      type="number"
                      min="0"
                      defaultValue={trainingSession.xpReward}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Journée entière
                    <select
                      name="isAllDay"
                      defaultValue={String(trainingSession.isAllDay)}
                      className="form-select text-sm"
                    >
                      <option value="false">Non</option>
                      <option value="true">Oui</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Rappel
                    <input
                      name="reminderMinutes"
                      type="number"
                      min="0"
                      defaultValue={trainingSession.reminderMinutes}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Lieu
                    <input
                      name="location"
                      defaultValue={trainingSession.location ?? ""}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Lien visio
                    <input
                      name="meetingUrl"
                      defaultValue={trainingSession.meetingUrl ?? ""}
                      className="form-input text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Cours lié
                    <select
                      name="courseId"
                      defaultValue={trainingSession.courseId ?? ""}
                      className="form-select text-sm"
                    >
                      <option value="">Aucun cours lié</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs font-normal text-[#0c0910]/55">
                      Renseignez un seul rattachement.
                    </p>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Parcours lié
                    <select
                      name="programId"
                      defaultValue={trainingSession.programId ?? ""}
                      className="form-select text-sm"
                    >
                      <option value="">Aucun parcours lié</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs font-normal text-[#0c0910]/55">
                      Laissez vide si la session cible un cours.
                    </p>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                    Description
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={trainingSession.description ?? ""}
                      className="form-textarea text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                    Récurrence
                    <input
                      name="recurrenceRule"
                      defaultValue={trainingSession.recurrenceRule ?? ""}
                      className="form-input text-sm"
                    />
                  </label>
                  <div className="md:col-span-2">
                    <SubmitButton
                      className="primary-button px-4 py-2 text-sm font-semibold"
                      pendingLabel="Mise à jour..."
                    >
                      Mettre à jour la session
                    </SubmitButton>
                  </div>
                </form>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-[#0c0910]">
                Aucune session pour le moment
              </h3>
              <p className="mt-2 text-sm text-[#0c0910]/70">
                Créez votre première session pour ouvrir les inscriptions apprenantes.
              </p>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sessions des autres formateurs                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0c0910]">
              Sessions des autres formateurs
            </h3>
            <p className="text-sm text-[#0c0910]/60">
              Lecture seule pour garder une vue globale du calendrier.
            </p>
          </div>

          <div className="space-y-3">
            {otherSessions.length ? (
              otherSessions.map((trainingSession) => (
                <article key={trainingSession.id} className="panel-card p-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(trainingSession.status)}`}
                      >
                        {sessionStatusLabels[trainingSession.status]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionAccessPolicyClassName(trainingSession.accessPolicy)}`}
                      >
                        {sessionAccessPolicyLabels[trainingSession.accessPolicy]}
                      </span>
                      <span className="rounded-full bg-[#655670]/12 px-2.5 py-1 text-xs font-semibold text-[#655670]">
                        {trainingSession.trainer.name}
                      </span>
                    </div>
                    <h4 className="font-semibold text-[#0c0910]">
                      <Link
                        href={`/trainer/sessions/${trainingSession.id}`}
                        className="hover:text-[#0F63FF]"
                      >
                        {trainingSession.title}
                      </Link>
                    </h4>
                    <p className="text-sm text-[#0c0910]/65">
                      {formatDateTime(trainingSession.startsAt)} →{" "}
                      {formatDateTime(trainingSession.endsAt)}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center text-sm text-[#0c0910]/60">
                Aucune autre session visible pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
