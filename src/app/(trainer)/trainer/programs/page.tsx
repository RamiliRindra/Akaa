import { ProgramStatus, UserRole } from "@prisma/client";
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

type TrainerProgramsPageProps = {
  searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function TrainerProgramsPage({ searchParams }: TrainerProgramsPageProps) {
  const [session, feedback] = await Promise.all([getCachedSession(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.TRAINER && session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const programs = await db.trainingProgram.findMany({
    where: session.user.role === UserRole.ADMIN ? undefined : { trainerId: session.user.id },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    include: {
      sessions: {
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Parcours de formation</h2>
        <p className="text-sm text-[#0c0910]/70">
          Regroupez vos sessions dans des programmes lisibles côté apprenant.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="panel-card p-6">
        <div className="mb-5 space-y-1">
          <h3 className="text-lg font-semibold text-[#0c0910]">Créer un parcours</h3>
          <p className="text-sm text-[#0c0910]/60">Un parcours peut ensuite regrouper plusieurs sessions.</p>
        </div>

        <form action={createTrainingProgramAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="returnTo" value="/trainer/programs" />
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Titre
            <input name="title" required className="form-input text-sm" placeholder="Parcours IA bureautique" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Description
            <textarea name="description" rows={3} className="form-textarea text-sm" placeholder="Décrivez le programme..." />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Statut
            <select name="status" defaultValue={ProgramStatus.DRAFT} className="form-select text-sm">
              {Object.values(ProgramStatus).map((status) => (
                <option key={status} value={status}>
                  {programStatusLabels[status]}
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
        {programs.length ? (
          programs.map((program) => (
            <article key={program.id} className="panel-card p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getProgramStatusClassName(program.status)}`}>
                      {programStatusLabels[program.status]}
                    </span>
                    <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                      {program.sessions.length} session{program.sessions.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[#0c0910]">{program.title}</h3>
                  {program.description ? (
                    <p className="text-sm text-[#0c0910]/70">{program.description}</p>
                  ) : null}
                </div>

                <form action={deleteTrainingProgramAction}>
                  <input type="hidden" name="returnTo" value="/trainer/programs" />
                  <input type="hidden" name="programId" value={program.id} />
                  <ConfirmSubmitButton
                    triggerLabel="Supprimer"
                    triggerClassName="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    title="Supprimer ce parcours ?"
                    description="Les sessions liées resteront intactes mais seront détachées du parcours."
                    requireText="delete"
                    requireTextPlaceholder="delete"
                    confirmLabel="Supprimer définitivement"
                    pendingLabel="Suppression..."
                  />
                </form>
              </div>

              <form action={updateTrainingProgramAction} className="mt-5 grid gap-4 rounded-2xl bg-[#f7f9ff] p-4 md:grid-cols-2">
                <input type="hidden" name="returnTo" value="/trainer/programs" />
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
                  Statut
                  <select name="status" defaultValue={program.status} className="form-select text-sm">
                    {Object.values(ProgramStatus).map((status) => (
                      <option key={status} value={status}>
                        {programStatusLabels[status]}
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
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
            <h3 className="text-lg font-semibold text-[#0c0910]">Aucun parcours pour le moment</h3>
            <p className="mt-2 text-sm text-[#0c0910]/70">
              Créez un premier parcours pour structurer vos futures sessions.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
