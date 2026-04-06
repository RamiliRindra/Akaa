import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { getCachedSession } from "@/lib/auth-session";
import { getNotificationsPageForUser } from "@/lib/notifications-queries";

const PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "Notifications | Akaa",
};

type PlatformNotificationsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function PlatformNotificationsPage({ searchParams }: PlatformNotificationsPageProps) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const parsed = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const { items, totalCount, page: resolvedPage } = await getNotificationsPageForUser(
    session.user.id,
    page,
    PAGE_SIZE,
  );

  return (
    <NotificationsPageClient
      initialItems={items}
      page={resolvedPage}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
      listBasePath="/notifications"
      calendarHref="/calendar"
    />
  );
}
