"use server";

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
  const nextPath = String(formData.get("next") ?? "/dashboard").trim();
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

  if (!email || !password) {
    return {
      error: "E-posta ve sifre alanlari zorunludur.",
    };
  }

  if (!isSupabaseConfigured() || !isDatabaseConfigured()) {
    return {
      error:
        "Supabase ve veritabani baglantisi henuz tanimli degil. .env.local degerlerini girdikten sonra tekrar deneyin.",
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
    select: { id: true },
  });

  if (!profile) {
    await supabase.auth.signOut();

    return {
      error:
        "Bu e-posta icin ServicePRO profili bulunamadi. Seed veya kullanici senkronizasyonunu kontrol edin.",
    };
  }

  redirect(safeNextPath);
}
