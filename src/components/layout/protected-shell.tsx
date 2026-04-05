import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { NavItem } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
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

  return (
    <div className="app-shell-bg flex min-h-screen">
      <Sidebar
        title={navTitle}
        items={navItems}
        workspace={workspace}
        userName={session.user.name ?? "Utilisateur Akaa"}
        userEmail={session.user.email}
        userRole={session.user.role}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="relative">
          <Header
            title={headerTitle}
          totalXp={userGamification?.totalXp ?? 0}
          level={userGamification?.level ?? 1}
          currentStreak={userGamification?.streak?.currentStreak ?? 0}
          showGamification={showGamification}
          notifications={notifications.map((notification) => ({
            ...notification,
            createdAt: notification.createdAt.toISOString(),
          }))}
          unreadNotificationCount={unreadNotificationCount}
        />
          <div className="absolute left-4 top-4 z-30 lg:hidden">
            <MobileNav
              title={navTitle}
              items={navItems}
              workspace={workspace}
              userName={session.user.name ?? "Utilisateur Akaa"}
              userEmail={session.user.email}
              userRole={session.user.role}
            />
          </div>
        </div>
        <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5">{children}</main>
      </div>
    </div>
  );
}
