"use server";

import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xpLevelSettingsFormSchema } from "@/lib/validations/admin";

function buildRedirectUrl(path: string, type: "success" | "error", message: string) {
  const url = new URL(path, "https://akaa.local");
  url.searchParams.set("type", type);
  url.searchParams.set("message", message);
  return `${url.pathname}${url.search}`;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  return session.user.id;
}

export async function updateXpLevelSettingsAction(formData: FormData) {
  await requireAdminSession();

  const parsed = xpLevelSettingsFormSchema.safeParse({
    beginnerMultiplier: getString(formData, "beginnerMultiplier"),
    intermediateMultiplier: getString(formData, "intermediateMultiplier"),
    advancedMultiplier: getString(formData, "advancedMultiplier"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/xp",
        "error",
        parsed.error.issues[0]?.message ?? "Configuration XP invalide.",
      ),
    );
  }

  await db.$transaction([
    db.xpLevelSetting.upsert({
      where: { level: "BEGINNER" },
      update: { multiplier: parsed.data.beginnerMultiplier },
      create: {
        level: "BEGINNER",
        multiplier: parsed.data.beginnerMultiplier,
      },
    }),
    db.xpLevelSetting.upsert({
      where: { level: "INTERMEDIATE" },
      update: { multiplier: parsed.data.intermediateMultiplier },
      create: {
        level: "INTERMEDIATE",
        multiplier: parsed.data.intermediateMultiplier,
      },
    }),
    db.xpLevelSetting.upsert({
      where: { level: "ADVANCED" },
      update: { multiplier: parsed.data.advancedMultiplier },
      create: {
        level: "ADVANCED",
        multiplier: parsed.data.advancedMultiplier,
      },
    }),
  ]);

  redirect(
    buildRedirectUrl(
      "/admin/xp",
      "success",
      "Les coefficients XP par niveau ont été mis à jour.",
    ),
  );
}
