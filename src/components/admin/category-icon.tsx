import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  Code2,
  GraduationCap,
  Megaphone,
  PenTool,
  Sparkles,
} from "lucide-react";

export const categoryIconOptions = [
  { value: "BookOpen", label: "Général", Icon: BookOpen },
  { value: "GraduationCap", label: "Formation", Icon: GraduationCap },
  { value: "BriefcaseBusiness", label: "Business", Icon: BriefcaseBusiness },
  { value: "ChartNoAxesColumn", label: "Data", Icon: ChartNoAxesColumn },
  { value: "Code2", label: "Tech", Icon: Code2 },
  { value: "Megaphone", label: "Marketing", Icon: Megaphone },
  { value: "PenTool", label: "Création", Icon: PenTool },
  { value: "Sparkles", label: "Premium", Icon: Sparkles },
] as const;

type CategoryIconProps = {
  iconName: string;
  className?: string;
};

export function CategoryIcon({ iconName, className }: CategoryIconProps) {
  const Icon =
    categoryIconOptions.find((option) => option.value === iconName)?.Icon ?? (BookOpen as LucideIcon);
  return <Icon className={className} aria-hidden="true" />;
}
