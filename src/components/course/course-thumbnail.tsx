import { BookOpen } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type CourseThumbnailProps = {
  title: string;
  thumbnailUrl?: string | null;
  className?: string;
  /** Rayon des coins du cadre (ex. arrondi seulement en haut sur une card) */
  roundedClassName?: string;
};

/**
 * Bloc paysage fixe (16:9) pour vignette cours : image en cover ou placeholder.
 * `unoptimized` : URLs externes diverses sans liste de domaines dans `next.config`.
 */
export function CourseThumbnail({
  title,
  thumbnailUrl,
  className,
  roundedClassName = "rounded-[1.25rem]",
}: CourseThumbnailProps) {
  const url = thumbnailUrl?.trim();

  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-surface-low)]",
        roundedClassName,
        className,
      )}
    >
      {url ? (
        <Image
          src={url}
          alt={`Illustration du cours : ${title}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E8F0FF] to-[#eef1f3]">
          <BookOpen className="h-12 w-12 text-[var(--color-primary-bright)]/25" aria-hidden />
        </div>
      )}
    </div>
  );
}
