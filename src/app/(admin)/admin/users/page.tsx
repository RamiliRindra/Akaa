import Link from "next/link";
import { Prisma, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { updateUserActiveStateAction, updateUserRoleAction } from "@/actions/admin";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type AdminUsersPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
    role?: string;
    status?: string;
    q?: string;
    page?: string;
    view?: string;
  }>;
};

const roleLabels: Record<UserRole, string> = {
  LEARNER: "Apprenant",
  TRAINER: "Formateur",
  ADMIN: "Admin",
};

const USERS_PER_PAGE = 20;

function buildUsersHref({
  role,
  status,
  q,
  page,
  view,
}: {
  role?: string;
  status?: string;
  q?: string;
  page?: number;
  view?: string;
}) {
  const params = new URLSearchParams();

  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  if (view) params.set("view", view);

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const [feedback, session] = await Promise.all([searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const selectedRole = Object.values(UserRole).includes(feedback.role as UserRole)
    ? (feedback.role as UserRole)
    : undefined;
  const selectedStatus =
    feedback.status === "active" || feedback.status === "inactive" ? feedback.status : undefined;
  const searchQuery = feedback.q?.trim() ?? "";
  const currentView = feedback.view === "cards" ? "cards" : "table";
  const currentPage = Math.max(Number(feedback.page ?? "1") || 1, 1);

  const where: Prisma.UserWhereInput = {
    ...(selectedRole ? { role: selectedRole } : undefined),
    ...(selectedStatus === "active"
      ? { isActive: true }
      : selectedStatus === "inactive"
        ? { isActive: false }
        : undefined),
    ...(searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { email: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : undefined),
  };

  const [users, totalUsersFiltered, learnerCount, trainerCount, adminCount, inactiveCount] =
    await Promise.all([
      db.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (currentPage - 1) * USERS_PER_PAGE,
        take: USERS_PER_PAGE,
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
      db.user.count({ where }),
      db.user.count({ where: { role: UserRole.LEARNER } }),
      db.user.count({ where: { role: UserRole.TRAINER } }),
      db.user.count({ where: { role: UserRole.ADMIN } }),
      db.user.count({ where: { isActive: false } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalUsersFiltered / USERS_PER_PAGE));
  const previousPage = currentPage > 1 ? currentPage - 1 : undefined;
  const nextPage = currentPage < totalPages ? currentPage + 1 : undefined;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Gestion des utilisateurs</h2>
        <p className="text-sm text-[#0c0910]/70">
          Gérez les rôles, recherchez rapidement un compte et bloquez l’accès si nécessaire.
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

      <form className="grid gap-4 rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
        <input type="hidden" name="view" value={currentView} />
        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Recherche
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Nom ou email"
            className="form-input text-sm"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Rôle
          <select
            name="role"
            defaultValue={selectedRole ?? ""}
            className="form-select text-sm"
          >
            <option value="">Tous les rôles</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
          Statut
          <select
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="form-select text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Désactivés</option>
          </select>
        </label>

        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="primary-button h-11 px-4 text-sm font-semibold"
          >
            Filtrer
          </button>
          <Link
            href={buildUsersHref({ view: currentView })}
            className="secondary-button h-11 px-4 text-sm font-semibold"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildUsersHref({
              role: selectedRole,
              status: selectedStatus,
              q: searchQuery,
              view: "table",
            })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              currentView === "table"
                ? "bg-[#0F63FF] text-white"
                : "bg-white text-[#0c0910] ring-1 ring-[#0c0910]/10"
            }`}
          >
            Vue tableau
          </Link>
          <Link
            href={buildUsersHref({
              role: selectedRole,
              status: selectedStatus,
              q: searchQuery,
              view: "cards",
            })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              currentView === "cards"
                ? "bg-[#0F63FF] text-white"
                : "bg-white text-[#0c0910] ring-1 ring-[#0c0910]/10"
            }`}
          >
            Vue cartes
          </Link>
        </div>

        <p className="text-sm text-[#0c0910]/60">
          {totalUsersFiltered} utilisateur{totalUsersFiltered > 1 ? "s" : ""} trouvé
          {totalUsersFiltered > 1 ? "s" : ""}
        </p>
      </div>

      {currentView === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9ff] text-[#0c0910]/70">
                <tr>
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">XP</th>
                  <th className="px-4 py-3 font-medium">Activité</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[#0c0910]/8 align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#0c0910]">{user.name}</p>
                      <p className="text-xs text-[#0c0910]/60">{user.email}</p>
                      <p className="mt-1 text-xs text-[#0c0910]/50">Créé le {formatDate(user.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateUserRoleAction.bind(null, user.id)} className="flex items-center gap-2">
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="h-10 rounded-lg border border-[#0c0910]/10 bg-white px-3 text-sm text-[#0c0910]"
                        >
                          {Object.values(UserRole).map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                        <SubmitButton
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F63FF] px-3 text-xs font-semibold text-white transition hover:bg-[#0F63FF]/90"
                          pendingLabel="..."
                        >
                          OK
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive
                            ? "bg-[#119da4]/10 text-[#119da4]"
                            : "bg-[#c2410c]/10 text-[#c2410c]"
                        }`}
                      >
                        {user.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.role === UserRole.LEARNER ? (
                        <div className="space-y-1">
                          <p className="font-medium text-[#0c0910]">{user.totalXp} XP</p>
                          <p className="text-xs text-[#0c0910]/60">Niveau {user.level}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-[#0c0910]/50">Non applicable</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#0c0910]/60">
                      <p>{user._count.courses} cours</p>
                      <p>{user._count.enrollments} inscriptions</p>
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateUserActiveStateAction.bind(null, user.id)}>
                        <input type="hidden" name="isActive" value={String(!user.isActive)} />
                        <SubmitButton
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-white transition ${
                            user.isActive
                              ? "bg-[#c2410c] hover:bg-[#c2410c]/90"
                              : "bg-[#119da4] hover:bg-[#119da4]/90"
                          }`}
                          pendingLabel={user.isActive ? "..." : "..."}
                        >
                          {user.isActive ? "Désactiver" : "Réactiver"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                    <SubmitButton
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F63FF] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
                      pendingLabel="Enregistrement..."
                    >
                      Enregistrer le rôle
                    </SubmitButton>
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
                    <SubmitButton
                      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                        user.isActive
                          ? "bg-[#c2410c] hover:bg-[#c2410c]/90"
                          : "bg-[#119da4] hover:bg-[#119da4]/90"
                      }`}
                      pendingLabel={user.isActive ? "Désactivation..." : "Réactivation..."}
                    >
                      {user.isActive ? "Désactiver le compte" : "Réactiver le compte"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0c0910]/10 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-[#0c0910]/60">
          Page {currentPage} sur {totalPages}
        </p>
        <div className="flex gap-3">
          {previousPage ? (
            <Link
              href={buildUsersHref({
                role: selectedRole,
                status: selectedStatus,
                q: searchQuery,
                page: previousPage,
                view: currentView,
              })}
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              ← Précédent
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-[#0c0910]/5 px-4 py-2 text-sm font-semibold text-[#0c0910]/40">
              ← Précédent
            </span>
          )}

          {nextPage ? (
            <Link
              href={buildUsersHref({
                role: selectedRole,
                status: selectedStatus,
                q: searchQuery,
                page: nextPage,
                view: currentView,
              })}
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              Suivant →
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-[#0c0910]/5 px-4 py-2 text-sm font-semibold text-[#0c0910]/40">
              Suivant →
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
