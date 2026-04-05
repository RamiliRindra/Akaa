import { AttendanceStatus, ProgramStatus, SessionEnrollmentStatus, SessionStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  createTrainingSessionAction,
  deleteTrainingSessionAction,
  markSessionAttendanceAction,
  reviewSessionEnrollmentAction,
  updateTrainingSessionAction,
} from "@/actions/training";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  attendanceStatusLabels,
  formatDateTime,
  getAttendanceStatusClassName,
  getEnrollmentStatusClassName,
  getSessionStatusClassName,
  sessionEnrollmentStatusLabels,
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
      select: { id: true, title: true, status: true },
    }),
    db.trainingSession.findMany({
      where,
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        trainer: {
          select: { name: true },
        },
        course: {
          select: { title: true },
        },
        program: {
          select: { title: true },
        },
        enrollments: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        attendances: {
          include: {
            user: {
              select: { id: true, name: true },
            },
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

      <div className="panel-card p-6">
        <div className="mb-5 space-y-1">
          <h3 className="text-lg font-semibold text-[#0c0910]">Créer une session</h3>
          <p className="text-sm text-[#0c0910]/60">
            Une session peut être liée à un cours existant ou rester totalement autonome.
          </p>
        </div>

        <form action={createTrainingSessionAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="returnTo" value="/trainer/calendar" />
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Titre
            <input name="title" required className="form-input text-sm" placeholder="Atelier IA du mardi" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Description
            <textarea name="description" rows={3} className="form-textarea text-sm" placeholder="Décrivez le contenu de la session..." />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Début
            <input name="startsAt" type="datetime-local" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Fin
            <input name="endsAt" type="datetime-local" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Statut
            <select name="status" defaultValue={SessionStatus.SCHEDULED} className="form-select text-sm">
              {Object.values(SessionStatus).map((status) => (
                <option key={status} value={status}>
                  {sessionStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            XP de présence
            <input name="xpReward" type="number" min="0" defaultValue={30} className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Rappel (minutes)
            <input name="reminderMinutes" type="number" min="0" defaultValue={1440} className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Journée entière
            <select name="isAllDay" defaultValue="false" className="form-select text-sm">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Lieu
            <input name="location" className="form-input text-sm" placeholder="Antananarivo / Salle A / Distanciel" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Lien visio
            <input name="meetingUrl" type="url" className="form-input text-sm" placeholder="https://meet.google.com/..." />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Cours lié
            <select name="courseId" className="form-select text-sm">
              <option value="">Aucun cours lié</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Parcours lié
            <select name="programId" className="form-select text-sm">
              <option value="">Aucun parcours lié</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title} · {program.status === ProgramStatus.PUBLISHED ? "Publié" : "Brouillon"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Récurrence (RRULE optionnelle)
            <input name="recurrenceRule" className="form-input text-sm" placeholder="FREQ=WEEKLY;COUNT=6" />
          </label>
          <div className="md:col-span-2">
            <SubmitButton className="primary-button px-5 py-3 text-sm font-semibold" pendingLabel="Création...">
              Créer la session
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0c0910]">Mes sessions</h3>
            <p className="text-sm text-[#0c0910]/60">
              Gérez vos sessions, les demandes d’inscription et le pointage de présence.
            </p>
          </div>

          {ownSessions.length ? (
            ownSessions.map((trainingSession) => {
              const pendingEnrollments = trainingSession.enrollments.filter(
                (enrollment) => enrollment.status === SessionEnrollmentStatus.PENDING,
              );
              const approvedEnrollments = trainingSession.enrollments.filter(
                (enrollment) => enrollment.status === SessionEnrollmentStatus.APPROVED,
              );

              return (
                <article key={trainingSession.id} className="panel-card p-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(trainingSession.status)}`}>
                          {sessionStatusLabels[trainingSession.status]}
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
                      <h4 className="text-lg font-semibold text-[#0c0910]">{trainingSession.title}</h4>
                      <p className="text-sm text-[#0c0910]/70">
                        {formatDateTime(trainingSession.startsAt)} → {formatDateTime(trainingSession.endsAt)}
                      </p>
                      {trainingSession.location ? (
                        <p className="text-sm text-[#0c0910]/60">Lieu : {trainingSession.location}</p>
                      ) : null}
                      {trainingSession.description ? (
                        <p className="text-sm text-[#0c0910]/70">{trainingSession.description}</p>
                      ) : null}
                    </div>

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

                  <form action={updateTrainingSessionAction} className="mt-5 grid gap-4 rounded-2xl bg-[#f7f9ff] p-4 md:grid-cols-2">
                    <input type="hidden" name="returnTo" value="/trainer/calendar" />
                    <input type="hidden" name="sessionId" value={trainingSession.id} />
                    <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                      Titre
                      <input name="title" defaultValue={trainingSession.title} className="form-input text-sm" />
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
                      <select name="status" defaultValue={trainingSession.status} className="form-select text-sm">
                        {Object.values(SessionStatus).map((status) => (
                          <option key={status} value={status}>
                            {sessionStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      XP
                      <input name="xpReward" type="number" min="0" defaultValue={trainingSession.xpReward} className="form-input text-sm" />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      Journée entière
                      <select name="isAllDay" defaultValue={String(trainingSession.isAllDay)} className="form-select text-sm">
                        <option value="false">Non</option>
                        <option value="true">Oui</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      Rappel
                      <input name="reminderMinutes" type="number" min="0" defaultValue={trainingSession.reminderMinutes} className="form-input text-sm" />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      Lieu
                      <input name="location" defaultValue={trainingSession.location ?? ""} className="form-input text-sm" />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      Lien visio
                      <input name="meetingUrl" defaultValue={trainingSession.meetingUrl ?? ""} className="form-input text-sm" />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      Cours lié
                      <select name="courseId" defaultValue={trainingSession.courseId ?? ""} className="form-select text-sm">
                        <option value="">Aucun cours lié</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                      Parcours lié
                      <select name="programId" defaultValue={trainingSession.programId ?? ""} className="form-select text-sm">
                        <option value="">Aucun parcours lié</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                      Description
                      <textarea name="description" rows={3} defaultValue={trainingSession.description ?? ""} className="form-textarea text-sm" />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                      Récurrence
                      <input name="recurrenceRule" defaultValue={trainingSession.recurrenceRule ?? ""} className="form-input text-sm" />
                    </label>
                    <div className="md:col-span-2">
                      <SubmitButton className="primary-button px-4 py-2 text-sm font-semibold" pendingLabel="Mise à jour...">
                        Mettre à jour la session
                      </SubmitButton>
                    </div>
                  </form>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl bg-[#f7f9ff] p-4">
                      <h5 className="text-sm font-semibold text-[#0c0910]">Demandes en attente</h5>
                      <div className="mt-3 space-y-3">
                        {pendingEnrollments.length ? (
                          pendingEnrollments.map((enrollment) => (
                            <div key={enrollment.id} className="rounded-xl bg-white p-3">
                              <p className="font-medium text-[#0c0910]">{enrollment.user.name}</p>
                              <p className="text-xs text-[#0c0910]/60">{enrollment.user.email}</p>
                              <div className="mt-3 flex gap-2">
                                <form action={reviewSessionEnrollmentAction}>
                                  <input type="hidden" name="returnTo" value="/trainer/calendar" />
                                  <input type="hidden" name="enrollmentId" value={enrollment.id} />
                                  <input type="hidden" name="status" value={SessionEnrollmentStatus.APPROVED} />
                                  <SubmitButton className="inline-flex items-center justify-center rounded-lg bg-[#119da4] px-3 py-2 text-xs font-semibold text-white" pendingLabel="...">
                                    Approuver
                                  </SubmitButton>
                                </form>
                                <form action={reviewSessionEnrollmentAction}>
                                  <input type="hidden" name="returnTo" value="/trainer/calendar" />
                                  <input type="hidden" name="enrollmentId" value={enrollment.id} />
                                  <input type="hidden" name="status" value={SessionEnrollmentStatus.REJECTED} />
                                  <SubmitButton className="inline-flex items-center justify-center rounded-lg bg-[#c2410c] px-3 py-2 text-xs font-semibold text-white" pendingLabel="...">
                                    Refuser
                                  </SubmitButton>
                                </form>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#0c0910]/55">Aucune demande en attente.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#f7f9ff] p-4">
                      <h5 className="text-sm font-semibold text-[#0c0910]">Présence apprenants</h5>
                      <div className="mt-3 space-y-3">
                        {approvedEnrollments.length ? (
                          approvedEnrollments.map((enrollment) => {
                            const attendance = trainingSession.attendances.find(
                              (entry) => entry.userId === enrollment.user.id,
                            );

                            return (
                              <form key={enrollment.id} action={markSessionAttendanceAction} className="rounded-xl bg-white p-3">
                                <input type="hidden" name="returnTo" value="/trainer/calendar" />
                                <input type="hidden" name="sessionId" value={trainingSession.id} />
                                <input type="hidden" name="userId" value={enrollment.user.id} />
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-[#0c0910]">{enrollment.user.name}</p>
                                    <p className={`mt-1 inline-flex rounded-full px-2 py-1 text-[0.7rem] font-semibold ${attendance ? getAttendanceStatusClassName(attendance.status) : getEnrollmentStatusClassName(enrollment.status)}`}>
                                      {attendance ? attendanceStatusLabels[attendance.status] : sessionEnrollmentStatusLabels[enrollment.status]}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <select
                                      name="status"
                                      defaultValue={attendance?.status ?? AttendanceStatus.PRESENT}
                                      className="form-select h-10 text-sm"
                                    >
                                      {Object.values(AttendanceStatus).map((status) => (
                                        <option key={status} value={status}>
                                          {attendanceStatusLabels[status]}
                                        </option>
                                      ))}
                                    </select>
                                    <SubmitButton className="inline-flex items-center justify-center rounded-lg bg-[#0F63FF] px-3 py-2 text-xs font-semibold !text-white" pendingLabel="...">
                                      Pointer
                                    </SubmitButton>
                                  </div>
                                </div>
                              </form>
                            );
                          })
                        ) : (
                          <p className="text-sm text-[#0c0910]/55">Aucun apprenant approuvé sur cette session.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-[#0c0910]">Aucune session pour le moment</h3>
              <p className="mt-2 text-sm text-[#0c0910]/70">
                Créez votre première session pour ouvrir les inscriptions apprenantes.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0c0910]">Sessions des autres formateurs</h3>
            <p className="text-sm text-[#0c0910]/60">Lecture seule pour garder une vue globale du calendrier.</p>
          </div>

          <div className="space-y-3">
            {otherSessions.length ? (
              otherSessions.map((trainingSession) => (
                <article key={trainingSession.id} className="panel-card p-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(trainingSession.status)}`}>
                        {sessionStatusLabels[trainingSession.status]}
                      </span>
                      <span className="rounded-full bg-[#655670]/12 px-2.5 py-1 text-xs font-semibold text-[#655670]">
                        {trainingSession.trainer.name}
                      </span>
                    </div>
                    <h4 className="font-semibold text-[#0c0910]">{trainingSession.title}</h4>
                    <p className="text-sm text-[#0c0910]/65">
                      {formatDateTime(trainingSession.startsAt)} → {formatDateTime(trainingSession.endsAt)}
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
