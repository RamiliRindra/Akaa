"use client";

import { CourseStatus } from "@prisma/client";
import { BookOpen, Clock3, Layers3 } from "lucide-react";
import Link from "next/link";

import { CourseThumbnail } from "@/components/course/course-thumbnail";
import { CourseStatusBadge } from "@/components/course/course-status-badge";
import AvatarGroupMaxDemo from "@/components/shadcn-studio/avatar/avatar-14";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { courseLevelBadgeStyles, getCourseLevelLabel, type CourseLevelValue } from "@/lib/course-level";
import { cn } from "@/lib/utils";

type CourseCardProps = {
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
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
  thumbnailUrl,
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
  const descriptionText = description?.trim() || "Aucune description renseignée pour ce cours.";
  const hasLearnerBlock = Boolean(learnerPreview?.length);
  const previewCount = learnerPreview?.length ?? 0;
  const totalLearners = learnerCount ?? previewCount;

  return (
    <HoverCard openDelay={200} closeDelay={150}>
      <HoverCardTrigger asChild>
        <article
          className={cn(
            "panel-card relative block w-full overflow-hidden p-0 text-left outline-none transition duration-200",
            "hover:-translate-y-0.5 hover:bg-[var(--color-surface-high)] hover:shadow-md",
            "focus-within:ring-2 focus-within:ring-[#0F63FF] focus-within:ring-offset-2",
          )}
        >
          <Link
            href={targetHref}
            className="absolute inset-0 z-10"
            aria-label={`Voir le cours : ${title}`}
          />

          <div className="pointer-events-none relative z-[1]">
            <CourseThumbnail title={title} thumbnailUrl={thumbnailUrl} roundedClassName="rounded-none" />

            <div className="space-y-2 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryName ? (
                  <span className="chip chip-primary text-[0.65rem] leading-tight">
                    {categoryName}
                  </span>
                ) : null}
                {level ? (
                  <span className={`chip text-[0.65rem] leading-tight ${courseLevelBadgeStyles[level]}`}>
                    {getCourseLevelLabel(level)}
                  </span>
                ) : null}
                {status ? <CourseStatusBadge status={status} /> : null}
              </div>

              <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-sm font-extrabold leading-snug text-[var(--color-text)] sm:text-base">
                {title}
              </h3>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text)]/70">
                <span className="inline-flex items-center gap-1">
                  <Layers3 className="h-3 w-3 shrink-0" />
                  {moduleCount} module{moduleCount > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  {chapterCount} chapitre{chapterCount > 1 ? "s" : ""}
                </span>
                {estimatedHours ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3 shrink-0" />
                    {estimatedHours} h
                  </span>
                ) : null}
              </div>
            </div>

            {typeof progressPercent === "number" ? (
              <div className="pointer-events-none space-y-1 px-3 pb-3 sm:px-4 sm:pb-4">
                <div className="flex items-center justify-between text-[11px] font-medium text-[var(--color-text)]/70">
                  <span>Progression</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="rounded-[1rem] bg-[var(--color-surface-low)] p-1">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#0050d6_0%,#119da4_100%)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {hasLearnerBlock && learnerPreview ? (
            <div className="relative z-20 border-t border-[var(--color-text-dark)]/10 bg-[var(--color-surface-high)] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {totalLearners} apprenant{totalLearners > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-[var(--color-text)]/62">Dernières inscriptions.</p>
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
                <div className="mt-3">
                  <Link
                    href={learnersHref}
                    className="relative z-30 inline-flex items-center justify-center rounded-xl border border-[var(--color-text-dark)]/10 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-dark)] transition hover:bg-[var(--color-primary-bright)]/5 sm:text-sm"
                  >
                    Voir tous les apprenants
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      </HoverCardTrigger>

      <HoverCardContent side="right" align="start">
        <p className="font-display text-base font-bold leading-snug text-[var(--color-text-dark)]">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-dark)]/78">{descriptionText}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
