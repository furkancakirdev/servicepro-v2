import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type CurrentAppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  isPreview: boolean;
};

const previewUser: CurrentAppUser = {
  id: "preview-admin",
  email: "admin@marlin.com",
  name: "ServicePRO Preview",
  role: Role.ADMIN,
  avatarUrl: null,
  isPreview: true,
};

export const getCurrentAppUser = cache(async (): Promise<CurrentAppUser | null> => {
  if (!isSupabaseConfigured() || !isDatabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[AUTH] FATAL: Supabase/DB env vars missing in production. Blocking access."
      );
      return null;
    }

    return previewUser;
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return null;
  }

  const appUser = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
    },
  });

  if (!appUser) {
    return null;
  }

  return {
    ...appUser,
    avatarUrl: appUser.avatarUrl ?? null,
    isPreview: false,
  };
});

export async function requireAppUser() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRoles(roles: Role[]) {
  const user = await requireAppUser();

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
