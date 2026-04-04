import { redirect } from "next/navigation";

import { BadgeCard } from "@/components/gamification/badge-card";
import { getHomePathForRole } from "@/lib/auth-config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultBadges } from "@/lib/gamification";
import { formatDate } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "LEARNER") {
    redirect(getHomePathForRole(session.user.role));
  }

  await ensureDefaultBadges(db);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      totalXp: true,
      level: true,
      streak: {
        select: {
          currentStreak: true,
          longestStreak: true,
        },
      },
      badges: {
        orderBy: { earnedAt: "desc" },
        select: {
          earnedAt: true,
          badge: {
            select: {
              id: true,
              name: true,
              description: true,
              iconUrl: true,
            },
          },
        },
      },
      xpTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#0c0910]">Mon profil</h1>
          <p className="text-sm text-[#0c0910]/70">
            Consultez votre niveau, vos badges et vos derniers gains d’expérience.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-[#f7f9ff] p-4">
            <p className="text-sm text-[#0c0910]/60">Nom</p>
            <p className="mt-2 font-semibold text-[#0c0910]">{user.name}</p>
            <p className="text-sm text-[#0c0910]/60">{user.email}</p>
          </article>
          <article className="rounded-2xl bg-[#f7f9ff] p-4">
            <p className="text-sm text-[#0c0910]/60">Niveau</p>
            <p className="mt-2 text-3xl font-bold text-[#0F63FF]">{user.level}</p>
          </article>
          <article className="rounded-2xl bg-[#f7f9ff] p-4">
            <p className="text-sm text-[#0c0910]/60">XP total</p>
            <p className="mt-2 text-3xl font-bold text-[#453750]">{user.totalXp}</p>
          </article>
          <article className="rounded-2xl bg-[#f7f9ff] p-4">
            <p className="text-sm text-[#0c0910]/60">Streak</p>
            <p className="mt-2 text-3xl font-bold text-[#ffc857]">{user.streak?.currentStreak ?? 0}</p>
            <p className="text-sm text-[#0c0910]/60">Record : {user.streak?.longestStreak ?? 0}</p>
          </article>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#0c0910]">Mes badges</h2>
            <p className="text-sm text-[#0c0910]/65">
              Les badges automatiques sont attribués par le moteur de gamification. Les badges manuels seront gérés par l’admin plus tard.
            </p>
          </div>

          {user.badges.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {user.badges.map((entry) => (
                <BadgeCard
                  key={`${entry.badge.id}-${entry.earnedAt.toISOString()}`}
                  name={entry.badge.name}
                  description={entry.badge.description}
                  iconUrl={entry.badge.iconUrl}
                  earnedAt={formatDate(entry.earnedAt)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-semibold text-[#0c0910]">Aucun badge pour le moment</h3>
              <p className="mt-2 text-sm text-[#0c0910]/70">
                Continuez vos cours et réussissez vos quiz pour débloquer vos premières récompenses.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#0c0910]">Historique XP</h2>
            <p className="text-sm text-[#0c0910]/65">
              Vos 10 derniers gains d’expérience.
            </p>
          </div>

          {user.xpTransactions.length ? (
            <div className="space-y-2">
              {user.xpTransactions.map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-[#0c0910]/10 bg-[#f7f9ff] px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[#0c0910]">{transaction.description ?? "Gain d’XP"}</p>
                    <span className="font-semibold text-[#453750]">
                      {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount} XP
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#0c0910]/55">{formatDate(transaction.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] px-4 py-5 text-sm text-[#0c0910]/65">
              Aucun mouvement XP enregistré pour le moment.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
