import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [
    totalUsers,
    activeUsers,
    totalCourses,
    publishedCourses,
    totalCategories,
    activeCategories,
    totalBadges,
    activeBadges,
    xpDistributed,
    recentUsers,
    topLearners,
    recentAdminAdjustments,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.course.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.category.count(),
    db.category.count({ where: { isActive: true } }),
    db.badge.count(),
    db.badge.count({ where: { isActive: true } }),
    db.xpTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        amount: { gt: 0 },
      },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    db.user.findMany({
      where: {
        role: UserRole.LEARNER,
        isActive: true,
      },
      orderBy: [{ totalXp: "desc" }, { createdAt: "asc" }],
      take: 5,
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
      orderBy: { createdAt: "desc" },
      take: 5,
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

  const statCards = [
    {
      label: "Utilisateurs actifs",
      value: `${activeUsers} / ${totalUsers}`,
      accent: "text-[#0F63FF]",
      href: "/admin/users",
    },
    {
      label: "Cours publiés",
      value: `${publishedCourses} / ${totalCourses}`,
      accent: "text-[#119da4]",
      href: "/admin/courses",
    },
    {
      label: "Catégories actives",
      value: `${activeCategories} / ${totalCategories}`,
      accent: "text-[#453750]",
      href: "/admin/categories",
    },
    {
      label: "Badges actifs",
      value: `${activeBadges} / ${totalBadges}`,
      accent: "text-[#ffc857]",
      href: "/admin/badges",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">Dashboard admin</h2>
        <p className="text-sm text-[#0c0910]/70">
          Vue globale de l’exploitation : utilisateurs, catalogue, gamification et opérations récentes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
          >
            <p className="text-sm text-[#0c0910]/60">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.accent}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0c0910]">Top apprenants</h3>
                <p className="text-sm text-[#0c0910]/60">Classement interne actuel par XP total.</p>
              </div>
              <Link href="/leaderboard" className="text-sm font-medium text-[#0F63FF] hover:underline">
                Voir le leaderboard
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {topLearners.map((learner, index) => (
                <div
                  key={learner.id}
                  className="flex items-center justify-between rounded-xl bg-[#f7f9ff] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[#0c0910]">
                      #{index + 1} {learner.name}
                    </p>
                    <p className="text-sm text-[#0c0910]/60">{learner.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#0F63FF]">{learner.totalXp} XP</p>
                    <p className="text-sm text-[#0c0910]/60">Niveau {learner.level}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0c0910]">Derniers utilisateurs</h3>
                <p className="text-sm text-[#0c0910]/60">Nouveaux comptes et statut d’activation.</p>
              </div>
              <Link href="/admin/users" className="text-sm font-medium text-[#0F63FF] hover:underline">
                Gérer les comptes
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-xl bg-[#f7f9ff] px-4 py-3">
                  <div>
                    <p className="font-medium text-[#0c0910]">{user.name}</p>
                    <p className="text-sm text-[#0c0910]/60">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#0c0910]">{user.role}</p>
                    <p className="text-xs text-[#0c0910]/60">
                      {user.isActive ? "Actif" : "Désactivé"} • {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0c0910]">XP distribués</h3>
            <p className="mt-1 text-sm text-[#0c0910]/60">
              Somme des transactions positives enregistrées sur la plateforme.
            </p>
            <p className="mt-4 text-4xl font-bold text-[#ffc857]">{xpDistributed._sum.amount ?? 0} XP</p>
          </section>

          <section className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0c0910]">Derniers ajustements admin</h3>
                <p className="text-sm text-[#0c0910]/60">Transactions XP manuelles les plus récentes.</p>
              </div>
              <Link href="/admin/xp" className="text-sm font-medium text-[#0F63FF] hover:underline">
                Ajuster l’XP
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentAdminAdjustments.length ? (
                recentAdminAdjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="rounded-xl bg-[#f7f9ff] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#0c0910]">{adjustment.user.name}</p>
                      <p
                        className={`text-sm font-semibold ${
                          adjustment.amount >= 0 ? "text-[#119da4]" : "text-[#c2410c]"
                        }`}
                      >
                        {adjustment.amount >= 0 ? "+" : ""}
                        {adjustment.amount} XP
                      </p>
                    </div>
                    <p className="text-sm text-[#0c0910]/60">{adjustment.user.email}</p>
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
          </section>
        </div>
      </div>
    </section>
  );
}
