import { CourseStatus } from "@prisma/client";
import { BookOpen, Clock3, Layers3 } from "lucide-react";
import Link from "next/link";

import { CourseStatusBadge } from "@/components/course/course-status-badge";

type CourseCardProps = {
  title: string;
  slug: string;
  description?: string | null;
  categoryName?: string | null;
  moduleCount: number;
  chapterCount: number;
  estimatedHours?: number | null;
  progressPercent?: number;
  status?: CourseStatus;
  href?: string;
};

export function CourseCard({
  title,
  slug,
  description,
  categoryName,
  moduleCount,
  chapterCount,
  estimatedHours,
  progressPercent,
  status,
  href,
}: CourseCardProps) {
  const targetHref = href ?? `/courses/${slug}`;

  return (
    <article className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {categoryName ? (
              <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0F63FF]">
                {categoryName}
              </span>
            ) : null}
            {status ? <CourseStatusBadge status={status} /> : null}
          </div>
          <h3 className="text-lg font-bold text-[#0c0910]">{title}</h3>
          <p className="text-sm text-[#0c0910]/70">
            {description?.trim() || "Aucune description renseignée pour ce cours."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#0c0910]/70">
        <span className="inline-flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5" />
          {moduleCount} module{moduleCount > 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          {chapterCount} chapitre{chapterCount > 1 ? "s" : ""}
        </span>
        {estimatedHours ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {estimatedHours} h estimées
          </span>
        ) : null}
      </div>

      {typeof progressPercent === "number" ? (
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#0c0910]/70">
            <span>Progression</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#0c0910]/8">
            <div className="h-2 rounded-full bg-[#119da4]" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <Link
          href={targetHref}
          className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
        >
          Voir le cours
        </Link>
      </div>
    </article>
  );
}

