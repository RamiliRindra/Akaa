import { CourseStatus } from "@prisma/client";

const statusStyles: Record<CourseStatus, string> = {
  DRAFT: "bg-[#453750]/10 text-[#453750]",
  PUBLISHED: "bg-[#119da4]/10 text-[#119da4]",
  ARCHIVED: "bg-[#0c0910]/10 text-[#0c0910]/70",
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
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

