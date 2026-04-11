import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-44 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
          <div className="h-4 w-64 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex gap-3">
        <div className="h-9 w-48 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
        <div className="h-9 w-32 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
      </div>

      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
