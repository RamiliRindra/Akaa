import { CourseStatus } from "@prisma/client";
import { BookOpen, Clock3, Layers3 } from "lucide-react";
import Link from "next/link";

import { CourseStatusBadge } from "@/components/course/course-status-badge";
import AvatarGroupMaxDemo from "@/components/shadcn-studio/avatar/avatar-14";
import { courseLevelBadgeStyles, getCourseLevelLabel, type CourseLevelValue } from "@/lib/course-level";

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
  level?: CourseLevelValue;
  href?: string;
  learnerPreview?: Array<{
    src?: string | null;
    fallback: string;
    name: string;
  }>;
  learnerCount?: number;
  learnersHref?: string;
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
  level,
  href,
  learnerPreview,
  learnerCount,
  learnersHref,
}: CourseCardProps) {
  const targetHref = href ?? `/courses/${slug}`;

  return (
    <article className="panel-card overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-surface-high)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {categoryName ? (
              <span className="chip chip-primary">
                {categoryName}
              </span>
            ) : null}
            {level ? (
              <span className={`chip ${courseLevelBadgeStyles[level]}`}>
                {getCourseLevelLabel(level)}
              </span>
            ) : null}
            {status ? <CourseStatusBadge status={status} /> : null}
          </div>
          <h3 className="font-display text-xl font-extrabold text-[#2c2f31]">{title}</h3>
          <p className="text-sm leading-6 text-[#2c2f31]/72">
            {description?.trim() || "Aucune description renseignée pour ce cours."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#2c2f31]/70">
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
        <div className="mt-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#2c2f31]/70">
            <span>Progression</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="rounded-[1.25rem] bg-[#eef1f3] p-1">
            <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,#0050d6_0%,#119da4_100%)]" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : null}

      {learnerPreview?.length ? (
        <div className="mt-5 rounded-[1.5rem] bg-[#f7f9ff] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#2c2f31]">
                {learnerCount ?? learnerPreview.length} apprenant
                {(learnerCount ?? learnerPreview.length) > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-[#2c2f31]/62">
                Aperçu des dernières inscriptions sur cette formation.
              </p>
            </div>
            <AvatarGroupMaxDemo
              items={learnerPreview}
              max={3}
              extraLabel={
                learnerCount && learnerCount > learnerPreview.length
                  ? `+${learnerCount - learnerPreview.length}`
                  : undefined
              }
            />
          </div>

          {learnersHref ? (
            <div className="mt-4">
              <Link
                href={learnersHref}
                className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
              >
                Voir tous les apprenants
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <Link
          href={targetHref}
          className="cta-button px-5 py-2.5 text-sm font-semibold transition"
        >
          Voir le cours
        </Link>
      </div>
    </article>
  );
}
