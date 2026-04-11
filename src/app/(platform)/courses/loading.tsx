import { CourseGridSkeleton } from "@/components/course/course-card-skeleton";

export default function CoursesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
        <div className="h-4 w-72 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-[var(--color-surface-low)]"
          />
        ))}
      </div>

      {/* Grid */}
      <CourseGridSkeleton count={8} />
    </div>
  );
}
