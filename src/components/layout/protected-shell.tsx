import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PlatformBottomNav } from "@/components/layout/platform-bottom-nav";
import type { NavItem } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionReminderSync } from "@/components/notifications/session-reminder-sync";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

type ProtectedShellProps = {
  children: React.ReactNode;
  navTitle: string;
  headerTitle: string;
  navItems: NavItem[];
  workspace: "platform" | "trainer" | "admin";
};

export async function ProtectedShell({
  children,
  navTitle,
  headerTitle,
  navItems,
  workspace,
}: ProtectedShellProps) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.isActive === false) {
    redirect("/login");
  }

  const showGamification = session.user.role === "LEARNER";
  const showLearnerBottomNav = workspace === "platform" && session.user.role === "LEARNER";
  /** Recherche dans le header apprenant : désactivée tant qu’il n’y a pas de requête métier (catalogue / cours accessibles). Réactiver quand implémenté — voir PHASE.md. */
  const showGlobalSearch = false;
  const [userGamification, notifications, unreadNotificationCount] = await Promise.all([
    showGamification
      ? db.user.findUnique({
          where: { id: session.user.id },
          select: {
            totalXp: true,
            level: true,
            streak: {
              select: {
                currentStreak: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        relatedUrl: true,
        isRead: true,
        createdAt: true,
      },
    }),
    db.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    }),
  ]);

  if (showGamification && !userGamification) {
    redirect("/login");
  }

  const shellNotificationLinks =
    workspace === "platform"
      ? { notificationsListHref: "/notifications", calendarHref: "/calendar" }
      : workspace === "trainer"
        ? { notificationsListHref: "/trainer/notifications", calendarHref: "/trainer/calendar" }
        : { notificationsListHref: "/admin/notifications", calendarHref: "/admin/calendar" };

  return (
    <div className="app-shell-bg flex min-h-screen">
      <Sidebar
        title={navTitle}
        items={navItems}
        workspace={workspace}
        userName={session.user.name ?? "Utilisateur Akaa"}
        userEmail={session.user.email}
        userImage={session.user.image}
        userRole={session.user.role}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <SessionReminderSync enabled={session.user.role === "LEARNER"} />
        <div className="relative">
          <Header
            title={headerTitle}
            totalXp={userGamification?.totalXp ?? 0}
            level={userGamification?.level ?? 1}
            currentStreak={userGamification?.streak?.currentStreak ?? 0}
            showGamification={showGamification}
            showGlobalSearch={showGlobalSearch}
            userImage={session.user.image}
            userName={session.user.name ?? undefined}
            notifications={notifications.map((notification) => ({
              ...notification,
              createdAt: notification.createdAt.toISOString(),
            }))}
            unreadNotificationCount={unreadNotificationCount}
            notificationsListHref={shellNotificationLinks.notificationsListHref}
            calendarHref={shellNotificationLinks.calendarHref}
          />
          <div className="absolute left-4 top-4 z-30 lg:hidden">
            <MobileNav
              title={navTitle}
              items={navItems}
              workspace={workspace}
              userName={session.user.name ?? "Utilisateur Akaa"}
              userEmail={session.user.email}
              userImage={session.user.image}
              userRole={session.user.role}
            />
          </div>
        </div>
        <main
          className={
            showLearnerBottomNav
              ? "flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-5 md:pb-8"
              : "flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5"
          }
        >
          {children}
        </main>
        {showLearnerBottomNav ? <PlatformBottomNav /> : null}
      </div>
    </div>
  );
}
