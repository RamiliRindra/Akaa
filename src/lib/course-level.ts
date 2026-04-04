export const courseLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type CourseLevelValue = (typeof courseLevels)[number];

export const courseLevelLabels: Record<CourseLevelValue, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

export const courseLevelDescriptions: Record<CourseLevelValue, string> = {
  BEGINNER: "Accessible pour une montée en compétence progressive.",
  INTERMEDIATE: "Nécessite déjà des bases opérationnelles.",
  ADVANCED: "Cible des apprenants déjà autonomes sur le sujet.",
};

export const courseLevelBadgeStyles: Record<CourseLevelValue, string> = {
  BEGINNER: "bg-[#119da4]/10 text-[#119da4]",
  INTERMEDIATE: "bg-[#453750]/10 text-[#453750]",
  ADVANCED: "bg-[#ffc857]/15 text-[#8a6110]",
};

export function getCourseLevelLabel(level: CourseLevelValue) {
  return courseLevelLabels[level];
}
