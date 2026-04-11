import Image from "next/image";
import { redirect } from "next/navigation";

import { getHomePathForRole } from "@/lib/auth-config";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

export default async function LeaderboardPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "LEARNER") {
    redirect(getHomePathForRole(session.user.role));
  }

  const users = await db.user.findMany({
    where: {
      role: "LEARNER",
    },
    orderBy: [{ totalXp: "desc" }, { createdAt: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      image: true,
      totalXp: true,
      level: true,
      streak: {
        select: {
          currentStreak: true,
        },
      },
      badges: {
        orderBy: { earnedAt: "desc" },
        take: 1,
        select: {
          badge: {
            select: {
              name: true,
              iconUrl: true,
            },
          },
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">Leaderboard</h1>
        <p className="text-sm text-[var(--color-text-dark)]/70">
          Classement général des apprenants selon leur XP total.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-text-dark)]/10 bg-white shadow-sm">
        <div className="grid grid-cols-[72px_minmax(0,1fr)_110px_90px] gap-3 border-b border-[var(--color-text-dark)]/10 bg-[var(--color-surface-high)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-dark)]/60">
          <span>Rang</span>
          <span>Utilisateur</span>
          <span>XP</span>
          <span>Niveau</span>
        </div>

        <div className="divide-y divide-[#0c0910]/8">
          {users.map((user, index) => (
            <article
              key={user.id}
              className={`grid grid-cols-[72px_minmax(0,1fr)_110px_90px] gap-3 px-4 py-4 ${
                index < 3 ? "bg-[#fffaf0]" : "bg-white"
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${
                    index === 0
                      ? "bg-[#ffc857] text-[var(--color-text-dark)]"
                      : index === 1
                        ? "bg-[#d9dde8] text-[var(--color-text-dark)]"
                        : index === 2
                          ? "bg-[#d4a373] text-white"
                          : "bg-[var(--color-primary-bright)]/10 text-[var(--color-primary-bright)]"
                  }`}
                >
                  #{index + 1}
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                {user.image ? (
                  <Image src={user.image} alt={user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary-bright)] text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text-dark)]">{user.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-dark)]/60">
                    <span>Streak : {user.streak?.currentStreak ?? 0}</span>
                    {user.badges[0] ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#453750]/10 px-2 py-0.5 text-[#453750]">
                        <Image
                          src={user.badges[0].badge.iconUrl}
                          alt={user.badges[0].badge.name}
                          width={14}
                          height={14}
                          className="h-3.5 w-3.5"
                        />
                        {user.badges[0].badge.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center font-semibold text-[#453750]">{user.totalXp} XP</div>
              <div className="flex items-center font-semibold text-[var(--color-primary-bright)]">Niv. {user.level}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
