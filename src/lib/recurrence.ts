import { rrulestr } from "rrule";

const DEFAULT_MAX_OCCURRENCES = 52;

/**
 * Formate une date locale en DTSTART RFC 5545 (sans fuseau, interprétée comme locale par rrule).
 */
function formatDtstartLocal(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  const s = String(dt.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * À partir d’une règle RRULE (fragment ou ligne complète) et des bornes de la première occurrence,
 * retourne les dates de début de chaque occurrence matérialisée (plafonné).
 */
export function expandRecurrenceStarts(
  startsAt: Date,
  endsAt: Date,
  recurrenceRule: string | undefined,
  maxOccurrences = DEFAULT_MAX_OCCURRENCES,
): Date[] {
  const trimmed = recurrenceRule?.trim() ?? "";
  if (!trimmed) {
    return [startsAt];
  }

  const durationMs = endsAt.getTime() - startsAt.getTime();
  if (durationMs <= 0) {
    return [startsAt];
  }

  const rruleLine = trimmed.toUpperCase().startsWith("RRULE:") ? trimmed : `RRULE:${trimmed}`;
  const full = `DTSTART:${formatDtstartLocal(startsAt)}\n${rruleLine}`;

  let rule;
  try {
    rule = rrulestr(full);
  } catch {
    throw new Error(
      "Règle de récurrence invalide. Utilisez le format RFC 5545 (ex. FREQ=WEEKLY;BYDAY=MO;COUNT=10).",
    );
  }

  const dates = rule.all((_, i) => i < maxOccurrences);
  if (dates.length === 0) {
    return [startsAt];
  }

  return dates;
}

export function expandRecurrenceOccurrences(
  startsAt: Date,
  endsAt: Date,
  recurrenceRule: string | undefined,
  maxOccurrences = DEFAULT_MAX_OCCURRENCES,
): Array<{ startsAt: Date; endsAt: Date }> {
  const starts = expandRecurrenceStarts(startsAt, endsAt, recurrenceRule, maxOccurrences);
  const durationMs = endsAt.getTime() - startsAt.getTime();
  if (durationMs <= 0) {
    return starts.map((s) => ({ startsAt: s, endsAt: endsAt }));
  }

  return starts.map((s) => ({
    startsAt: s,
    endsAt: new Date(s.getTime() + durationMs),
  }));
}
