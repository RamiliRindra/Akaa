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
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
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
  sort,
  sortDir,
}: {
  role?: string;
  status?: string;
  q?: string;
  page?: number;
  sort?: string;
  sortDir?: string;
}) {
  const params = new URLSearchParams();

  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
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
      className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors hover:text-[var(--foreground)] ${
        isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
      }`}
    >
      {label}
      <Icon className="h-3 w-3 shrink-0" />
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
    buildUsersHref({ role: selectedRole, status: selectedStatus, q: searchQuery, sort, sortDir });

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

  // Shared menu item classes — flat, minimal, used inside the dropdown for each row.
  const menuItemClass =
    "flex w-full items-center px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50";
  const menuDangerItemClass =
    "flex w-full items-center px-3 py-2 text-left text-sm text-[var(--destructive)] transition hover:bg-[var(--destructive)]/8";

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Gestion des utilisateurs</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Gérez les rôles, recherchez rapidement un compte et bloquez l’accès si nécessaire.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Apprenants</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{learnerCount}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Formateurs</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{trainerCount}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Admins</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{adminCount}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)]">Désactivés</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{inactiveCount}</p>
        </div>
      </div>

      <form className="grid gap-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
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

        <div className="flex items-end gap-2">
          <button type="submit" className="primary-button h-10 px-4 text-sm font-medium">
            Filtrer
          </button>
          <Link
            href={buildUsersHref({})}
            className="secondary-button h-10 px-4 text-sm font-medium"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-end">
        <p className="text-sm text-[var(--muted-foreground)]">
          {totalUsersFiltered} utilisateur{totalUsersFiltered > 1 ? "s" : ""} trouvé
          {totalUsersFiltered > 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left">
                <SortableHeader label="Utilisateur" field="name" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader label="Rôle" field="role" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Statut</th>
              <th className="px-4 py-3 text-left">
                <SortableHeader label="XP" field="totalXp" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Activité</th>
              <th className="px-4 py-3 text-left">
                <SortableHeader label="Inscrit le" field="createdAt" currentSort={currentSort} currentSortDir={currentSortDir} href={sortHref} />
              </th>
              <th className="w-[60px] px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
                  Aucun utilisateur ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--muted)]/40">
                  <td className="px-4 py-3 align-middle">
                    <p className="font-medium text-[var(--foreground)]">{user.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 align-middle text-[var(--foreground)]">{roleLabels[user.role]}</td>
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        user.isActive ? "text-[#0a7d5a]" : "text-[var(--destructive)]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.isActive ? "bg-[#0a7d5a]" : "bg-[var(--destructive)]"
                        }`}
                      />
                      {user.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-[var(--foreground)]">
                    {user.role === UserRole.LEARNER ? (
                      <>
                        <p>{user.totalXp} XP</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Niveau {user.level}</p>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-[var(--muted-foreground)]">
                    <p>{user._count.courses} cours</p>
                    <p>{user._count.enrollments} inscriptions</p>
                  </td>
                  <td className="px-4 py-3 align-middle text-xs text-[var(--muted-foreground)]">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <RowActionsMenu ariaLabel={`Actions pour ${user.name}`}>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                        Changer le rôle
                      </p>
                      {Object.values(UserRole)
                        .filter((role) => role !== user.role)
                        .map((role) => (
                          <form key={role} action={updateUserRoleAction.bind(null, user.id)}>
                            <input type="hidden" name="role" value={role} />
                            <button type="submit" className={menuItemClass}>
                              Définir comme {roleLabels[role]}
                            </button>
                          </form>
                        ))}

                      <div className="my-1 border-t border-[var(--border)]" />

                      {user.isActive ? (
                        <form action={updateUserActiveStateAction.bind(null, user.id)}>
                          <input type="hidden" name="isActive" value="false" />
                          <ConfirmSubmitButton
                            triggerClassName={menuDangerItemClass}
                            triggerLabel="Désactiver le compte"
                            title="Désactiver ce compte ?"
                            description={`Le compte de ${user.name} sera bloqué à la connexion. Tapez delete pour confirmer.`}
                            requireText="delete"
                            requireTextPlaceholder="delete"
                            confirmLabel="Désactiver le compte"
                            pendingLabel="Désactivation..."
                            confirmClassName="danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
                          />
                        </form>
                      ) : (
                        <form action={updateUserActiveStateAction.bind(null, user.id)}>
                          <input type="hidden" name="isActive" value="true" />
                          <SubmitButton className={menuItemClass} pendingLabel="Réactivation...">
                            Réactiver le compte
                          </SubmitButton>
                        </form>
                      )}
                    </RowActionsMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          Page {currentPage} sur {totalPages}
        </p>
        <div className="flex gap-2">
          {previousPage ? (
            <Link
              href={buildUsersHref({
                role: selectedRole,
                status: selectedStatus,
                q: searchQuery,
                page: previousPage,
                sort: currentSort,
                sortDir: currentSortDir,
              })}
              className="secondary-button h-9 px-3 text-sm font-medium"
            >
              ← Précédent
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--muted-foreground)]/50">
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
                sort: currentSort,
                sortDir: currentSortDir,
              })}
              className="secondary-button h-9 px-3 text-sm font-medium"
            >
              Suivant →
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--muted-foreground)]/50">
              Suivant →
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
