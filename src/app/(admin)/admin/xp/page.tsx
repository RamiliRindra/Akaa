import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { adjustUserXpAction, updateXpLevelSettingsAction } from "@/actions/admin";
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
  const [learners, recentAdjustments] = await Promise.all([
    db.user.findMany({
      where: {
        role: UserRole.LEARNER,
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        totalXp: true,
        level: true,
      },
    }),
    db.xpTransaction.findMany({
      where: {
        source: "ADMIN",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        amount: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

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
        <div className="space-y-6">
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
                  className="form-input text-sm"
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
                  className="form-input text-sm"
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
                  className="form-input text-sm"
                />
                <span className="block text-xs font-normal text-[#0c0910]/60">
                  {courseLevelDescriptions.ADVANCED}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="primary-button px-4 py-2 text-sm font-semibold"
            >
              Enregistrer les coefficients
            </button>
          </form>

          <form
            action={adjustUserXpAction}
            className="space-y-5 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#0c0910]">Ajustement XP manuel</h3>
              <p className="text-sm text-[#0c0910]/60">
                Réservé aux apprenants. Chaque ajustement crée une transaction de source admin.
              </p>
            </div>

            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              Apprenant
              <select
                name="userId"
                required
                className="form-select text-sm"
              >
                <option value="">Sélectionner un apprenant</option>
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.name} ({learner.email}) • Niv. {learner.level} • {learner.totalXp} XP
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Montant XP
                <input
                  name="amount"
                  type="number"
                  required
                  step="1"
                  className="form-input text-sm"
                  placeholder="+50 ou -25"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                Raison
                <input
                  name="reason"
                  required
                  className="form-input text-sm"
                  placeholder="Correction manuelle après audit pédagogique"
                />
              </label>
            </div>

            <button
              type="submit"
              className="primary-button bg-[linear-gradient(135deg,#453750,#655670)] px-4 py-2 text-sm font-semibold"
            >
              Enregistrer l’ajustement
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#0c0910]">Périmètre actuel</h3>
          <div className="space-y-2 text-sm text-[#0c0910]/70">
            <p>Les XP apprenant ne s’appliquent qu’aux utilisateurs de rôle apprenant.</p>
            <p>Les formateurs choisissent le niveau du cours, mais ne règlent pas les ratios.</p>
            <p>L’ajustement XP manuel agit via une transaction admin, puis recalcule niveau et total XP.</p>
          </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0c0910]">Derniers ajustements</h3>
            <div className="space-y-3">
              {recentAdjustments.length ? (
                recentAdjustments.map((adjustment) => (
                  <div key={adjustment.id} className="rounded-xl bg-[#f7f9ff] p-3 text-sm">
                    <p className="font-medium text-[#0c0910]">
                      {adjustment.user.name} <span className="font-normal text-[#0c0910]/60">({adjustment.user.email})</span>
                    </p>
                    <p className={`mt-1 font-semibold ${adjustment.amount >= 0 ? "text-[#119da4]" : "text-[#c2410c]"}`}>
                      {adjustment.amount >= 0 ? "+" : ""}
                      {adjustment.amount} XP
                    </p>
                    <p className="mt-1 text-xs text-[#0c0910]/60">{adjustment.description ?? "Sans raison"}</p>
                    <p className="mt-1 text-xs text-[#0c0910]/50">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(adjustment.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#0c0910]/60">Aucun ajustement manuel pour le moment.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
