import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { updateXpLevelSettingsAction } from "@/actions/admin";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { auth } from "@/lib/auth";
import { courseLevelDescriptions, courseLevelLabels } from "@/lib/course-level";
import { db } from "@/lib/db";
import { getAllXpLevelSettings } from "@/lib/xp-settings";

type AdminXpPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function AdminXpPage({ searchParams }: AdminXpPageProps) {
  const [feedback, session] = await Promise.all([searchParams, auth()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const settings = await getAllXpLevelSettings(db);

  const beginner = settings.find((setting) => setting.level === "BEGINNER");
  const intermediate = settings.find((setting) => setting.level === "INTERMEDIATE");
  const advanced = settings.find((setting) => setting.level === "ADVANCED");

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Configuration XP</h2>
        <p className="text-sm text-[#0c0910]/70">
          Ajustez les coefficients XP appliqués aux cours selon leur niveau. Les gains apprenants
          sur chapitres et quiz utilisent ensuite ces ratios.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <form
          action={updateXpLevelSettingsAction}
          className="space-y-5 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[#0c0910]">Ratios par niveau</h3>
            <p className="text-sm text-[#0c0910]/60">
              Base actuelle : chapitre terminé = 10 XP, quiz réussi = XP du quiz, quiz parfait =
              bonus 25 XP. Le coefficient du niveau multiplie ces bases.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              {courseLevelLabels.BEGINNER}
              <input
                name="beginnerMultiplier"
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                required
                defaultValue={beginner?.multiplier ?? 1}
                className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
              <span className="block text-xs font-normal text-[#0c0910]/60">
                {courseLevelDescriptions.BEGINNER}
              </span>
            </label>

            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              {courseLevelLabels.INTERMEDIATE}
              <input
                name="intermediateMultiplier"
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                required
                defaultValue={intermediate?.multiplier ?? 1.5}
                className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
              <span className="block text-xs font-normal text-[#0c0910]/60">
                {courseLevelDescriptions.INTERMEDIATE}
              </span>
            </label>

            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              {courseLevelLabels.ADVANCED}
              <input
                name="advancedMultiplier"
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                required
                defaultValue={advanced?.multiplier ?? 2}
                className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
              <span className="block text-xs font-normal text-[#0c0910]/60">
                {courseLevelDescriptions.ADVANCED}
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
          >
            Enregistrer les coefficients
          </button>
        </form>

        <aside className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#0c0910]">Périmètre actuel</h3>
          <div className="space-y-2 text-sm text-[#0c0910]/70">
            <p>Les XP apprenant ne s’appliquent qu’aux utilisateurs de rôle apprenant.</p>
            <p>Les formateurs choisissent le niveau du cours, mais ne règlent pas les ratios.</p>
            <p>L’ajustement XP manuel par utilisateur reste planifié pour la phase 6.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
