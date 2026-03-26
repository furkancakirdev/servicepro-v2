import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/lib/next-auth";

export type CurrentAppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  isPreview: boolean;
};

export const getCurrentAppUser = cache(async (): Promise<CurrentAppUser | null> => {
  const session = await auth();

  if (!session?.user?.email || !session.user.id || !session.user.role) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? "",
    role: session.user.role,
    avatarUrl: session.user.avatarUrl ?? null,
    mustChangePassword: session.user.mustChangePassword ?? false,
    isPreview: false,
  };
});

export async function requireAppUser(): Promise<CurrentAppUser> {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRoles(roles: Role[]): Promise<CurrentAppUser> {
  const user = await requireAppUser();

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
