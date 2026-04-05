import {
  AttendanceStatus,
  ProgramStatus,
  SessionAccessPolicy,
  SessionEnrollmentStatus,
  SessionStatus,
} from "@prisma/client";

export const programStatusLabels: Record<ProgramStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const sessionStatusLabels: Record<SessionStatus, string> = {
  SCHEDULED: "Planifiée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const sessionAccessPolicyLabels: Record<SessionAccessPolicy, string> = {
  OPEN: "Accès ouvert",
  SESSION_ONLY: "Réservé aux inscrits",
};

export const sessionEnrollmentStatusLabels: Record<SessionEnrollmentStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  LATE: "En retard",
  EXCUSED: "Excusé",
};

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function toDateTimeLocalValue(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getProgramStatusClassName(status: ProgramStatus) {
  if (status === "PUBLISHED") return "bg-[#119da4]/10 text-[#119da4]";
  if (status === "ARCHIVED") return "bg-[#655670]/12 text-[#655670]";
  return "bg-[#ffc857]/20 text-[#775600]";
}

export function getSessionStatusClassName(status: SessionStatus) {
  if (status === "COMPLETED") return "bg-[#119da4]/10 text-[#119da4]";
  if (status === "CANCELLED") return "bg-[#c2410c]/10 text-[#c2410c]";
  return "bg-[#0F63FF]/10 text-[#0F63FF]";
}

export function getSessionAccessPolicyClassName(policy: SessionAccessPolicy) {
  if (policy === "SESSION_ONLY") return "bg-[#453750]/12 text-[#453750]";
  return "bg-[#119da4]/10 text-[#119da4]";
}

export function getEnrollmentStatusClassName(status: SessionEnrollmentStatus) {
  if (status === "APPROVED") return "bg-[#119da4]/10 text-[#119da4]";
  if (status === "REJECTED") return "bg-[#c2410c]/10 text-[#c2410c]";
  if (status === "CANCELLED") return "bg-[#655670]/12 text-[#655670]";
  return "bg-[#ffc857]/20 text-[#775600]";
}

export function getAttendanceStatusClassName(status: AttendanceStatus) {
  if (status === "PRESENT") return "bg-[#119da4]/10 text-[#119da4]";
  if (status === "LATE") return "bg-[#ffc857]/20 text-[#775600]";
  if (status === "EXCUSED") return "bg-[#655670]/12 text-[#655670]";
  return "bg-[#c2410c]/10 text-[#c2410c]";
}
