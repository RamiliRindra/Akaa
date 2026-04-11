import { CourseStatus } from "@prisma/client";

const statusStyles: Record<CourseStatus, string> = {
  DRAFT: "chip chip-secondary",
  PUBLISHED: "chip chip-success",
  ARCHIVED: "chip bg-[#2c2f31]/8 text-[var(--color-text)]/65",
};

const statusLabels: Record<CourseStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

type CourseStatusBadgeProps = {
  status: CourseStatus;
};

export function CourseStatusBadge({ status }: CourseStatusBadgeProps) {
  return <span className={statusStyles[status]}>{statusLabels[status]}</span>;
}
