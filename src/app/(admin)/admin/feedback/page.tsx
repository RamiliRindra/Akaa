import { FeedbackKind, UserRole } from "@prisma/client";
import { Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Rating } from "@/components/feedback/star-rating";
import { getCachedSession } from "@/lib/auth-session";
import {
  buildFeedbackWhere,
  feedbackAdminFiltersToSearchParams,
  hasActiveFeedbackFilters,
  parseFeedbackAdminSearchParams,
} from "@/lib/feedback-admin-filters";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const kindLabels: Record<FeedbackKind, string> = {
  LEARNER_COURSE: "Avis apprenants (cours)",
  LEARNER_PLATFORM: "Plateforme (apprenants)",
  TRAINER_AUTHORING: "Création de cours (formateurs)",
  TRAINER_PLATFORM: "Outil formateur",
};

function formatAvg(avg: number | null | undefined) {
  if (avg === null || avg === undefined || Number.isNaN(avg)) {
    return null;
  }
  return Number(avg.toFixed(1)).toString();
}

function toInputDateValue(d: Date | null): string {
  if (!d) {
    return "";
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

type AdminFeedbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFeedbackSynthesisPage({ searchParams }: AdminFeedbackPageProps) {
  const [session, rawParams] = await Promise.all([getCachedSession(), searchParams]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const filters = parseFeedbackAdminSearchParams(rawParams);
  const detailWhere = buildFeedbackWhere(filters);
  const filtersActive = hasActiveFeedbackFilters(filters);
  const takeLimit = filtersActive ? 200 : 40;

  const [
    totalCount,
    byKind,
    learnerCourseGroups,
    trainerAuthoringGroups,
    filteredCount,
    recentFeedbacks,
  ] = await Promise.all([
    db.feedback.count(),
    db.feedback.groupBy({
      by: ["kind"],
      _count: true,
      _avg: { rating: true },
    }),
    db.feedback.groupBy({
      by: ["courseId"],
      where: { kind: FeedbackKind.LEARNER_COURSE, courseId: { not: null } },
      _count: true,
      _avg: { rating: true },
    }),
    db.feedback.groupBy({
      by: ["courseId"],
      where: { kind: FeedbackKind.TRAINER_AUTHORING, courseId: { not: null } },
      _count: true,
      _avg: { rating: true },
    }),
    db.feedback.count({ where: detailWhere }),
    db.feedback.findMany({
      where: detailWhere,
      orderBy: { updatedAt: "desc" },
      take: takeLimit,
      select: {
        id: true,
        kind: true,
        rating: true,
        comment: true,
        updatedAt: true,
        user: {
          select: { name: true, email: true },
        },
        course: {
          select: { id: true, title: true, slug: true },
        },
      },
    }),
  ]);

  const courseIds = [
    ...new Set(
      [...learnerCourseGroups, ...trainerAuthoringGroups]
        .map((row) => row.courseId)
        .filter((id): id is string => id !== null),
    ),
  ];

  const courses =
    courseIds.length > 0
      ? await db.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, slug: true },
        })
      : [];

  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));

  const byKindMap = Object.fromEntries(
    byKind.map((row) => [row.kind, { count: row._count, avg: row._avg.rating }]),
  ) as Record<FeedbackKind, { count: number; avg: number | null }>;

  const sortByCountDesc = <T extends { _count: number }>(rows: T[]) =>
    [...rows].sort((a, b) => b._count - a._count);

  const learnerCourseSorted = sortByCountDesc(learnerCourseGroups);
  const trainerAuthoringSorted = sortByCountDesc(trainerAuthoringGroups);

  const commentsWithText = recentFeedbacks.filter((f) => f.comment && f.comment.trim().length > 0).length;

  const exportQuery = feedbackAdminFiltersToSearchParams(filters);
  const exportHref = exportQuery
    ? `/api/admin/feedback/export?${exportQuery}`
    : "/api/admin/feedback/export";

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[var(--color-text-dark)]">Synthèse des avis</h2>
          <p className="text-sm text-[var(--color-text-dark)]/70">
            Agrégations globales par type et par cours, puis détail filtrable et export CSV. Pour laisser votre propre
            avis formateur, utilisez aussi la page{" "}
            <Link href="/feedback" className="font-medium text-[var(--color-primary-bright)] hover:underline">
              Avis
            </Link>
            .
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-3 text-sm shadow-sm">
          <p className="text-[var(--color-text-dark)]/60">Total enregistrements (global)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#453750]">{totalCount}</p>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-text-dark)]/20 bg-[#f8fafc] px-6 py-12 text-center">
          <p className="font-medium text-[var(--color-text-dark)]">Aucun avis pour le moment</p>
          <p className="mt-2 text-sm text-[var(--color-text-dark)]/65">
            Les notes et commentaires apparaîtront ici lorsque les apprenants et formateurs commenceront à répondre.
          </p>
        </div>
      ) : (
        <>
          {filtersActive ? (
            <p className="rounded-xl border border-[#119da4]/25 bg-[#119da4]/8 px-4 py-3 text-sm text-[var(--color-text-dark)]/85">
              Filtres actifs : les cartes « vue par type » et les tableaux par cours ci-dessous restent{" "}
              <strong>globaux</strong>. Le tableau détaillé et l’export CSV utilisent les filtres.
            </p>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Vue par type</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(Object.keys(kindLabels) as FeedbackKind[]).map((kind) => {
                const row = byKindMap[kind];
                const count = row?.count ?? 0;
                const avg = row?.avg ?? null;
                const avgStr = formatAvg(avg);

                return (
                  <div
                    key={kind}
                    className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-medium text-[var(--color-text-dark)]/70">{kindLabels[kind]}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-primary-bright)]">{count}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--color-text-dark)]/55">Moyenne</span>
                      {count > 0 && avgStr !== null ? (
                        <Rating rating={avg ?? 0} maxRating={5} showValue size="sm" label={`Moyenne ${kindLabels[kind]}`} />
                      ) : (
                        <span className="text-sm text-[var(--color-text-dark)]/45">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-2">
            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Apprenants — par cours</h3>
                <p className="text-sm text-[var(--color-text-dark)]/60">Moyenne et nombre d’avis par cours publié.</p>
              </div>
              {learnerCourseSorted.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-6 text-sm text-[var(--color-text-dark)]/60">
                  Aucun avis cours enregistré.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--color-text-dark)]/10 bg-white shadow-sm">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-text-dark)]/10 bg-[#f8fafc] text-[var(--color-text-dark)]/70">
                        <th className="px-4 py-3 font-semibold">Cours</th>
                        <th className="px-4 py-3 font-semibold">Avis</th>
                        <th className="px-4 py-3 font-semibold">Moy.</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {learnerCourseSorted.map((row) => {
                        const cid = row.courseId as string;
                        const c = courseById[cid];
                        const avgStr = formatAvg(row._avg.rating);

                        return (
                          <tr key={cid} className="border-b border-[var(--color-text-dark)]/06 last:border-0">
                            <td className="px-4 py-3 font-medium text-[var(--color-text-dark)]">
                              {c?.title ?? "Cours supprimé ou inconnu"}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-[var(--color-text-dark)]/80">{row._count}</td>
                            <td className="px-4 py-3">
                              {avgStr !== null ? (
                                <Rating
                                  rating={row._avg.rating ?? 0}
                                  maxRating={5}
                                  showValue
                                  size="sm"
                                  label={`Moyenne apprenants ${c?.title ?? ""}`}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c ? (
                                <Link
                                  href={`/admin/courses/${c.id}`}
                                  className="text-xs font-medium text-[var(--color-primary-bright)] hover:underline"
                                >
                                  Fiche cours
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Formateurs — création par cours</h3>
                <p className="text-sm text-[var(--color-text-dark)]/60">Retours sur l’expérience d’édition pour chaque cours ciblé.</p>
              </div>
              {trainerAuthoringSorted.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-4 py-6 text-sm text-[var(--color-text-dark)]/60">
                  Aucun avis « création de cours » enregistré.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--color-text-dark)]/10 bg-white shadow-sm">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-text-dark)]/10 bg-[#f8fafc] text-[var(--color-text-dark)]/70">
                        <th className="px-4 py-3 font-semibold">Cours</th>
                        <th className="px-4 py-3 font-semibold">Avis</th>
                        <th className="px-4 py-3 font-semibold">Moy.</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {trainerAuthoringSorted.map((row) => {
                        const cid = row.courseId as string;
                        const c = courseById[cid];
                        const avgStr = formatAvg(row._avg.rating);

                        return (
                          <tr key={`t-${cid}`} className="border-b border-[var(--color-text-dark)]/06 last:border-0">
                            <td className="px-4 py-3 font-medium text-[var(--color-text-dark)]">
                              {c?.title ?? "Cours supprimé ou inconnu"}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-[var(--color-text-dark)]/80">{row._count}</td>
                            <td className="px-4 py-3">
                              {avgStr !== null ? (
                                <Rating
                                  rating={row._avg.rating ?? 0}
                                  maxRating={5}
                                  showValue
                                  size="sm"
                                  label={`Moyenne formateurs ${c?.title ?? ""}`}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c ? (
                                <Link
                                  href={`/admin/courses/${c.id}`}
                                  className="text-xs font-medium text-[var(--color-primary-bright)] hover:underline"
                                >
                                  Fiche cours
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-[var(--color-text-dark)]">Filtres (détail + export)</h3>
              <p className="mt-1 text-xs text-[var(--color-text-dark)]/60">
                Période basée sur la date de <strong>mise à jour</strong> de l’avis (UTC).
              </p>
              <form method="get" action="/admin/feedback" className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                <label className="flex min-w-[200px] flex-col gap-1.5 text-sm font-medium text-[var(--color-text-dark)]">
                  Type
                  <select
                    name="kind"
                    defaultValue={filters.kind ?? ""}
                    className="rounded-xl border border-[var(--color-text-dark)]/12 bg-[#f8fafc] px-3 py-2 text-sm text-[var(--color-text-dark)]"
                  >
                    <option value="">Tous les types</option>
                    {(Object.keys(kindLabels) as FeedbackKind[]).map((k) => (
                      <option key={k} value={k}>
                        {kindLabels[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-[160px] flex-col gap-1.5 text-sm font-medium text-[var(--color-text-dark)]">
                  Du
                  <input
                    type="date"
                    name="from"
                    defaultValue={toInputDateValue(filters.updatedFrom)}
                    className="rounded-xl border border-[var(--color-text-dark)]/12 bg-[#f8fafc] px-3 py-2 text-sm text-[var(--color-text-dark)]"
                  />
                </label>
                <label className="flex min-w-[160px] flex-col gap-1.5 text-sm font-medium text-[var(--color-text-dark)]">
                  Au
                  <input
                    type="date"
                    name="to"
                    defaultValue={toInputDateValue(filters.updatedTo)}
                    className="rounded-xl border border-[var(--color-text-dark)]/12 bg-[#f8fafc] px-3 py-2 text-sm text-[var(--color-text-dark)]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--color-primary-bright)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B52D6]"
                  >
                    Appliquer
                  </button>
                  <Link
                    href="/admin/feedback"
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text-dark)] transition hover:bg-[#f8fafc]"
                  >
                    Réinitialiser
                  </Link>
                  <a
                    href={exportHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#453750]/25 bg-[#453750]/06 px-4 py-2.5 text-sm font-semibold text-[#453750] transition hover:bg-[#453750]/12"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    Télécharger CSV
                  </a>
                </div>
              </form>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Enregistrements détaillés</h3>
                <p className="text-sm text-[var(--color-text-dark)]/60">
                  {filteredCount} résultat{filteredCount > 1 ? "s" : ""} correspondant aux filtres
                  {filtersActive ? "" : ` (affichage des ${recentFeedbacks.length} plus récents)`}
                  {commentsWithText > 0
                    ? ` — ${commentsWithText} avec commentaire dans cette liste.`
                    : "."}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--color-text-dark)]/10 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-text-dark)]/10 bg-[#f8fafc] text-[var(--color-text-dark)]/70">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Utilisateur</th>
                    <th className="px-4 py-3 font-semibold">Note</th>
                    <th className="px-4 py-3 font-semibold">Cours</th>
                    <th className="px-4 py-3 font-semibold">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFeedbacks.map((f) => (
                    <tr key={f.id} className="border-b border-[var(--color-text-dark)]/06 last:border-0 align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-dark)]/75">{formatDate(f.updatedAt)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-dark)]/85">{kindLabels[f.kind]}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--color-text-dark)]">{f.user.name}</p>
                        <p className="text-xs text-[var(--color-text-dark)]/55">{f.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Rating rating={f.rating} maxRating={5} showValue size="sm" label={`Note ${kindLabels[f.kind]}`} />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-dark)]/80">
                        {f.course ? (
                          <Link href={`/admin/courses/${f.course.id}`} className="text-[var(--color-primary-bright)] hover:underline">
                            {f.course.title}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-text-dark)]/45">—</span>
                        )}
                      </td>
                      <td className="max-w-[280px] px-4 py-3 text-[var(--color-text-dark)]/75">
                        {f.comment?.trim() ? (
                          <span className="line-clamp-3 whitespace-pre-wrap">{f.comment.trim()}</span>
                        ) : (
                          <span className="text-[var(--color-text-dark)]/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCount > takeLimit ? (
              <p className="text-xs text-[var(--color-text-dark)]/55">
                Affichage limité à {takeLimit} lignes. L’export CSV inclut jusqu’à 5000 lignes avec les mêmes filtres.
              </p>
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}
