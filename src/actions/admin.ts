"use server";

import { BadgeConditionType, UserRole, XpSource } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isBootstrapAdminEmail } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { getLevelFromXp } from "@/lib/gamification";
import { slugify } from "@/lib/utils";
import {
  adminXpAdjustmentFormSchema,
  badgeFormSchema,
  categoryFormSchema,
  updateUserActiveStateFormSchema,
  updateUserRoleFormSchema,
  xpLevelSettingsFormSchema,
} from "@/lib/validations/admin";

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

  return session.user;
}

async function buildUniqueCategorySlug(name: string, categoryId?: string) {
  const baseSlug = slugify(name) || "categorie";
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await db.category.findFirst({
      where: {
        slug: candidate,
        ...(categoryId ? { id: { not: categoryId } } : undefined),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

function revalidateAdminSurfaces() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/users");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/badges");
  revalidatePath("/admin/xp");
}

function revalidateLearningSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  revalidatePath("/courses");
  revalidatePath("/trainer/courses");
  revalidatePath("/trainer/courses/new");
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

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(
    buildRedirectUrl(
      "/admin/xp",
      "success",
      "Les coefficients XP par niveau ont été mis à jour.",
    ),
  );
}

export async function updateUserRoleAction(userId: string, formData: FormData) {
  const admin = await requireAdminSession();

  const parsed = updateUserRoleFormSchema.safeParse({
    role: getString(formData, "role"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/users",
        "error",
        parsed.error.issues[0]?.message ?? "Rôle invalide.",
      ),
    );
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!targetUser) {
    redirect(buildRedirectUrl("/admin/users", "error", "Utilisateur introuvable."));
  }

  if (targetUser.id === admin.id && parsed.data.role !== UserRole.ADMIN) {
    redirect(
      buildRedirectUrl(
        "/admin/users",
        "error",
        "Vous ne pouvez pas retirer votre propre rôle admin.",
      ),
    );
  }

  if (isBootstrapAdminEmail(targetUser.email) && parsed.data.role !== UserRole.ADMIN) {
    redirect(
      buildRedirectUrl(
        "/admin/users",
        "error",
        "Le compte bootstrap admin doit conserver le rôle admin.",
      ),
    );
  }

  await db.user.update({
    where: { id: userId },
    data: {
      role: parsed.data.role,
    },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/users", "success", "Rôle utilisateur mis à jour."));
}

export async function updateUserActiveStateAction(userId: string, formData: FormData) {
  const admin = await requireAdminSession();

  const parsed = updateUserActiveStateFormSchema.safeParse({
    isActive: getString(formData, "isActive"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/users",
        "error",
        parsed.error.issues[0]?.message ?? "État utilisateur invalide.",
      ),
    );
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!targetUser) {
    redirect(buildRedirectUrl("/admin/users", "error", "Utilisateur introuvable."));
  }

  if (targetUser.id === admin.id && !parsed.data.isActive) {
    redirect(
      buildRedirectUrl(
        "/admin/users",
        "error",
        "Vous ne pouvez pas désactiver votre propre compte admin.",
      ),
    );
  }

  if (isBootstrapAdminEmail(targetUser.email) && !parsed.data.isActive) {
    redirect(
      buildRedirectUrl(
        "/admin/users",
        "error",
        "Le compte bootstrap admin ne peut pas être désactivé.",
      ),
    );
  }

  await db.user.update({
    where: { id: userId },
    data: {
      isActive: parsed.data.isActive,
    },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(
    buildRedirectUrl(
      "/admin/users",
      "success",
      parsed.data.isActive ? "Compte réactivé." : "Compte désactivé.",
    ),
  );
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminSession();

  const parsed = categoryFormSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    color: getString(formData, "color"),
    icon: getString(formData, "icon"),
    order: getString(formData, "order"),
    isActive: getString(formData, "isActive"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/categories",
        "error",
        parsed.error.issues[0]?.message ?? "Catégorie invalide.",
      ),
    );
  }

  const slug = await buildUniqueCategorySlug(parsed.data.name);

  await db.category.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      color: parsed.data.color,
      icon: parsed.data.icon,
      order: parsed.data.order,
      isActive: parsed.data.isActive,
    },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/categories", "success", "Catégorie créée."));
}

export async function updateCategoryAction(categoryId: string, formData: FormData) {
  await requireAdminSession();

  const parsed = categoryFormSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    color: getString(formData, "color"),
    icon: getString(formData, "icon"),
    order: getString(formData, "order"),
    isActive: getString(formData, "isActive"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/categories",
        "error",
        parsed.error.issues[0]?.message ?? "Catégorie invalide.",
      ),
    );
  }

  const slug = await buildUniqueCategorySlug(parsed.data.name, categoryId);

  await db.category.update({
    where: { id: categoryId },
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      color: parsed.data.color,
      icon: parsed.data.icon,
      order: parsed.data.order,
      isActive: parsed.data.isActive,
    },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/categories", "success", "Catégorie mise à jour."));
}

export async function deleteCategoryAction(categoryId: string) {
  await requireAdminSession();

  await db.category.delete({
    where: { id: categoryId },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/categories", "success", "Catégorie supprimée."));
}

export async function createBadgeAction(formData: FormData) {
  await requireAdminSession();

  const parsed = badgeFormSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    iconUrl: getString(formData, "iconUrl"),
    conditionType: getString(formData, "conditionType"),
    conditionValue: getString(formData, "conditionValue"),
    xpBonus: getString(formData, "xpBonus"),
    isActive: getString(formData, "isActive"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/badges",
        "error",
        parsed.error.issues[0]?.message ?? "Badge invalide.",
      ),
    );
  }

  await db.badge.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      iconUrl: parsed.data.iconUrl,
      conditionType: parsed.data.conditionType,
      conditionValue: parsed.data.conditionType === BadgeConditionType.MANUAL ? null : parsed.data.conditionValue,
      xpBonus: parsed.data.xpBonus,
      isActive: parsed.data.isActive,
    },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/badges", "success", "Badge créé."));
}

