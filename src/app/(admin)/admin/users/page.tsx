import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { updateUserActiveStateAction, updateUserRoleAction } from "@/actions/admin";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type AdminUsersPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
    role?: string;
  }>;
};

const roleLabels: Record<UserRole, string> = {
  LEARNER: "Apprenant",
  TRAINER: "Formateur",
  ADMIN: "Admin",
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const [feedback, session] = await Promise.all([searchParams, auth()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const selectedRole = Object.values(UserRole).includes(feedback.role as UserRole)
    ? (feedback.role as UserRole)
    : undefined;

  const [users, learnerCount, trainerCount, adminCount, inactiveCount] = await Promise.all([
    db.user.findMany({
      where: selectedRole ? { role: selectedRole } : undefined,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        totalXp: true,
        level: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            enrollments: true,
          },
        },
      },
    }),
    db.user.count({ where: { role: UserRole.LEARNER } }),
    db.user.count({ where: { role: UserRole.TRAINER } }),
    db.user.count({ where: { role: UserRole.ADMIN } }),
    db.user.count({ where: { isActive: false } }),
  ]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Gestion des utilisateurs</h2>
        <p className="text-sm text-[#0c0910]/70">
          Gérez les rôles et l’activation des comptes. La désactivation bloque les nouvelles connexions.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Apprenants</p>
          <p className="mt-2 text-3xl font-bold text-[#0F63FF]">{learnerCount}</p>
        </div>
        <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Formateurs</p>
          <p className="mt-2 text-3xl font-bold text-[#453750]">{trainerCount}</p>
        </div>
        <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Admins</p>
          <p className="mt-2 text-3xl font-bold text-[#119da4]">{adminCount}</p>
        </div>
        <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#0c0910]/60">Comptes désactivés</p>
          <p className="mt-2 text-3xl font-bold text-[#c2410c]">{inactiveCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/users"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !selectedRole ? "bg-[#0F63FF] text-white" : "bg-white text-[#0c0910] ring-1 ring-[#0c0910]/10"
          }`}
        >
          Tous
        </Link>
        {Object.values(UserRole).map((role) => (
          <Link
            key={role}
            href={`/admin/users?role=${role}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              selectedRole === role
                ? "bg-[#0F63FF] text-white"
                : "bg-white text-[#0c0910] ring-1 ring-[#0c0910]/10"
            }`}
          >
            {roleLabels[role]}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <article
            key={user.id}
            className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                    {roleLabels[user.role]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.isActive
                        ? "bg-[#119da4]/10 text-[#119da4]"
                        : "bg-[#c2410c]/10 text-[#c2410c]"
                    }`}
                  >
                    {user.isActive ? "Actif" : "Désactivé"}
                  </span>
                  {user.role === UserRole.LEARNER ? (
                    <span className="rounded-full bg-[#ffc857]/15 px-2.5 py-1 text-xs font-semibold text-[#8a6110]">
                      Niveau {user.level} • {user.totalXp} XP
                    </span>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0c0910]">{user.name}</h3>
                  <p className="text-sm text-[#0c0910]/70">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-[#0c0910]/60">
                  <span>Créé le {formatDate(user.createdAt)}</span>
                  <span>{user._count.courses} cours</span>
                  <span>{user._count.enrollments} inscriptions</span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:min-w-[420px]">
                <form
                  action={updateUserRoleAction.bind(null, user.id)}
                  className="space-y-2 rounded-xl bg-[#f7f9ff] p-4"
                >
                  <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                    Changer le rôle
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="h-10 w-full rounded-lg border border-[#0c0910]/10 bg-white px-3 text-sm text-[#0c0910]"
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-[#0F63FF] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
                  >
                    Enregistrer le rôle
                  </button>
                </form>

                <form
                  action={updateUserActiveStateAction.bind(null, user.id)}
                  className="space-y-2 rounded-xl bg-[#f7f9ff] p-4"
                >
                  <input type="hidden" name="isActive" value={String(!user.isActive)} />
                  <p className="text-sm font-medium text-[#0c0910]">État du compte</p>
                  <p className="text-xs text-[#0c0910]/60">
                    {user.isActive
                      ? "Bloquer les prochaines connexions de cet utilisateur."
                      : "Réautoriser l’accès à la plateforme."}
                  </p>
                  <button
                    type="submit"
                    className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                      user.isActive
                        ? "bg-[#c2410c] hover:bg-[#c2410c]/90"
                        : "bg-[#119da4] hover:bg-[#119da4]/90"
                    }`}
                  >
                    {user.isActive ? "Désactiver le compte" : "Réactiver le compte"}
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
