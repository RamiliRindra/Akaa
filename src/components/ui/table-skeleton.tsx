import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = {
  rows?: number;
  cols?: number;
};

export function TableSkeleton({ rows = 8, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="space-y-1 overflow-hidden rounded-2xl border border-[var(--color-outline-ghost)]">
      {/* Header */}
      <div className="flex gap-4 border-b border-[var(--color-outline-ghost)] bg-[var(--color-surface-low)] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" style={{ maxWidth: i === 0 ? "12rem" : undefined }} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 bg-[var(--color-surface)] px-4 py-3.5"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-4 flex-1"
              style={{
                maxWidth: colIdx === 0 ? "12rem" : undefined,
                opacity: 1 - rowIdx * 0.07,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