export async function updateBadgeAction(badgeId: string, formData: FormData) {
  await requireAdminSession();

  const parsed = badgeFormSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    iconUrl: getString(formData, "iconUrl"),
    conditionType: getString(formData, "conditionType"),
    conditionValue: getString(formData, "conditionValue"),
    xpBonus: getString(formData, "xpBonus"),
    isActive: getString(formData, "isActive"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/badges",
        "error",
        parsed.error.issues[0]?.message ?? "Badge invalide.",
      ),
    );
  }

  await db.badge.update({
    where: { id: badgeId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      iconUrl: parsed.data.iconUrl,
      conditionType: parsed.data.conditionType,
      conditionValue: parsed.data.conditionType === BadgeConditionType.MANUAL ? null : parsed.data.conditionValue,
      xpBonus: parsed.data.xpBonus,
      isActive: parsed.data.isActive,
    },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/badges", "success", "Badge mis à jour."));
}

export async function deleteBadgeAction(badgeId: string) {
  await requireAdminSession();

  await db.badge.delete({
    where: { id: badgeId },
  });

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/badges", "success", "Badge supprimé."));
}

export async function adjustUserXpAction(formData: FormData) {
  await requireAdminSession();

  const parsed = adminXpAdjustmentFormSchema.safeParse({
    userId: getString(formData, "userId"),
    amount: getString(formData, "amount"),
    reason: getString(formData, "reason"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(
        "/admin/xp",
        "error",
        parsed.error.issues[0]?.message ?? "Ajustement XP invalide.",
      ),
    );
  }

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      role: true,
      totalXp: true,
    },
  });

  if (!user) {
    redirect(buildRedirectUrl("/admin/xp", "error", "Utilisateur introuvable."));
  }

  if (user.role !== UserRole.LEARNER) {
    redirect(
      buildRedirectUrl(
        "/admin/xp",
        "error",
        "L’ajustement XP apprenant est réservé aux apprenants.",
      ),
    );
  }

  const nextTotalXp = user.totalXp + parsed.data.amount;
  if (nextTotalXp < 0) {
    redirect(
      buildRedirectUrl(
        "/admin/xp",
        "error",
        "L’ajustement ferait passer le total XP sous zéro.",
      ),
    );
  }

  await db.$transaction([
    db.xpTransaction.create({
      data: {
        userId: user.id,
        amount: parsed.data.amount,
        source: XpSource.ADMIN,
        description: parsed.data.reason,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        totalXp: nextTotalXp,
        level: getLevelFromXp(nextTotalXp),
      },
    }),
  ]);

  revalidateAdminSurfaces();
  revalidateLearningSurfaces();

  redirect(buildRedirectUrl("/admin/xp", "success", "Ajustement XP enregistré."));
}
