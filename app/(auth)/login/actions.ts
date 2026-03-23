"use server";

import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import type { LoginActionState } from "@/app/(auth)/login/state";

export async function login(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/").trim();
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";

  if (!email || !password) {
    return {
      error: "E-posta ve şifre alanları zorunludur.",
    };
  }

  if (!isSupabaseConfigured() || !isDatabaseConfigured()) {
    return {
      error:
        "Supabase ve veritabanı bağlantısı henüz tanımlı değil. `.env.local` değerlerini girdikten sonra tekrar deneyin.",
    };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: error.message,
    };
  }

  const profile = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!profile) {
    await supabase.auth.signOut();
    cookies().delete("servicepro-role");

    return {
      error:
        "Bu e-posta için ServicePRO profili bulunamadı. Seed veya kullanıcı senkronizasyonunu kontrol edin.",
    };
  }

  cookies().set("servicepro-role", profile.role, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  const defaultRedirect =
    safeNextPath === "/" && profile.role === Role.TECHNICIAN
      ? "/my-jobs"
      : safeNextPath;

  redirect(defaultRedirect);
}
