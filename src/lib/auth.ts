import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma, UserRole } from "@prisma/client";
import { compare } from "bcryptjs";
import { inspect } from "node:util";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  getGoogleOAuthConfig,
  hasGoogleOAuth,
  isBootstrapAdminEmail,
} from "@/lib/auth-config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

function logPrismaAuthError(context: string, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[auth][prisma]", {
      context,
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[auth][prisma-init]", {
      context,
      message: error.message,
      errorCode: error.errorCode,
    });
    return;
  }

  console.error("[auth][error]", { context, error });
}

async function ensureBootstrapAdminRole(user: {
  id?: string | null;
  email?: string | null;
  role?: UserRole | null;
}) {
  if (!isBootstrapAdminEmail(user.email)) {
    return user.role ?? null;
  }

  if (user.id) {
    try {
      await db.user.updateMany({
        where: {
          id: user.id,
          role: { not: UserRole.ADMIN },
        },
        data: {
          role: UserRole.ADMIN,
        },
      });
    } catch (error) {
      logPrismaAuthError("bootstrap-admin.updateRole", error);
    }
  }

  return UserRole.ADMIN;
}

async function getAuthUserState(userId: string) {
  try {
    return await db.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
      },
    });
  } catch (error) {
    logPrismaAuthError("auth.getUserState", error);
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: (() => {
    const baseAdapter = PrismaAdapter(db);

    const wrapAdapterMethod = <T extends (...args: never[]) => unknown>(
      context: string,
      fn: T,
    ) =>
      (async (...args: Parameters<T>) => {
        try {
          return await fn(...args);
        } catch (error) {
          logPrismaAuthError(context, error);
          throw error;
        }
      }) as T;

    return {
      ...baseAdapter,
      getUserByAccount: wrapAdapterMethod(
        "adapter.getUserByAccount",
        baseAdapter.getUserByAccount!,
      ),
      createUser: wrapAdapterMethod("adapter.createUser", baseAdapter.createUser!),
      linkAccount: wrapAdapterMethod("adapter.linkAccount", baseAdapter.linkAccount!),
      getUserByEmail: wrapAdapterMethod("adapter.getUserByEmail", baseAdapter.getUserByEmail!),
    } as Adapter;
  })(),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(hasGoogleOAuth
        ? [
          Google({
            clientId: getGoogleOAuthConfig().clientId as string,
            clientSecret: getGoogleOAuthConfig().clientSecret as string,
            allowDangerousEmailAccountLinking: true,
            /** Affiche le sélecteur de comptes Google au lieu de réutiliser silencieusement la session déjà connectée. */
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
            profile(profile) {
              const fallbackName =
                profile.name ??
                profile.given_name ??
                profile.email?.split("@")[0] ??
                "Utilisateur Akaa";

              return {
                id: profile.sub,
                name: fallbackName,
                email: profile.email,
                image: profile.picture,
              };
            },
          }),
        ]
      : []),
    Credentials({
      name: "Email et mot de passe",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "nom@akaa.fr",
        },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }
        const normalizedEmail = parsed.data.email.toLowerCase();

        let user: Awaited<ReturnType<typeof db.user.findUnique>>;
        try {
          user = await db.user.findUnique({
            where: { email: normalizedEmail },
          });
        } catch (error) {
          logPrismaAuthError("credentials.authorize.findUnique", error);
          return null;
        }
        if (!user?.passwordHash) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const isPasswordValid = await compare(parsed.data.password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const userId = user.id ?? null;

      if (!userId) {
        return false;
      }

      const state = await getAuthUserState(userId);
      return state?.isActive ?? user.isActive ?? true;
    },
    async jwt({ token, user }) {
      if (user) {
        if (!user.id) {
          token.isActive = user.isActive ?? true;
          token.role = (user.role as UserRole | undefined) ?? token.role;
          return token;
        }

        const state = await getAuthUserState(user.id);
        if (state && !state.isActive) {
          token.isActive = false;
          return token;
        }

        const role = await ensureBootstrapAdminRole({
          id: user.id,
          email: user.email,
          role: state?.role ?? (user.role as UserRole | undefined) ?? null,
        });
        token.sub = user.id;
        token.role = role ?? user.role;
        token.isActive = state?.isActive ?? user.isActive ?? true;
        return token;
      }

      if (token.sub) {
        const state = await getAuthUserState(token.sub);
        if (state) {
          token.isActive = state.isActive;
          token.role = state.role;
        }
      }

      if (isBootstrapAdminEmail(token.email)) {
        token.role =
          (await ensureBootstrapAdminRole({
            id: token.sub,
            email: token.email,
            role: (token.role as UserRole | undefined) ?? null,
          })) ?? undefined;
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole | undefined) ?? "LEARNER";
        session.user.isActive = token.isActive ?? true;
      }

      return session;
    },
  },
  logger: {
    error(code, ...message) {
      console.error("[auth][logger][error]", code, ...message);
      for (const payload of message) {
        console.error("[auth][logger][error][inspect]", inspect(payload, { depth: 8 }));
      }
    },
  },
});
