"use server";

import { signOut } from "@/lib/next-auth";

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
