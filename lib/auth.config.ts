import type { NextAuthConfig } from "next-auth";

import { getPostLoginRedirectPath, shouldForcePasswordReset } from "@/lib/auth-flows";
import { canAccessPath, getRoleHomePath } from "@/lib/route-access";

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

export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = isProtectedPath(nextUrl.pathname);
      const role = auth?.user?.role;

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
        loginUrl.searchParams.set("next", nextPath);
        return Response.redirect(loginUrl);
      }

      if (
        shouldForcePasswordReset({
          pathname: nextUrl.pathname,
          isLoggedIn,
          mustChangePassword: auth?.user?.mustChangePassword,
        })
      ) {
        return Response.redirect(new URL("/reset-password?firstLogin=1", nextUrl));
      }

      if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(
          new URL(
            getPostLoginRedirectPath({
              safeNextPath: "/",
              role,
              mustChangePassword: auth?.user?.mustChangePassword,
            }),
            nextUrl
          )
        );
      }

      if (isLoggedIn && role && isProtected && !canAccessPath(role, nextUrl.pathname)) {
        return Response.redirect(new URL(getRoleHomePath(role), nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
