import { CourseGridSkeleton } from "@/components/course/course-card-skeleton";

export default function TrainerCoursesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
        <div className="h-10 w-32 animate-pulse rounded-xl bg-[var(--color-surface-low)]" />
      </div>
      <CourseGridSkeleton count={6} />
    </div>
  );
}
