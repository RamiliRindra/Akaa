import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  createTrainingProgramAction,
  deleteTrainingProgramAction,
  updateTrainingProgramAction,
} from "@/actions/training";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getProgramStatusClassName, programStatusLabels } from "@/lib/training";

type AdminProgramsPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function AdminProgramsPage({ searchParams }: AdminProgramsPageProps) {
  const [session, feedback] = await Promise.all([getCachedSession(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [responsibleUsers, programs] = await Promise.all([
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
    db.trainingProgram.findMany({
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      include: {
        trainer: { select: { name: true } },
        _count: { select: { sessions: true } },
      },
    }),
  ]);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Administration des parcours</h2>
        <p className="text-sm text-[#0c0910]/70">Vue globale des parcours et de leur rattachement aux sessions.</p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="panel-card p-6">
        <div className="mb-5 space-y-1">
          <h3 className="text-lg font-semibold text-[#0c0910]">Créer un parcours</h3>
          <p className="text-sm text-[#0c0910]/60">L’admin peut gérer l’ensemble du catalogue de parcours.</p>
        </div>
        <form action={createTrainingProgramAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="returnTo" value="/admin/programs" />
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Titre
            <input name="title" required className="form-input text-sm" />
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
              {Object.entries(programStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <SubmitButton className="primary-button px-5 py-3 text-sm font-semibold" pendingLabel="Création...">
              Créer le parcours
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {programs.map((program) => (
          <article key={program.id} className="panel-card p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getProgramStatusClassName(program.status)}`}>
                    {programStatusLabels[program.status]}
                  </span>
                  <span className="rounded-full bg-[#655670]/12 px-2.5 py-1 text-xs font-semibold text-[#655670]">
                    {program.trainer.name}
                  </span>
                  <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                    {program._count.sessions} session{program._count.sessions > 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[#0c0910]">{program.title}</h3>
                {program.description ? <p className="text-sm text-[#0c0910]/70">{program.description}</p> : null}
              </div>

              <form action={deleteTrainingProgramAction}>
                <input type="hidden" name="returnTo" value="/admin/programs" />
                <input type="hidden" name="programId" value={program.id} />
                <ConfirmSubmitButton
                  triggerLabel="Supprimer"
                  triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  title="Supprimer ce parcours ?"
                  description="Les sessions liées resteront présentes mais ne seront plus rattachées au parcours."
                  requireText="delete"
                  requireTextPlaceholder="delete"
                  confirmLabel="Supprimer définitivement"
                  pendingLabel="Suppression..."
                />
              </form>
            </div>

            <form action={updateTrainingProgramAction} className="mt-5 grid gap-4 rounded-2xl bg-[#f7f9ff] p-4 md:grid-cols-2">
              <input type="hidden" name="returnTo" value="/admin/programs" />
              <input type="hidden" name="programId" value={program.id} />
              <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                Titre
                <input name="title" defaultValue={program.title} className="form-input text-sm" />
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
                Description
                <textarea name="description" rows={3} defaultValue={program.description ?? ""} className="form-textarea text-sm" />
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Responsable
                <select name="trainerId" defaultValue={program.trainerId} className="form-select text-sm">
                  {responsibleUsers.map((responsibleUser) => (
                    <option key={responsibleUser.id} value={responsibleUser.id}>
                      {responsibleUser.name} · {responsibleUser.role === UserRole.ADMIN ? "Admin" : "Formateur"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Statut
                <select name="status" defaultValue={program.status} className="form-select text-sm">
                  {Object.entries(programStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <SubmitButton className="primary-button px-4 py-2 text-sm font-semibold" pendingLabel="Enregistrement...">
                  Mettre à jour le parcours
                </SubmitButton>
              </div>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
