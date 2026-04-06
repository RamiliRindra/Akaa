import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type UserRole = "LEARNER" | "TRAINER" | "ADMIN";

const AUTH_PAGES = ["/login", "/register"];
const PLATFORM_PREFIXES = [
  "/dashboard",
  "/courses",
  "/calendar",
  "/programs",
  "/leaderboard",
  "/profile",
  "/notifications",
  "/feedback",
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPlatformRoute(pathname: string) {
  return PLATFORM_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some((page) => matchesPrefix(pathname, page));
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(loginUrl);
}

/** Aligné sur Auth.js : en HTTPS le cookie session utilise le préfixe __Secure- */
function isSecureAuthCookieEnv(): boolean {
  const publicUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  return (
    process.env.NODE_ENV === "production" || publicUrl.startsWith("https://")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isTrainerRoute = matchesPrefix(pathname, "/trainer");
  const isAdminRoute = matchesPrefix(pathname, "/admin");
  const isAdminApiRoute = pathname.startsWith("/api/admin");
  const needsAuth =
    isPlatformRoute(pathname) || isTrainerRoute || isAdminRoute || isAdminApiRoute || isAuthPage(pathname);

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecureAuthCookieEnv(),
  });

  if (!token) {
    if (isAuthPage(pathname)) {
      return NextResponse.next();
    }
    return buildLoginRedirect(request);
  }

  const role = token.role as UserRole | undefined;
  const hasValidRole =
    role === "LEARNER" || role === "TRAINER" || role === "ADMIN";

  // JWT présent mais sans rôle (ancien cookie, token incomplet) : ne pas
  // rediriger /login → /dashboard, sinon boucle avec ProtectedShell qui renvoie vers /login.
  if (!hasValidRole) {
    if (isAuthPage(pathname)) {
      return NextResponse.next();
    }
    return buildLoginRedirect(request);
  }

  if (isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAdminApiRoute && role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isTrainerRoute && role !== "TRAINER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/calendar/:path*",
    "/programs/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
    "/notifications",
    "/notifications/:path*",
    "/feedback",
    "/feedback/:path*",
    "/trainer",
    "/trainer/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/register",
    "/api/admin",
    "/api/admin/:path*",
  ],
};
