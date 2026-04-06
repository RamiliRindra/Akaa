import type { FeedbackKind, Prisma } from "@prisma/client";

export type FeedbackAdminFilters = {
  kind: FeedbackKind | null;
  updatedFrom: Date | null;
  updatedTo: Date | null;
};

function parseKind(value: string | undefined): FeedbackKind | null {
  if (!value) {
    return null;
  }
  const allowed: FeedbackKind[] = [
    "LEARNER_COURSE",
    "LEARNER_PLATFORM",
    "TRAINER_AUTHORING",
    "TRAINER_PLATFORM",
  ];
  return allowed.includes(value as FeedbackKind) ? (value as FeedbackKind) : null;
}

/** Parse `YYYY-MM-DD` en bornes UTC inclusives pour la journée. */
function dayStartUtc(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

function dayEndUtc(isoDay: string): Date {
  return new Date(`${isoDay}T23:59:59.999Z`);
}

export function parseFeedbackAdminSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): FeedbackAdminFilters {
  const kindRaw = typeof searchParams.kind === "string" ? searchParams.kind : undefined;
  let fromRaw = typeof searchParams.from === "string" ? searchParams.from : undefined;
  let toRaw = typeof searchParams.to === "string" ? searchParams.to : undefined;

  if (
    fromRaw &&
    toRaw &&
    /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) &&
    /^\d{4}-\d{2}-\d{2}$/.test(toRaw) &&
    fromRaw > toRaw
  ) {
    [fromRaw, toRaw] = [toRaw, fromRaw];
  }

  const kind = parseKind(kindRaw);
  let updatedFrom: Date | null = null;
  let updatedTo: Date | null = null;

  if (fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw)) {
    updatedFrom = dayStartUtc(fromRaw);
  }
  if (toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
    updatedTo = dayEndUtc(toRaw);
  }

  return { kind, updatedFrom, updatedTo };
}

export function buildFeedbackWhere(filters: FeedbackAdminFilters): Prisma.FeedbackWhereInput {
  const where: Prisma.FeedbackWhereInput = {};
  if (filters.kind) {
    where.kind = filters.kind;
  }
  if (filters.updatedFrom || filters.updatedTo) {
    where.updatedAt = {};
    if (filters.updatedFrom) {
      where.updatedAt.gte = filters.updatedFrom;
    }
    if (filters.updatedTo) {
      where.updatedAt.lte = filters.updatedTo;
    }
  }
  return where;
}

export function hasActiveFeedbackFilters(filters: FeedbackAdminFilters): boolean {
  return Boolean(filters.kind || filters.updatedFrom || filters.updatedTo);
}

/** Construction de la query string pour export (sans ? initial). */
export function feedbackAdminFiltersToSearchParams(filters: FeedbackAdminFilters): string {
  const params = new URLSearchParams();
  if (filters.kind) {
    params.set("kind", filters.kind);
  }
  if (filters.updatedFrom) {
    const d = filters.updatedFrom;
    params.set(
      "from",
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }
  if (filters.updatedTo) {
    const d = filters.updatedTo;
    params.set(
      "to",
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return params.toString();
}
