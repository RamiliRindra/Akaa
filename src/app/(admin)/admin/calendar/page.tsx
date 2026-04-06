import { AttendanceStatus, SessionAccessPolicy, SessionEnrollmentStatus, SessionStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createTrainingSessionAction,
  deleteTrainingSessionAction,
  updateTrainingSessionAction,
} from "@/actions/training";
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

type AdminCalendarPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function AdminCalendarPage({ searchParams }: AdminCalendarPageProps) {
  const [session, feedback] = await Promise.all([getCachedSession(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [responsibleUsers, courses, programs, sessions, enrollmentByStatus, attendancePresent, attendanceTotal] =
    await Promise.all([
    db.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [UserRole.TRAINER, UserRole.ADMIN],
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
    db.course.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.trainingProgram.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    db.trainingSession.findMany({
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        trainer: { select: { name: true } },
        course: { select: { title: true } },
        program: { select: { title: true } },
        _count: { select: { enrollments: true } },
      },
    }),
    db.sessionEnrollment.groupBy({
      by: ["status"],
      _count: true,
    }),
    db.sessionAttendance.count({
      where: { status: AttendanceStatus.PRESENT },
    }),
    db.sessionAttendance.count(),
  ]);

  const sessionStatusCounts = sessions.reduce(
    (acc, s) => {
      acc[s.status] += 1;
      return acc;
    },
    { SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 } as Record<SessionStatus, number>,
  );

  const enrollmentTotals = enrollmentByStatus.reduce(
    (acc, row) => {
      acc[row.status] = row._count;
      return acc;
    },
    {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    } as Record<SessionEnrollmentStatus, number>,
  );

  const totalEnrollments = enrollmentByStatus.reduce((sum, row) => sum + row._count, 0);

  const topTrainers = await db.user.findMany({
    where: {
      role: { in: [UserRole.TRAINER, UserRole.ADMIN] },
      trainingSessions: { some: {} },
    },
    select: {
      id: true,
      name: true,
      _count: { select: { trainingSessions: true } },
    },
    orderBy: { trainingSessions: { _count: "desc" } },
    take: 6,
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Administration des sessions</h2>
        <p className="text-sm text-[#0c0910]/70">
          Vue globale de toutes les sessions planifiées sur la plateforme.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c0910]/55">Sessions</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#0c0910]">{sessions.length}</p>
          <p className="mt-1 text-xs text-[#0c0910]/60">
            Planifiées {sessionStatusCounts.SCHEDULED} · Terminées {sessionStatusCounts.COMPLETED} · Annulées{" "}
            {sessionStatusCounts.CANCELLED}
          </p>
        </div>
        <div className="panel-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c0910]/55">Inscriptions</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#0c0910]">{totalEnrollments}</p>
          <p className="mt-1 text-xs text-[#0c0910]/60">
            En attente {enrollmentTotals.PENDING} · Approuvées {enrollmentTotals.APPROVED} · Refusées{" "}
            {enrollmentTotals.REJECTED}
          </p>
        </div>
        <div className="panel-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c0910]/55">Présences</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#119da4]">{attendancePresent}</p>
          <p className="mt-1 text-xs text-[#0c0910]/60">
            Pointages « présent » sur {attendanceTotal} enregistrement{attendanceTotal > 1 ? "s" : ""} total
            {attendanceTotal > 0
              ? ` (${Math.round((attendancePresent / attendanceTotal) * 100)} % présents)`
              : ""}
          </p>
        </div>
        <div className="panel-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c0910]/55">Taux participation</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#0F63FF]">
            {totalEnrollments > 0 ? `${Math.round((enrollmentTotals.APPROVED / totalEnrollments) * 100)} %` : "—"}
          </p>
          <p className="mt-1 text-xs text-[#0c0910]/60">Part des inscriptions approuvées sur le total des demandes</p>
        </div>
      </div>

      {topTrainers.length ? (
        <div className="panel-card p-5">
          <h3 className="text-sm font-semibold text-[#0c0910]">Formateurs — sessions créées</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topTrainers.map((trainer) => (
              <li
                key={trainer.id}
                className="flex items-center justify-between rounded-xl bg-[#f7f9ff] px-3 py-2 text-sm text-[#0c0910]"
              >
                <span className="font-medium">{trainer.name}</span>
                <span className="font-mono text-[#655670]">{trainer._count.trainingSessions}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="panel-card p-6">
        <div className="mb-5 space-y-1">
          <h3 className="text-lg font-semibold text-[#0c0910]">Créer une session globale</h3>
          <p className="text-sm text-[#0c0910]/60">En phase 8, l’admin peut aussi créer des sessions directement.</p>
        </div>
        <form action={createTrainingSessionAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="returnTo" value="/admin/calendar" />
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Titre
            <input name="title" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Début
            <input name="startsAt" type="datetime-local" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Fin
            <input name="endsAt" type="datetime-local" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Description
            <textarea name="description" rows={3} className="form-textarea text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Responsable
            <select name="trainerId" className="form-select text-sm" defaultValue={session.user.id}>
              {responsibleUsers.map((responsibleUser) => (
                <option key={responsibleUser.id} value={responsibleUser.id}>
                  {responsibleUser.name} · {responsibleUser.role === UserRole.ADMIN ? "Admin" : "Formateur"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Statut
            <select name="status" className="form-select text-sm">
              {Object.values(SessionStatus).map((status) => (
                <option key={status} value={status}>
                  {sessionStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Politique d’accès
            <select name="accessPolicy" defaultValue={SessionAccessPolicy.OPEN} className="form-select text-sm">
              {Object.values(SessionAccessPolicy).map((policy) => (
                <option key={policy} value={policy}>
                  {sessionAccessPolicyLabels[policy]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            XP
            <input name="xpReward" type="number" min="0" defaultValue={30} className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Lieu
            <input name="location" className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Lien visio
            <input name="meetingUrl" className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Journée entière
            <select name="isAllDay" defaultValue="false" className="form-select text-sm">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Rappel
            <input name="reminderMinutes" type="number" min="0" defaultValue={1440} className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Cours
            <select name="courseId" className="form-select text-sm">
              <option value="">Aucun cours lié</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <p className="text-xs font-normal text-[#0c0910]/55">Renseignez un seul rattachement : cours ou parcours.</p>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Parcours
            <select name="programId" className="form-select text-sm">
              <option value="">Aucun parcours lié</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title}
                </option>
              ))}
            </select>
            <p className="text-xs font-normal text-[#0c0910]/55">Laissez vide si cette session cible un cours.</p>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Récurrence (RRULE)
            <input name="recurrenceRule" className="form-input text-sm" placeholder="FREQ=WEEKLY;COUNT=8" />
            <span className="block text-xs font-normal text-[#0c0910]/55">
              Si renseigné, une ligne de session est créée par occurrence (plafonné à 52). Ex. FREQ=DAILY;COUNT=5 ou
              FREQ=WEEKLY;BYDAY=MO;COUNT=10 — format RFC 5545.
            </span>
          </label>
          <div className="md:col-span-2">
            <SubmitButton className="primary-button px-5 py-3 text-sm font-semibold" pendingLabel="Création...">
              Créer la session
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {sessions.map((trainingSession) => (
          <article key={trainingSession.id} className="panel-card p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusClassName(trainingSession.status)}`}>
                    {sessionStatusLabels[trainingSession.status]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionAccessPolicyClassName(trainingSession.accessPolicy)}`}>
                    {sessionAccessPolicyLabels[trainingSession.accessPolicy]}
                  </span>
                  <span className="rounded-full bg-[#655670]/12 px-2.5 py-1 text-xs font-semibold text-[#655670]">
                    {trainingSession.trainer.name}
                  </span>
                  <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                    {trainingSession._count.enrollments} inscription{trainingSession._count.enrollments > 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#0c0910]">
                  <Link href={`/admin/sessions/${trainingSession.id}`} className="hover:text-[#0F63FF]">
                    {trainingSession.title}
                  </Link>
                </h3>
                <p className="text-sm text-[#0c0910]/70">
                  {formatDateTime(trainingSession.startsAt)} → {formatDateTime(trainingSession.endsAt)}
                </p>
              </div>
              <form action={deleteTrainingSessionAction}>
                <input type="hidden" name="returnTo" value="/admin/calendar" />
                <input type="hidden" name="sessionId" value={trainingSession.id} />
                <ConfirmSubmitButton
                  triggerLabel="Supprimer"
                  triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  title="Supprimer cette session ?"
                  description="Cette session et ses inscriptions liées seront supprimées."
                  requireText="delete"
                  requireTextPlaceholder="delete"
                  confirmLabel="Supprimer définitivement"
                  pendingLabel="Suppression..."
                />
              </form>
            </div>

            <form action={updateTrainingSessionAction} className="mt-5 grid gap-4 rounded-2xl bg-[#f7f9ff] p-4 md:grid-cols-2">
              <input type="hidden" name="returnTo" value="/admin/calendar" />
              <input type="hidden" name="sessionId" value={trainingSession.id} />
              <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                Titre
                <input name="title" defaultValue={trainingSession.title} className="form-input text-sm" />
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Début
                <input name="startsAt" type="datetime-local" defaultValue={toDateTimeLocalValue(trainingSession.startsAt)} className="form-input text-sm" />
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Fin
                <input name="endsAt" type="datetime-local" defaultValue={toDateTimeLocalValue(trainingSession.endsAt)} className="form-input text-sm" />
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Responsable
                <select name="trainerId" defaultValue={trainingSession.trainerId} className="form-select text-sm">
                  {responsibleUsers.map((responsibleUser) => (
                    <option key={responsibleUser.id} value={responsibleUser.id}>
                      {responsibleUser.name} · {responsibleUser.role === UserRole.ADMIN ? "Admin" : "Formateur"}
                    </option>
                  ))}
                </select>
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
                Politique d’accès
                <select name="accessPolicy" defaultValue={trainingSession.accessPolicy} className="form-select text-sm">
                  {Object.values(SessionAccessPolicy).map((policy) => (
                    <option key={policy} value={policy}>
                      {sessionAccessPolicyLabels[policy]}
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
                <p className="text-xs font-normal text-[#0c0910]/55">Renseignez un seul rattachement : cours ou parcours.</p>
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Parcours
                <select name="programId" defaultValue={trainingSession.programId ?? ""} className="form-select text-sm">
                  <option value="">Aucun parcours lié</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs font-normal text-[#0c0910]/55">Laissez vide si cette session cible un cours.</p>
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
                <SubmitButton className="primary-button px-4 py-2 text-sm font-semibold" pendingLabel="Enregistrement...">
                  Mettre à jour la session
                </SubmitButton>
              </div>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
