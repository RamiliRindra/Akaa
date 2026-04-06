import { SessionAccessPolicy, SessionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { trainingSessionFormSchema } from "@/lib/validations/training";

const validBaseSession = {
  title: "Session de test",
  description: "Description",
  status: SessionStatus.SCHEDULED,
  accessPolicy: SessionAccessPolicy.OPEN,
  startsAt: "2026-04-10T09:00:00.000Z",
  endsAt: "2026-04-10T10:00:00.000Z",
  isAllDay: "false",
  location: "Salle 2",
  meetingUrl: "https://meet.google.com/demo-session",
  recurrenceRule: "",
  reminderMinutes: "1440",
  xpReward: "30",
  courseId: "11111111-1111-4111-8111-111111111111",
  programId: undefined,
  trainerId: "33333333-3333-4333-8333-333333333333",
};

describe("trainingSessionFormSchema", () => {
  it("rejette une session sans cours ni parcours", () => {
    const result = trainingSessionFormSchema.safeParse({
      ...validBaseSession,
      courseId: undefined,
      programId: undefined,
    });

    expect(result.success).toBe(false);
  });

  it("rejette une session avec cours et parcours simultanément", () => {
    const result = trainingSessionFormSchema.safeParse({
      ...validBaseSession,
      programId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(false);
  });

  it("rejette une session dont la fin n'est pas postérieure au début", () => {
    const result = trainingSessionFormSchema.safeParse({
      ...validBaseSession,
      endsAt: "2026-04-10T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejette les entiers invalides", () => {
    const result = trainingSessionFormSchema.safeParse({
      ...validBaseSession,
      reminderMinutes: "-1",
    });

    expect(result.success).toBe(false);
  });

  it("accepte une session valide rattachée à un cours", () => {
    const result = trainingSessionFormSchema.safeParse(validBaseSession);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.courseId).toBe(validBaseSession.courseId);
      expect(result.data.programId).toBeUndefined();
    }
  });
});
