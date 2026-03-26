import { Role } from "@prisma/client";

import { getRoleHomePath } from "@/lib/route-access";

export function getPostLoginRedirectPath(input: {
  safeNextPath: string;
  role?: Role | null;
  mustChangePassword?: boolean | null;
}) {
  if (input.mustChangePassword) {
    return "/reset-password?firstLogin=1";
  }

  return input.safeNextPath === "/" ? getRoleHomePath(input.role) : input.safeNextPath;
}

export function shouldForcePasswordReset(input: {
  pathname: string;
  isLoggedIn: boolean;
  mustChangePassword?: boolean | null;
}) {
  if (!input.isLoggedIn || !input.mustChangePassword) {
    return false;
  }

  return !(
    input.pathname.startsWith("/reset-password") ||
    input.pathname.startsWith("/logout") ||
    input.pathname.startsWith("/api/auth")
  );
}
