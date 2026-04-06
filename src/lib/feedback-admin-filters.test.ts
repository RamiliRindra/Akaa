import { describe, expect, it } from "vitest";

import { parseFeedbackAdminSearchParams } from "@/lib/feedback-admin-filters";

describe("parseFeedbackAdminSearchParams", () => {
  it("parse un type valide", () => {
    const r = parseFeedbackAdminSearchParams({ kind: "LEARNER_PLATFORM" });
    expect(r.kind).toBe("LEARNER_PLATFORM");
  });

  it("ignore un type invalide", () => {
    const r = parseFeedbackAdminSearchParams({ kind: "INVALID" });
    expect(r.kind).toBeNull();
  });

  it("échange from et to si from > to", () => {
    const r = parseFeedbackAdminSearchParams({
      from: "2026-04-10",
      to: "2026-04-01",
    });
    expect(r.updatedFrom?.toISOString().startsWith("2026-04-01")).toBe(true);
    expect(r.updatedTo?.toISOString().startsWith("2026-04-10")).toBe(true);
  });
});
