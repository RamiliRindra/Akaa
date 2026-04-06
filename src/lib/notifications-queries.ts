import { db } from "@/lib/db";

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  relatedUrl: true,
  isRead: true,
  createdAt: true,
} as const;

export async function getNotificationsPageForUser(userId: string, page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const skip = (safePage - 1) * pageSize;

  const [items, totalCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: notificationSelect,
    }),
    db.notification.count({
      where: { userId },
    }),
  ]);

  return {
    items: items.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })),
    totalCount,
    page: safePage,
  };
}
