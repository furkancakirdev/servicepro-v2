"use server";

import bcrypt from "bcryptjs";

import type { ResetPasswordActionState } from "@/app/(auth)/reset-password/state";
import { initialResetPasswordActionState } from "@/app/(auth)/reset-password/state";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/next-auth";

export async function completePasswordActivation(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      error: "Tum parola alanlari zorunludur.",
    };
  }

  if (newPassword.length < 8) {
    return {
      error: "Yeni parola en az 8 karakter olmalidir.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "Yeni parola ve dogrulama alani ayni olmali.",
    };
  }

  const user = await requireAppUser();
  const profile = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      password: true,
    },
  });

  if (!profile?.password) {
    return {
      error: "Parola kaydi bulunamadi. Sistem yoneticisi ile iletisime gecin.",
    };
  }

  const isValid = await bcrypt.compare(currentPassword, profile.password);

  if (!isValid) {
    return {
      error: "Gecerli gecici veya mevcut parola girilmedi.",
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      tempPasswordIssuedAt: null,
    },
  });

  await signOut({ redirectTo: "/login?toast=password-updated" });

  return initialResetPasswordActionState;
}
