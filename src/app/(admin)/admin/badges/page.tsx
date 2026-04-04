import { BadgeConditionType } from "@prisma/client";
import { redirect } from "next/navigation";

import { createBadgeAction, deleteBadgeAction, updateBadgeAction } from "@/actions/admin";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

type AdminBadgesPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

const badgeConditionLabels: Record<BadgeConditionType, string> = {
  XP_THRESHOLD: "Seuil d’XP",
  COURSES_COMPLETED: "Cours terminés",
  STREAK: "Streak",
  QUIZ_PERFECT: "Quiz parfaits",
  MANUAL: "Manuel",
};

export default async function AdminBadgesPage({ searchParams }: AdminBadgesPageProps) {
  const [feedback, session] = await Promise.all([searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const badges = await db.badge.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      iconUrl: true,
      conditionType: true,
      conditionValue: true,
      xpBonus: true,
      isActive: true,
      userBadges: {
        select: {
          id: true,
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Gestion des badges</h2>
        <p className="text-sm text-[#0c0910]/70">
          Paramétrez les badges automatiques ou manuels. Utilisez de préférence des icônes SVG dans <code>/public/badges</code>.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <form
        action={createBadgeAction}
        className="grid gap-4 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm lg:grid-cols-2"
      >
        <div className="space-y-2 lg:col-span-2">
          <h3 className="text-lg font-semibold text-[#0c0910]">Créer un badge</h3>
          <p className="text-sm text-[#0c0910]/60">
            Les badges manuels sont attribués plus tard par l’admin. Les autres types servent aux règles automatiques.
          </p>
        </div>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Nom
          <input
            name="name"
            required
            className="form-input text-sm"
            placeholder="Mentor du mois"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Icône (URL ou chemin)
          <input
            name="iconUrl"
            required
            defaultValue="/badges/premier-pas.svg"
            className="form-input text-sm"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910] lg:col-span-2">
          Description
          <textarea
            name="description"
            rows={3}
            className="form-textarea text-sm"
            placeholder="Récompense accordée aux apprenants qui..."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-4 lg:col-span-2">
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Condition
            <select
              name="conditionType"
              defaultValue={BadgeConditionType.XP_THRESHOLD}
              className="form-select text-sm"
            >
              {Object.values(BadgeConditionType).map((type) => (
                <option key={type} value={type}>
                  {badgeConditionLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Valeur de condition
            <input
              name="conditionValue"
              type="number"
              min="0"
              className="form-input text-sm"
              placeholder="10"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Bonus XP
            <input
              name="xpBonus"
              type="number"
              min="0"
              defaultValue="0"
              required
              className="form-input text-sm"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            État
            <select
              name="isActive"
              defaultValue="true"
              className="form-select text-sm"
            >
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          className="primary-button px-4 py-2 text-sm font-semibold lg:col-span-2 lg:w-fit"
        >
          Ajouter le badge
        </button>
      </form>

      <div className="space-y-4">
        {badges.map((badge) => (
          <article key={badge.id} className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-[#0c0910]">{badge.name}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  badge.isActive ? "bg-[#119da4]/10 text-[#119da4]" : "bg-[#c2410c]/10 text-[#c2410c]"
                }`}
              >
                {badge.isActive ? "Actif" : "Inactif"}
              </span>
              <span className="rounded-full bg-[#453750]/10 px-2.5 py-1 text-xs font-semibold text-[#453750]">
                {badgeConditionLabels[badge.conditionType]}
              </span>
              <span className="rounded-full bg-[#ffc857]/15 px-2.5 py-1 text-xs font-semibold text-[#8a6110]">
                +{badge.xpBonus} XP
              </span>
              <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                {badge.userBadges.length} attribution{badge.userBadges.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
              <form action={updateBadgeAction.bind(null, badge.id)} className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                  Nom
                  <input
                    name="name"
                    required
                    defaultValue={badge.name}
                    className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                  Icône (URL ou chemin)
                  <input
                    name="iconUrl"
                    required
                    defaultValue={badge.iconUrl}
                    className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[#0c0910] lg:col-span-2">
                  Description
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={badge.description ?? ""}
                    className="w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 py-3 text-sm text-[#0c0910]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-4 lg:col-span-2">
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Condition
                    <select
                      name="conditionType"
                      defaultValue={badge.conditionType}
                      className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910]"
                    >
                      {Object.values(BadgeConditionType).map((type) => (
                        <option key={type} value={type}>
                          {badgeConditionLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Valeur de condition
                    <input
                      name="conditionValue"
                      type="number"
                      min="0"
                      defaultValue={badge.conditionValue ?? ""}
                      className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910]"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Bonus XP
                    <input
                      name="xpBonus"
                      type="number"
                      min="0"
                      required
                      defaultValue={badge.xpBonus}
                      className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910]"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    État
                    <select
                      name="isActive"
                      defaultValue={String(badge.isActive)}
                      className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910]"
                    >
                      <option value="true">Actif</option>
                      <option value="false">Inactif</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90 lg:col-span-2 lg:w-fit"
                >
                  Enregistrer
                </button>
              </form>

              <form action={deleteBadgeAction.bind(null, badge.id)} className="xl:self-start">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[#c2410c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c2410c]/90"
                >
                  Supprimer
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
