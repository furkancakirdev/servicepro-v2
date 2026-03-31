"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import type { LoginActionState } from "@/app/(auth)/login/state";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getPostLoginRedirectPath } from "@/lib/auth-flows";
import { normalizeEmailAddress } from "@/lib/email";
import { signIn } from "@/lib/next-auth";

export async function login(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = normalizeEmailAddress(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/").trim();
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";

  if (!email || !password) {
    return { error: "E-posta ve şifre alanları zorunludur." };
  }

  if (!isDatabaseConfigured()) {
    return {
      error: "Veritabanı bağlantısı henüz tanımlı değil. Yeni NAS değişkenlerini girip tekrar deneyin.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı." };
    }

    return { error: "Giriş sırasında bir hata oluştu." };
  }

  const profile = await prisma.user.findUnique({
    where: { email },
    select: { role: true, mustChangePassword: true },
  });

  const defaultRedirect = getPostLoginRedirectPath({
    safeNextPath,
    role: profile?.role,
    mustChangePassword: profile?.mustChangePassword,
  });

  redirect(defaultRedirect);
}
