import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { NavItem } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ProtectedShellProps = {
  children: React.ReactNode;
  navTitle: string;
  headerTitle: string;
  navItems: NavItem[];
};

export async function ProtectedShell({
  children,
  navTitle,
  headerTitle,
  navItems,
}: ProtectedShellProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      isActive: true,
      role: true,
      totalXp: true,
      level: true,
      streak: {
        select: {
          currentStreak: true,
        },
      },
    },
  });
  if (!user) {
    redirect("/login");
  }
  if (!user.isActive) {
    redirect("/login");
  }

  return (
    <div className="app-shell-bg flex min-h-screen">
      <Sidebar title={navTitle} items={navItems} />
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="relative">
          <Header
            title={headerTitle}
            userName={user.name}
            userEmail={user.email}
            totalXp={user.totalXp}
            level={user.level}
            currentStreak={user.streak?.currentStreak ?? 0}
            showGamification={user.role === "LEARNER"}
          />
          <div className="absolute left-4 top-4 z-30 lg:hidden">
            <MobileNav title={navTitle} items={navItems} />
          </div>
        </div>
        <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5">{children}</main>
      </div>
    </div>
  );
}
