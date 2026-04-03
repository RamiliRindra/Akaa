"use server";

import { inspect } from "node:util";

import { hash } from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";
import { isBootstrapAdminEmail } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type RegisterResult = {
  success: boolean;
  error?: string;
};

export type LoginFormState = { error: string } | null;

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function sanitizeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

function authRedirectHasError(target: string): boolean {
  try {
    return new URL(target, "https://internal.invalid").searchParams.has("error");
  } catch {
    return false;
  }
}

function messageForAuthRedirect(target: string): string {
  const err = new URL(target, "https://internal.invalid").searchParams.get("error");
  if (err === "CredentialsSignin") {
    return "Email ou mot de passe incorrect.";
  }
  return "La connexion a échoué. Réessayez.";
}

/**
 * Auth.js met souvent une URL absolue dans Location (origine = host interne du conteneur
 * ou localhost). `redirect()` avec cette URL envoie le navigateur vers 127.0.0.1 / mauvais host
 * → on reste visuellement bloqué sur le formulaire malgré un 303.
 * On ne garde que pathname + search (chemin relatif au domaine public).
 */
function normalizeAuthRedirectTarget(target: string): string {
  if (target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  try {
    const u = new URL(target);
    return `${u.pathname}${u.search}`;
  } catch {
    return "/dashboard";
  }
}

/**
 * Connexion credentials via signIn serveur (cookies().set + redirect) :
 * évite les écarts fetch client / Set-Cookie observés sur Railway.
 */
export async function loginWithCredentialsForm(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const existing = await auth();
  if (existing?.user) {
    redirect(sanitizeCallbackUrl(formData.get("callbackUrl")));
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl"));

  try {
    const target = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
      redirect: false,
    });

    if (typeof target !== "string") {
      return { error: "Réponse de connexion inattendue. Réessayez." };
    }

    if (authRedirectHasError(target)) {
      return { error: messageForAuthRedirect(target) };
    }

    const nextPath = normalizeAuthRedirectTarget(target);
    redirect(nextPath);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("[auth][login][error]", error);
    return { error: "Connexion impossible. Réessayez ou vérifiez votre connexion." };
  }
}

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
        role: isBootstrapAdminEmail(normalizedEmail) ? UserRole.ADMIN : UserRole.LEARNER,
      },
    });

    try {
      const target = await signIn("credentials", {
        email: normalizedEmail,
        password: parsed.data.password,
        redirectTo: "/dashboard",
        redirect: false,
      });

      if (typeof target === "string" && !authRedirectHasError(target)) {
        const nextPath = normalizeAuthRedirectTarget(target);
        redirect(nextPath);
      }
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.error("[auth][register][signIn-after-create]", error);
    }

    return { success: true };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

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
