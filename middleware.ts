import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { getPostLoginRedirectPath, shouldForcePasswordReset } from "@/lib/auth-flows";
import { authConfig } from "@/lib/auth.config";
import { canAccessPath, getRoleHomePath } from "@/lib/route-access";

const { auth } = NextAuth(authConfig);

const authPagePrefixes = ["/login", "/forgot-password", "/reset-password"];
const protectedPrefixes = [
  "/jobs",
  "/dispatch",
  "/boats",
  "/my-jobs",
  "/scoreboard",
  "/settings",
  "/dashboard",
];

function isProtectedPath(pathname: string) {
  return pathname === "/" || protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAuthPage(pathname: string) {
  return authPagePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function getSafeNextPath(url: URL) {
  const nextPath = url.searchParams.get("next")?.trim() ?? "/";
  return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
}

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);
  const role = req.auth?.user?.role;
  const mustChangePassword = req.auth?.user?.mustChangePassword;

  if (
    shouldForcePasswordReset({
      pathname,
      isLoggedIn,
      mustChangePassword,
    })
  ) {
    return NextResponse.redirect(new URL("/reset-password?firstLogin=1", req.url));
  }

  if (isAuthPage(pathname) && isLoggedIn) {
    if (pathname.startsWith("/reset-password") && mustChangePassword) {
      return NextResponse.next();
    }

    const redirectPath = getPostLoginRedirectPath({
      safeNextPath: pathname === "/login" ? getSafeNextPath(nextUrl) : "/",
      role,
      mustChangePassword,
    });
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(getRoleHomePath(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
