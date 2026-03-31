import type { Role } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

type AppAuthUser = User & {
  id?: string;
  role?: Role;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
};

export function applyUserToToken(token: JWT, user?: AppAuthUser) {
  if (!user) {
    return token;
  }

  return {
    ...token,
    id: user.id ?? token.id,
    role: user.role ?? token.role,
    avatarUrl: user.avatarUrl ?? null,
    name: user.name ?? token.name,
    email: user.email ?? token.email,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

export function applyTokenToSession(session: Session, token: JWT) {
  if (!session.user) {
    return session;
  }

  session.user.id = String(token.id ?? session.user.id ?? "");
  session.user.role = token.role as Role | undefined;
  session.user.avatarUrl = (token.avatarUrl as string | null | undefined) ?? null;
  session.user.mustChangePassword = Boolean(token.mustChangePassword);

  return session;
}

export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      return applyUserToToken(token, user);
    },
    async session({ session, token }) {
      return applyTokenToSession(session, token);
    },
  },
} satisfies NextAuthConfig;
