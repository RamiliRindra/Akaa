import { FeedbackKind, UserRole } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Rating } from "@/components/feedback/star-rating";
import { getCachedSession } from "@/lib/auth-session";
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

export default async function AdminFeedbackSynthesisPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [
    totalCount,
    byKind,
    learnerCourseGroups,
    trainerAuthoringGroups,
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
    db.feedback.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
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

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#0c0910]">Synthèse des avis</h2>
          <p className="text-sm text-[#0c0910]/70">
            Agrégations anonymisées par type et par cours, puis derniers enregistrements. Pour laisser votre propre avis
            formateur, utilisez aussi la page{" "}
            <Link href="/feedback" className="font-medium text-[#0F63FF] hover:underline">
              Avis
            </Link>
            .
          </p>
        </div>
        <div className="rounded-xl border border-[#0c0910]/10 bg-white px-4 py-3 text-sm shadow-sm">
          <p className="text-[#0c0910]/60">Total enregistrements</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#453750]">{totalCount}</p>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f8fafc] px-6 py-12 text-center">
          <p className="font-medium text-[#0c0910]">Aucun avis pour le moment</p>
          <p className="mt-2 text-sm text-[#0c0910]/65">
            Les notes et commentaires apparaîtront ici lorsque les apprenants et formateurs commenceront à répondre.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#0c0910]">Vue par type</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(Object.keys(kindLabels) as FeedbackKind[]).map((kind) => {
                const row = byKindMap[kind];
                const count = row?.count ?? 0;
                const avg = row?.avg ?? null;
                const avgStr = formatAvg(avg);

                return (
                  <div
                    key={kind}
                    className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-medium text-[#0c0910]/70">{kindLabels[kind]}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-[#0F63FF]">{count}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#0c0910]/55">Moyenne</span>
                      {count > 0 && avgStr !== null ? (
                        <Rating rating={avg ?? 0} maxRating={5} showValue size="sm" label={`Moyenne ${kindLabels[kind]}`} />
                      ) : (
                        <span className="text-sm text-[#0c0910]/45">—</span>
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
                <h3 className="text-lg font-semibold text-[#0c0910]">Apprenants — par cours</h3>
                <p className="text-sm text-[#0c0910]/60">Moyenne et nombre d’avis par cours publié.</p>
              </div>
              {learnerCourseSorted.length === 0 ? (
                <p className="rounded-xl border border-[#0c0910]/10 bg-white px-4 py-6 text-sm text-[#0c0910]/60">
                  Aucun avis cours enregistré.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#0c0910]/10 bg-[#f8fafc] text-[#0c0910]/70">
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
                          <tr key={cid} className="border-b border-[#0c0910]/06 last:border-0">
                            <td className="px-4 py-3 font-medium text-[#0c0910]">
                              {c?.title ?? "Cours supprimé ou inconnu"}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-[#0c0910]/80">{row._count}</td>
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
                                  className="text-xs font-medium text-[#0F63FF] hover:underline"
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
                <h3 className="text-lg font-semibold text-[#0c0910]">Formateurs — création par cours</h3>
                <p className="text-sm text-[#0c0910]/60">Retours sur l’expérience d’édition pour chaque cours ciblé.</p>
              </div>
              {trainerAuthoringSorted.length === 0 ? (
                <p className="rounded-xl border border-[#0c0910]/10 bg-white px-4 py-6 text-sm text-[#0c0910]/60">
                  Aucun avis « création de cours » enregistré.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#0c0910]/10 bg-[#f8fafc] text-[#0c0910]/70">
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
                          <tr key={`t-${cid}`} className="border-b border-[#0c0910]/06 last:border-0">
                            <td className="px-4 py-3 font-medium text-[#0c0910]">
                              {c?.title ?? "Cours supprimé ou inconnu"}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-[#0c0910]/80">{row._count}</td>
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
                                  className="text-xs font-medium text-[#0F63FF] hover:underline"
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

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-[#0c0910]">Derniers enregistrements</h3>
                <p className="text-sm text-[#0c0910]/60">
                  Les {recentFeedbacks.length} derniers avis mis à jour ({commentsWithText} avec commentaire).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#0c0910]/10 bg-[#f8fafc] text-[#0c0910]/70">
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
                    <tr key={f.id} className="border-b border-[#0c0910]/06 last:border-0 align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-[#0c0910]/75">{formatDate(f.updatedAt)}</td>
                      <td className="px-4 py-3 text-[#0c0910]/85">{kindLabels[f.kind]}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0c0910]">{f.user.name}</p>
                        <p className="text-xs text-[#0c0910]/55">{f.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Rating rating={f.rating} maxRating={5} showValue size="sm" label={`Note ${kindLabels[f.kind]}`} />
                      </td>
                      <td className="px-4 py-3 text-[#0c0910]/80">
                        {f.course ? (
                          <Link href={`/admin/courses/${f.course.id}`} className="text-[#0F63FF] hover:underline">
                            {f.course.title}
                          </Link>
                        ) : (
                          <span className="text-[#0c0910]/45">—</span>
                        )}
                      </td>
                      <td className="max-w-[280px] px-4 py-3 text-[#0c0910]/75">
                        {f.comment?.trim() ? (
                          <span className="line-clamp-3 whitespace-pre-wrap">{f.comment.trim()}</span>
                        ) : (
                          <span className="text-[#0c0910]/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
