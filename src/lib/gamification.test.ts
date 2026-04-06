import { AttendanceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getLevelFromXp, shouldRewardSessionAttendance } from "@/lib/gamification";
import { applyXpMultiplier, defaultXpLevelMultipliers } from "@/lib/xp-settings";

describe("gamification helpers", () => {
  it("calcule le niveau depuis le total d'XP", () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(99)).toBe(1);
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(250)).toBe(3);
  });

  it("récompense uniquement PRESENT et LATE pour une session", () => {
    expect(shouldRewardSessionAttendance(AttendanceStatus.PRESENT)).toBe(true);
    expect(shouldRewardSessionAttendance(AttendanceStatus.LATE)).toBe(true);
    expect(shouldRewardSessionAttendance(AttendanceStatus.ABSENT)).toBe(false);
    expect(shouldRewardSessionAttendance(AttendanceStatus.EXCUSED)).toBe(false);
  });

  it("applique le multiplicateur XP avec arrondi et minimum de sécurité", () => {
    expect(applyXpMultiplier(10, defaultXpLevelMultipliers.BEGINNER)).toBe(10);
    expect(applyXpMultiplier(10, defaultXpLevelMultipliers.INTERMEDIATE)).toBe(15);
    expect(applyXpMultiplier(10, defaultXpLevelMultipliers.ADVANCED)).toBe(20);
    expect(applyXpMultiplier(0, 2)).toBe(1);
  });
});
