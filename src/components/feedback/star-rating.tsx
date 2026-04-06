"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type RatingSize = "sm" | "default" | "lg";

const gapClass: Record<RatingSize, string> = {
  sm: "gap-0.5",
  default: "gap-1",
  lg: "gap-1.5",
};

const starClass: Record<RatingSize, string> = {
  sm: "h-4 w-4",
  default: "h-5 w-5",
  lg: "h-7 w-7",
};

export type RatingProps = {
  /** Note courante (décimaux autorisés pour l’affichage agrégé). */
  rating: number;
  maxRating?: number;
  size?: RatingSize;
  showValue?: boolean;
  editable?: boolean;
  onRatingChange?: (value: number) => void;
  className?: string;
  starClassName?: string;
  /** `aria-label` pour le groupe d’étoiles */
  label?: string;
};

/**
 * Affichage et saisie de notes en étoiles (inspiré des patterns type shadcn / ReUI Rating).
 */
export function Rating({
  rating,
  maxRating = 5,
  size = "default",
  showValue = false,
  editable = false,
  onRatingChange,
  className,
  starClassName,
  label = "Note",
}: RatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  const interactive = editable && typeof onRatingChange === "function";
  const display = interactive && hover !== null ? hover : rating;

  function handleClick(index: number) {
    if (!interactive) {
      return;
    }
    onRatingChange?.(index + 1);
  }

  return (
    <div
      className={cn("inline-flex flex-wrap items-center", gapClass[size], className)}
      role="img"
      aria-label={label}
    >
      <div className={cn("flex items-center", gapClass[size])}>
        {Array.from({ length: maxRating }, (_, i) => {
          const fill = Math.min(1, Math.max(0, display - i));
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onMouseEnter={() => interactive && setHover(i + 1)}
              onMouseLeave={() => interactive && setHover(null)}
              onClick={() => handleClick(i)}
              className={cn(
                "relative grid shrink-0 place-items-center outline-none transition-transform",
                interactive && "cursor-pointer hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#0F63FF]/40 rounded-sm",
                !interactive && "cursor-default",
                starClassName,
              )}
              aria-label={`${i + 1} sur ${maxRating}`}
            >
              <Star className={cn(starClass[size], "text-[#e2e8f0]")} strokeWidth={1.5} />
              <span
                className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={cn(starClass[size], "fill-[#ffc857] text-[#ffc857]")} strokeWidth={1.5} />
              </span>
            </button>
          );
        })}
      </div>
      {showValue ? (
        <span className={cn("font-mono tabular-nums text-[#0c0910]/80", size === "lg" ? "text-base" : "text-sm")}>
          {display.toFixed(1).replace(".0", "")}
        </span>
      ) : null}
    </div>
  );
}
