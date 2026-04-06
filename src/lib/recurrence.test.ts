import { describe, expect, it } from "vitest";

import { expandRecurrenceOccurrences, expandRecurrenceStarts } from "@/lib/recurrence";

describe("expandRecurrenceStarts", () => {
  it("returns single start when no rule", () => {
    const start = new Date("2026-04-06T10:00:00");
    const end = new Date("2026-04-06T11:00:00");
    expect(expandRecurrenceStarts(start, end, undefined)).toEqual([start]);
    expect(expandRecurrenceStarts(start, end, "   ")).toEqual([start]);
  });

  it("expands weekly rule with COUNT", () => {
    const start = new Date("2026-04-06T10:00:00");
    const end = new Date("2026-04-06T11:00:00");
    const dates = expandRecurrenceStarts(start, end, "FREQ=WEEKLY;COUNT=3");
    expect(dates).toHaveLength(3);
    expect(dates[1]!.getTime()).toBeGreaterThan(dates[0]!.getTime());
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(dates[1]!.getTime() - dates[0]!.getTime() - weekMs)).toBeLessThan(120_000);
  });
});

describe("expandRecurrenceOccurrences", () => {
  it("preserves duration between start and end", () => {
    const start = new Date("2026-04-06T10:00:00");
    const end = new Date("2026-04-06T11:30:00");
    const occ = expandRecurrenceOccurrences(start, end, "FREQ=DAILY;COUNT=2");
    expect(occ).toHaveLength(2);
    expect(occ[0]!.endsAt.getTime() - occ[0]!.startsAt.getTime()).toBe(90 * 60 * 1000);
    expect(occ[1]!.endsAt.getTime() - occ[1]!.startsAt.getTime()).toBe(90 * 60 * 1000);
  });
});
