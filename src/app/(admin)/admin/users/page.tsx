import Link from "next/link";
import { Prisma, UserRole } from "@prisma/client";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { redirect } from "next/navigation";

import { updateUserActiveStateAction, updateUserRoleAction } from "@/actions/admin";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type SortField = "name" | "role" | "totalXp" | "createdAt";
type SortDir = "asc" | "desc";

type AdminUsersPageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
    role?: string;
    status?: string;
    q?: string;
    page?: string;
    view?: string;
    sort?: string;
    sortDir?: string;
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
  sort,
  sortDir,
}: {
  role?: string;
  status?: string;
  q?: string;
  page?: number;
  view?: string;
  sort?: string;
  sortDir?: string;
}) {
  const params = new URLSearchParams();

  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  if (view) params.set("view", view);
  if (sort) params.set("sort", sort);
  if (sortDir) params.set("sortDir", sortDir);

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentSortDir,
  href,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentSortDir: SortDir;
  href: (sort: string, sortDir: string) => string;
}) {
  const isActive = currentSort === field;
  const nextDir = isActive && currentSortDir === "asc" ? "desc" : "asc";
  const Icon = isActive ? (currentSortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <Link
      href={href(field, nextDir)}
      className={`inline-flex items-center gap-1 font-medium transition-colors hover:text-[var(--color-primary-bright)] ${
        isActive ? "text-[var(--color-primary-bright)]" : "text-[var(--color-text-dark)]/70"
      }`}
    >
      {label}
      <Icon className="h-3.5 w-3.5 shrink-0" />
    </Link>
  );
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
  const validSortFields: SortField[] = ["name", "role", "totalXp", "createdAt"];
  const currentSort: SortField = validSortFields.includes(feedback.sort as SortField)
    ? (feedback.sort as SortField)
    : "createdAt";
  const currentSortDir: SortDir = feedback.sortDir === "asc" ? "asc" : "desc";

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

  const orderBy: Prisma.UserOrderByWithRelationInput = { [currentSort]: currentSortDir };

  const sortHref = (sort: string, sortDir: string) =>
    buildUsersHref({ role: selectedRole, status: selectedStatus, q: searchQuery, view: currentView, sort, sortDir });

  const [users, totalUsersFiltered, learnerCount, trainerCount, adminCount, inactiveCount] =
    await Promise.all([
      db.user.findMany({
        where,
        orderBy,
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
        <h2 className="text-2xl font-bold text-[var(--color-text-dark)]">Gestion des utilisateurs</h2>
        <p className="text-sm text-[var(--color-text-dark)]/70">
          Gérez les rôles, recherchez rapidement un compte et bloquez l’accès si nécessaire.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[var(--color-text-dark)]/60">Apprenants</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-primary-bright)]">{learnerCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[var(--color-text-dark)]/60">Formateurs</p>
          <p className="mt-2 text-3xl font-bold text-[#453750]">{trainerCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[var(--color-text-dark)]/60">Admins</p>
          <p className="mt-2 text-3xl font-bold text-[#119da4]">{adminCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[var(--color-text-dark)]/60">Comptes désactivés</p>
          <p className="mt-2 text-3xl font-bold text-[#c2410c]">{inactiveCount}</p>
        </div>
      </div>

      <form className="grid gap-4 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
        <input type="hidden" name="view" value={currentView} />
        <input type="hidden" name="sort" value={currentSort} />
        <input type="hidden" name="sortDir" value={currentSortDir} />
        <FormField label="Recherche" htmlFor="filter-q">
          <Input id="filter-q" type="search" name="q" defaultValue={searchQuery} placeholder="Nom ou email" className="text-sm" />
        </FormField>

        <FormField label="Rôle" htmlFor="filter-role">
          <Select id="filter-role" name="role" defaultValue={selectedRole ?? ""} className="text-sm">
            <option value="">Tous les rôles</option>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Statut" htmlFor="filter-status">
          <Select id="filter-status" name="status" defaultValue={selectedStatus ?? ""} className="text-sm">
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Désactivés</option>
          </Select>
        </FormField>

        <div className="flex items-end gap-3">
          <button type="submit" className="primary-button h-11 px-4 text-sm font-semibold">
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
            href={buildUsersHref({ role: selectedRole, status: selectedStatus, q: searchQuery, view: "table", sort: currentSort, sortDir: currentSortDir })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              currentView === "table"
                ? "bg-[var(--color-primary-bright)] !text-white"
                : "bg-white text-[var(--color-text-dark)] ring-1 ring-[#0c0910]/10"
            }`}
          >
            Vue tableau
          </Link>
          <Link
            href={buildUsersHref({ role: selectedRole, status: selectedStatus, q: searchQuery, view: "cards", sort: currentSort, sortDir: currentSortDir })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              currentView === "cards"
                ? "bg-[var(--color-primary-bright)] !text-white"
                : "bg-white text-[var(--color-text-dark)] ring-1 ring-[#0c0910]/10"
            }`}
          >
            Vue cartes
          </Link>
        </div>

        <p className="text-sm text-[var(--color-text-dark)]/60">
          {totalUsersFiltered} utilisateur{totalUsersFiltered > 1 ? "s" : ""} trouvé
          {totalUsersFiltered > 1 ? "s" : ""}
        </p>
      </div>

      {currentView === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-text-dark)]/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-high)] text-sm">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <SortableHeader label="Utilisateur" field="name" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <SortableHeader label="Rôle" field="role" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
                  </th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-dark)]/70">Statut</th>
                  <th className="px-4 py-3 font-medium">
                    <SortableHeader label="XP" field="totalXp" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
                  </th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-dark)]/70">Activité</th>
                  <th className="px-4 py-3 font-medium">
                    <SortableHeader label="Inscrit le" field="createdAt" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
                  </th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-dark)]/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--color-text-dark)]/8 align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-[var(--color-text-dark)]">{user.name}</p>
                      <p className="text-xs text-[var(--color-text-dark)]/60">{user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateUserRoleAction.bind(null, user.id)} className="flex items-center gap-2">
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="h-10 rounded-lg border border-[var(--color-text-dark)]/10 bg-white px-3 text-sm text-[var(--color-text-dark)]"
                        >
                          {Object.values(UserRole).map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                        <SubmitButton
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-bright)] px-3 text-xs font-semibold !text-white transition hover:bg-[var(--color-primary-bright)]/90"
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
                          <p className="font-medium text-[var(--color-text-dark)]">{user.totalXp} XP</p>
                          <p className="text-xs text-[var(--color-text-dark)]/60">Niveau {user.level}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-dark)]/50">Non applicable</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--color-text-dark)]/60">
                      <p>{user._count.courses} cours</p>
                      <p>{user._count.enrollments} inscriptions</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--color-text-dark)]/60">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <form action={updateUserActiveStateAction.bind(null, user.id)}>
                        <input type="hidden" name="isActive" value={String(!user.isActive)} />
                        {user.isActive ? (
                          <ConfirmSubmitButton
                            triggerClassName="inline-flex h-10 items-center justify-center rounded-lg bg-[#c2410c] px-3 text-xs font-semibold text-white transition hover:bg-[#c2410c]/90"
                            triggerLabel="Désactiver"
                            title="Désactiver ce compte ?"
                            description="Le compte sera bloqué à la connexion. Tapez delete pour confirmer."
                            requireText="delete"
                            requireTextPlaceholder="delete"
                            confirmLabel="Désactiver le compte"
                            pendingLabel="Désactivation..."
                            confirmClassName="danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
                          />
                        ) : (
                          <SubmitButton
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#119da4] px-3 text-xs font-semibold text-white transition hover:bg-[#119da4]/90"
                            pendingLabel="Réactivation..."
                          >
                            Réactiver
                          </SubmitButton>
                        )}
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
              className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--color-primary-bright)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-bright)]">
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
                    <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">{user.name}</h3>
                    <p className="text-sm text-[var(--color-text-dark)]/70">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-dark)]/60">
                    <span>Créé le {formatDate(user.createdAt)}</span>
                    <span>{user._count.courses} cours</span>
                    <span>{user._count.enrollments} inscriptions</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:min-w-[420px]">
                  <form
                    action={updateUserRoleAction.bind(null, user.id)}
                    className="space-y-2 rounded-xl bg-[var(--color-surface-high)] p-4"
                  >
                    <label className="space-y-2 text-sm font-medium text-[var(--color-text-dark)]">
                      Changer le rôle
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="h-10 w-full rounded-lg border border-[var(--color-text-dark)]/10 bg-white px-3 text-sm text-[var(--color-text-dark)]"
                      >
                        {Object.values(UserRole).map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SubmitButton
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-bright)] px-3 py-2 text-sm font-semibold !text-white transition hover:bg-[var(--color-primary-bright)]/90"
                      pendingLabel="Enregistrement..."
                    >
                      Enregistrer le rôle
                    </SubmitButton>
                  </form>

                  <form
                    action={updateUserActiveStateAction.bind(null, user.id)}
                    className="space-y-2 rounded-xl bg-[var(--color-surface-high)] p-4"
                  >
                    <input type="hidden" name="isActive" value={String(!user.isActive)} />
                    <p className="text-sm font-medium text-[var(--color-text-dark)]">État du compte</p>
                    <p className="text-xs text-[var(--color-text-dark)]/60">
                      {user.isActive
                        ? "Bloquer les prochaines connexions de cet utilisateur."
                        : "Réautoriser l’accès à la plateforme."}
                    </p>
                    {user.isActive ? (
                      <ConfirmSubmitButton
                        triggerClassName="inline-flex items-center justify-center rounded-lg bg-[#c2410c] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c2410c]/90"
                        triggerLabel="Désactiver le compte"
                        title="Désactiver ce compte ?"
                        description="Le compte sera bloqué à la connexion. Tapez delete pour confirmer."
                        requireText="delete"
                        requireTextPlaceholder="delete"
                        confirmLabel="Désactiver le compte"
                        pendingLabel="Désactivation..."
                        confirmClassName="danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
                      />
                    ) : (
                      <SubmitButton
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#119da4] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#119da4]/90"
                        pendingLabel="Réactivation..."
                      >
                        Réactiver le compte
                      </SubmitButton>
                    )}
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-[var(--color-text-dark)]/60">
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
                sort: currentSort,
                sortDir: currentSortDir,
              })}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-bright)]/5"
            >
              ← Précédent
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-(--color-text-dark)/5 px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)]/40">
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
                sort: currentSort,
                sortDir: currentSortDir,
              })}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-bright)]/5"
            >
              Suivant →
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-(--color-text-dark)/5 px-4 py-2 text-sm font-semibold text-[var(--color-text-dark)]/40">
              Suivant →
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
