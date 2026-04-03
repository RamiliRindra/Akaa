"use server";

import { inspect } from "node:util";

import { hash } from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type RegisterResult = {
  success: boolean;
  error?: string;
};

export async function registerWithCredentials(input: RegisterInput): Promise<RegisterResult> {
  try {
    const session = await auth();
    if (session?.user) {
      return {
        success: false,
        error: "Vous êtes déjà connecté.",
      };
    }

    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides.",
      };
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      return {
        success: false,
        error: "Un compte existe déjà avec cette adresse email.",
      };
    }

    const passwordHash = await hash(parsed.data.password, 12);

    await db.user.create({
      data: {
        email: normalizedEmail,
        name: parsed.data.name,
        passwordHash,
        role: UserRole.LEARNER,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return {
          success: false,
          error: "Base non initialisée: la table utilisateur est absente. Appliquez la migration Phase 1 dans Neon SQL Editor.",
        };
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        success: false,
        error: "Connexion base de données impossible (réseau ou configuration).",
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    const inspected = inspect(error, { depth: 6 });
    console.error("[auth][register][error]", error);

    const combined = `${message}\n${inspected}`.toLowerCase();
    if (
      message.includes("Can't reach database server") ||
      message.includes("connect") ||
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND") ||
      combined.includes("etimedout") ||
      combined.includes("websocket") ||
      combined.includes("p1001") ||
      combined.includes("neon.tech")
    ) {
      return {
        success: false,
        error:
          "Connexion à la base de données impossible (timeout réseau). Si vous êtes sur un réseau qui bloque Neon (ex. certains FAI), essayez la 4G, un autre réseau, ou un PostgreSQL local pour le développement.",
      };
    }

    return {
      success: false,
      error: "Erreur serveur inattendue pendant la création du compte.",
    };
  }
}
